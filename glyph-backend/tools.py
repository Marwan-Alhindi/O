"""Agent tools — LangChain `@tool`-decorated functions.

Two flavors:
  - Stateless tools (`web_search`, `create_pdf`) need no per-request context;
    they're singletons.
  - Context-aware tools (`delegate`) close over per-request data — chat_id,
    the calling LLM's id, the participants list. They're built fresh by
    `make_delegate_tool(...)` for each agent run.

`get_tools(ctx=None)` returns the full toolset. When `ctx` is None, only the
stateless tools are returned (used at import time, mostly for tests).
"""

import os
import re
import uuid
from dataclasses import dataclass, field

from langchain_core.tools import tool

from config import supabase


PDFS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pdfs")
PUBLIC_API_BASE = os.getenv("PUBLIC_API_BASE", "http://localhost:8000").rstrip("/")


@dataclass(frozen=True)
class Delegation:
    """A queued handoff produced by the delegate tool during one agent run."""
    target_llm_id: str
    target_name: str
    task: str
    message_id: str | None = None


@dataclass
class ToolContext:
    """Per-request data tools may close over."""
    chat_id: str
    sender_llm_id: str
    # Map of normalized display_name -> invited_llms.id for the chat,
    # EXCLUDING the sender (you can't delegate to yourself).
    other_llms_by_name: dict[str, str]
    delegations: list[Delegation] = field(default_factory=list)


def normalize_llm_name(value: str) -> str:
    """Normalize display names for mention/delegate lookups."""
    return re.sub(r"\s+", " ", (value or "").lstrip("@").strip()).lower()


@tool
def web_search(query: str) -> str:
    """Search the web for current information. Use when the answer depends on recent events or facts outside your training data."""
    try:
        from ddgs import DDGS
        results = DDGS().text(query, max_results=5)
    except Exception as e:
        return f"Search failed: {e}"

    if not results:
        return "No results."

    lines = []
    for r in results:
        title = r.get("title", "")
        href = r.get("href", "")
        body = (r.get("body") or "")[:300]
        lines.append(f"- {title} ({href}): {body}")
    return "\n".join(lines)


@tool
def create_pdf(title: str, content: str) -> str:
    """Generate a real downloadable PDF from text/markdown content. Use this when the user asks you to create, export, or download a PDF. Returns a URL you MUST include in your reply as a markdown link so the user can download it.

    Args:
        title: Title shown at the top of the PDF and used for the filename.
        content: The body of the PDF. Plain text with blank lines between paragraphs; supports basic inline markdown (**bold**, *italic*).
    """
    try:
        from reportlab.lib.pagesizes import LETTER
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    except Exception as e:
        return f"PDF generation unavailable (reportlab not installed): {e}"

    os.makedirs(PDFS_DIR, exist_ok=True)

    safe_title = re.sub(r"[^A-Za-z0-9_-]+", "-", title).strip("-") or "document"
    filename = f"{safe_title}-{uuid.uuid4().hex[:8]}.pdf"
    path = os.path.join(PDFS_DIR, filename)

    styles = getSampleStyleSheet()
    story = [Paragraph(title, styles["Title"]), Spacer(1, 12)]
    for block in re.split(r"\n\s*\n", content.strip()):
        if not block:
            continue
        # reportlab Paragraph treats <br/> as a line break; single \n -> <br/>.
        html = block.replace("\n", "<br/>")
        # Convert **bold** and *italic* so the LLM's markdown survives.
        html = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", html)
        html = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", html)
        story.append(Paragraph(html, styles["BodyText"]))
        story.append(Spacer(1, 8))

    try:
        SimpleDocTemplate(path, pagesize=LETTER).build(story)
    except Exception as e:
        return f"PDF generation failed: {e}"

    url = f"{PUBLIC_API_BASE}/pdfs/{filename}"
    return f"PDF created at {url}. Include this URL in your reply as a markdown link like [Download {title}]({url}) so the user can download it."


def make_delegate_tool(ctx: ToolContext):
    """Build a `delegate` tool bound to this agent run.

    Records the handoff as a `kind='delegation'` message and queues the
    target LLM so the chat agent can run it after the current response is
    persisted.
    """

    @tool
    def delegate(target_name: str, task: str) -> str:
        """Hand off a follow-up task to another LLM in this chat.

        Use this only after you have completed your own part and the right
        next step is for a different LLM to act on your output (e.g. you're a
        researcher producing material for a designer). Only use it when
        delegation is genuinely useful — a casual mention of another LLM's
        name is not a reason to delegate. The user will not see this handoff
        message in the normal timeline, so your final reply should contain
        your own finished outcome, not narration about the handoff.

        Args:
            target_name: Display name of the target LLM, e.g. "Designer".
                Case-insensitive. Don't include the leading '@'.
            task: A clear, self-contained instruction the target LLM should
                act on. Include the completed facts, summary, findings, or
                context from your work that the target will need.
        """
        display_target = target_name.lstrip("@").strip()
        normalized = normalize_llm_name(target_name)
        target_id = ctx.other_llms_by_name.get(normalized)
        if not target_id:
            available = sorted(ctx.other_llms_by_name.keys())
            if not available:
                return "There are no other LLMs in this chat to delegate to."
            return (
                f"No LLM named {target_name!r} in this chat. "
                f"Available: {available}"
            )

        task_text = task.strip()
        if not task_text:
            return "Delegation skipped: the task was empty."

        if any(d.target_llm_id == target_id and d.task == task_text for d in ctx.delegations):
            return f"Delegation to @{display_target} was already queued for this response."

        try:
            insert_result = supabase.table("messages").insert({
                "chat_id": ctx.chat_id,
                "sender_type": "llm",
                "sender_llm_id": ctx.sender_llm_id,
                "content": f"-> @{display_target}: {task_text}",
                "kind": "delegation",
            }).execute()
        except Exception as e:
            return f"Delegation failed: {e}"

        message_id = insert_result.data[0].get("id") if insert_result.data else None
        ctx.delegations.append(Delegation(
            target_llm_id=target_id,
            target_name=display_target,
            task=task_text,
            message_id=message_id,
        ))

        return (
            f"Delegation to @{display_target} queued. "
            "Now give the user your final outcome without describing the handoff."
        )

    return delegate


def get_tools(ctx: ToolContext | None = None):
    """Return the tool list used by the chat agent.

    Pass `ctx` from the request handler to enable context-aware tools like
    `delegate`. Without it, only stateless tools are included.
    """
    base = [web_search, create_pdf]
    if ctx is not None:
        base.append(make_delegate_tool(ctx))
    return base
