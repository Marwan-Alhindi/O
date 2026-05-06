"""Agent tools — LangChain `@tool`-decorated functions.

The chat agent binds these tools at graph build time. Both current tools
(web_search, create_pdf) are self-contained and don't need per-request
ctx (chat_id, user_id). When future tools need that, plumb it via
`langchain.agents.create_agent`'s `context_schema=` parameter and read it
from the runtime inside each tool.
"""

import os
import re
import uuid

from langchain_core.tools import tool


PDFS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pdfs")
PUBLIC_API_BASE = os.getenv("PUBLIC_API_BASE", "http://localhost:8000").rstrip("/")


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


def get_tools():
    """Return the tool list used by the chat agent."""
    return [web_search, create_pdf]
