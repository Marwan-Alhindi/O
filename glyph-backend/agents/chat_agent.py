"""Streaming chat agent for /askLLM.

Built on `langchain.agents.create_agent`, which returns a compiled LangGraph
runnable. We stream events from the graph via `astream_events(version="v2")`
and bridge them to the same SSE wire format the legacy implementation
emitted, so the frontend doesn't need to change:

    {type: "token", content}      # on every model token chunk
    {type: "tool", name}          # whenever a tool starts
    {type: "done", message_id, content}  # after persisting the final message
    {type: "error", detail}       # on errors

The chat row is inserted into Supabase by THIS module (not the agent), so
the realtime push to other participants still happens at the right moment.
"""

import json

from langchain.agents import create_agent
from langchain_core.messages import AIMessage
from langchain_openai import ChatOpenAI
from langgraph.errors import GraphRecursionError

from config import supabase
from context import build_context_messages
from tools import get_tools


# Hard cap on how many model+tool iterations the agent can run. Each
# iteration is roughly model_call → tool_node → model_call, so a
# recursion_limit of ~12 mirrors the legacy MAX_ITERATIONS=5 behavior with
# a small safety margin.
RECURSION_LIMIT = 12


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


# Build the agent once at import time. Tools and model are static; per-request
# data flows through the messages list and the run config.
_chat_model = ChatOpenAI(model="gpt-4o", streaming=True)
_agent = create_agent(model=_chat_model, tools=get_tools())


async def run_agent_stream(
    chat_id: str,
    llm_id: str,
    user_id: str,
    replace_message_id: str | None = None,
    side_message_id: str | None = None,
):
    """Async generator yielding SSE events as the agent runs.

    When `replace_message_id` is provided, the agent regenerates that row in
    place: context is truncated to messages strictly before it, and the
    final answer is UPDATEd onto that row instead of inserted as a new one.
    """
    llm_result = (
        supabase.table("invited_llms")
        .select("*")
        .eq("id", llm_id)
        .single()
        .execute()
    )
    llm = llm_result.data
    if not llm:
        yield _sse({"type": "error", "detail": "LLM not found"})
        return

    initial_messages = build_context_messages(
        chat_id,
        llm_id,
        llm.get("model_instruct") or "",
        up_to_message_id=replace_message_id,
        include_message_id=side_message_id,
    )

    final_messages = None
    final_text = ""

    try:
        async for event in _agent.astream_events(
            {"messages": initial_messages},
            version="v2",
            config={
                "recursion_limit": RECURSION_LIMIT,
                "run_name": "chat_agent",
                "tags": ["chat_agent", chat_id, llm_id],
                "metadata": {"chat_id": chat_id, "llm_id": llm_id, "user_id": user_id},
            },
        ):
            kind = event["event"]
            if kind == "on_chat_model_stream":
                chunk = event["data"].get("chunk")
                content = getattr(chunk, "content", "") or ""
                if content:
                    yield _sse({"type": "token", "content": content})
            elif kind == "on_tool_start":
                yield _sse({"type": "tool", "name": event.get("name", "")})
            elif kind == "on_chain_end":
                # The root graph emits its final state on its own on_chain_end.
                # We can't always rely on the name, so capture the most recent
                # output that looks like an agent state (has a "messages" list).
                output = (event.get("data") or {}).get("output")
                if isinstance(output, dict) and isinstance(output.get("messages"), list):
                    final_messages = output["messages"]
    except GraphRecursionError:
        final_text = "I hit my step limit before I could finish. Please ask again with a narrower scope."
    except Exception as e:
        yield _sse({"type": "error", "detail": f"Model error: {e}"})
        return

    if not final_text and final_messages:
        # Pull the last AIMessage with non-empty text content as the final reply.
        for msg in reversed(final_messages):
            if isinstance(msg, AIMessage) and msg.content:
                if isinstance(msg.content, str):
                    final_text = msg.content
                    break
                # Some providers return content as a list of parts.
                parts = [p.get("text", "") for p in msg.content if isinstance(p, dict)]
                final_text = "".join(parts).strip()
                if final_text:
                    break

    if not final_text.strip():
        final_text = "(empty response)"

    if replace_message_id:
        update_result = (
            supabase.table("messages")
            .update({"content": final_text})
            .eq("id", replace_message_id)
            .eq("chat_id", chat_id)
            .eq("sender_llm_id", llm_id)
            .execute()
        )
        msg_id = update_result.data[0]["id"] if update_result.data else replace_message_id
    else:
        insert_result = supabase.table("messages").insert({
            "chat_id": chat_id,
            "sender_type": "llm",
            "sender_llm_id": llm_id,
            "content": final_text,
            "included_in_context": side_message_id is None,
        }).execute()
        msg_id = insert_result.data[0]["id"] if insert_result.data else None

    yield _sse({"type": "done", "message_id": msg_id, "content": final_text})
