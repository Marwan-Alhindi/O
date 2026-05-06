"""FastAPI bootstrap: app instance, middleware, static mounts, route handlers.

Domain logic lives elsewhere:
- config.py    — env, OpenAI/Supabase/JWKS clients, LangSmith setup
- auth.py      — JWT + chat membership
- schemas.py   — pydantic request/response models
- context.py   — chat history → messages with llm_connections filtering
- tools.py     — agent tools (web_search, create_pdf)
- agents/      — chat_agent, planner_agent, join_agent
- invitations  — invite endpoints
"""

import os

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from config import PDFS_DIR, setup_tracing, supabase
from auth import get_current_user, verify_participant
from schemas import AskLLMRequest, InviteLLMRequest, PlanAgentRequest
from agents.chat_agent import run_agent_stream
from agents.join_agent import generate_join_message
from agents.planner_agent import run_planner
from invitations import router as invitations_router


setup_tracing()

app = FastAPI()

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/pdfs", StaticFiles(directory=PDFS_DIR), name="pdfs")


@app.get("/")
def read_root():
    return {"message": "Welcome to Langpulse backend"}


@app.post("/inviteLLM")
def invite_llm(body: InviteLLMRequest, authorization: str = Header()):
    user_id = get_current_user(authorization)
    verify_participant(user_id, body.chat_id)

    llm_result = supabase.table("invited_llms").select("*").eq("id", body.llm_id).single().execute()
    llm = llm_result.data
    if not llm:
        raise HTTPException(status_code=404, detail="LLM not found")

    join_text = generate_join_message(llm["display_name"])
    supabase.table("messages").insert({
        "chat_id": body.chat_id,
        "sender_type": "llm",
        "sender_llm_id": body.llm_id,
        "content": join_text,
        "kind": "join",
    }).execute()

    return {"response": join_text}


@app.post("/askLLM")
def ask_llm(body: AskLLMRequest, authorization: str = Header()):
    user_id = get_current_user(authorization)
    verify_participant(user_id, body.chat_id)
    return StreamingResponse(
        run_agent_stream(
            body.chat_id,
            body.llm_id,
            user_id,
            replace_message_id=body.replace_message_id,
            side_message_id=body.side_message_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.post("/planAgent")
def plan_agent(body: PlanAgentRequest, authorization: str = Header()):
    user_id = get_current_user(authorization)
    verify_participant(user_id, body.chat_id)
    result = run_planner(body.chat_id)
    return result.model_dump()


app.include_router(invitations_router)
