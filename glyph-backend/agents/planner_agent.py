"""One-shot planner agent: reads a chat's daily_notes, returns an ordered
execution plan that respects inferred dependencies.

LangChain chain with `with_structured_output(PlannerResponse)` — Pydantic
guarantees the four required keys per plan item, eliminating the manual
JSON cleaning that the previous raw-OpenAI version needed.
"""

from fastapi import HTTPException
from langchain_core.messages import SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from config import supabase
from schemas import PlannerResponse
from .prompts import PLANNER_SYSTEM_PROMPT


# Pass the system prompt as a literal SystemMessage (not a template) so the
# JSON schema example inside it isn't interpreted as f-string placeholders.
_prompt = ChatPromptTemplate.from_messages([
    SystemMessage(content=PLANNER_SYSTEM_PROMPT),
    ("user", "{notes}"),
])
_model = ChatOpenAI(model="gpt-4o").with_structured_output(PlannerResponse)
_chain = _prompt | _model


def run_planner(chat_id: str) -> PlannerResponse:
    """Fetch the chat's notes, run the planner, return a structured response."""
    notes_result = (
        supabase.table("daily_notes")
        .select("date, content")
        .eq("chat_id", chat_id)
        .order("date")
        .execute()
    )
    notes_rows = notes_result.data or []
    if not notes_rows:
        return PlannerResponse(summary="No notes for this chat yet.", plan=[])

    if not any("- [ ]" in (r.get("content") or "") for r in notes_rows):
        return PlannerResponse(summary="No open tasks found.", plan=[])

    user_message = "\n\n".join(
        f"## {r['date']}\n{(r.get('content') or '').strip() or '(empty)'}"
        for r in notes_rows
    )

    try:
        result = _chain.invoke(
            {"notes": user_message},
            config={"run_name": "planner_agent", "tags": ["planner_agent", chat_id]},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Planner failed: {e}")

    return result
