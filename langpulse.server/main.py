from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from supabase import create_client
import jwt
import os

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

app = FastAPI()

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client (service role — bypasses RLS)
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

jwks_client = jwt.PyJWKClient(f"{os.getenv('SUPABASE_URL')}/auth/v1/.well-known/jwks.json")


def get_current_user(authorization: str = Header()):
    """Verify Supabase JWT via JWKS and return user UUID."""
    token = authorization.replace("Bearer ", "")
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {type(e).__name__}")


def verify_participant(user_id: str, chat_id: str):
    """Check that the user is a participant of the chat."""
    result = supabase.table("chat_participants").select("id").eq("chat_id", chat_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=403, detail="Not a participant of this chat")


class InviteLLMRequest(BaseModel):
    chat_id: str
    llm_id: str


class AskLLMRequest(BaseModel):
    chat_id: str
    llm_id: str


@app.get("/")
def read_root():
    return {"message": "Welcome to Langpulse backend"}


@app.post("/inviteLLM")
def invite_llm(body: InviteLLMRequest, authorization: str = Header()):
    user_id = get_current_user(authorization)
    verify_participant(user_id, body.chat_id)

    # Read LLM config from DB
    llm_result = supabase.table("invited_llms").select("*").eq("id", body.llm_id).single().execute()
    llm = llm_result.data

    if not llm:
        raise HTTPException(status_code=404, detail="LLM not found")

    # Create temporary OpenAI client and generate join message
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "user", "content": f"Please type a message to indicate you have joined the chat with mentioning your name. Your name is: {llm['display_name']}"}
        ]
    )
    join_text = response.choices[0].message.content

    # Insert join message into messages table
    supabase.table("messages").insert({
        "chat_id": body.chat_id,
        "sender_type": "llm",
        "sender_llm_id": body.llm_id,
        "content": join_text
    }).execute()

    return {"response": join_text}


@app.post("/askLLM")
def ask_llm(body: AskLLMRequest, authorization: str = Header()):
    user_id = get_current_user(authorization)
    verify_participant(user_id, body.chat_id)

    # Read LLM config
    llm_result = supabase.table("invited_llms").select("*").eq("id", body.llm_id).single().execute()
    llm = llm_result.data
    if not llm:
        raise HTTPException(status_code=404, detail="LLM not found")

    # Read connections
    conn_result = supabase.table("llm_connections").select("*").eq("llm_id", body.llm_id).execute()
    connections = conn_result.data

    connected_to_user = any(c["target_type"] == "user" for c in connections)
    connected_llm_ids = [c["target_llm_id"] for c in connections if c["target_type"] == "llm"]

    # Read all messages in this chat, ordered by time
    msgs_result = supabase.table("messages").select("*, invited_llms(display_name)").eq("chat_id", body.chat_id).order("created_at").execute()
    chat_messages = msgs_result.data

    # Build OpenAI messages array based on connections
    api_messages = [{"role": "system", "content": llm["model_instruct"] or ""}]

    for msg in chat_messages:
        if msg["sender_type"] == "llm" and msg["sender_llm_id"] == body.llm_id:
            # This LLM's own past messages → assistant role
            api_messages.append({"role": "assistant", "content": msg["content"]})
        elif msg["sender_type"] == "user" and connected_to_user:
            # User messages (if connected to users)
            api_messages.append({"role": "user", "content": msg["content"]})
        elif msg["sender_type"] == "llm" and msg["sender_llm_id"] in connected_llm_ids:
            # Connected LLM's messages → user role with name prefix
            sender_name = msg.get("invited_llms", {}).get("display_name", "LLM")
            api_messages.append({"role": "user", "content": f"{sender_name}: {msg['content']}"})

    # Call OpenAI
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=api_messages
    )
    result = response.choices[0].message.content

    # Store response in messages table
    supabase.table("messages").insert({
        "chat_id": body.chat_id,
        "sender_type": "llm",
        "sender_llm_id": body.llm_id,
        "content": result
    }).execute()

    return {"response": result}
