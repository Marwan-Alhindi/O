"""Chat lifecycle endpoints.

Replaces direct Supabase writes the frontend was making for chat create/
rename/pin/leave. Centralizing here lets the backend enforce auth, emit
audit events later, and own things like the auto "X left the chat"
message that has to be written atomically with the participant delete.

Endpoints:
  POST   /chats                          create chat + add caller as owner
  PATCH  /chats/{chat_id}                rename
  PATCH  /chats/{chat_id}/pin            pin/unpin (per-user)
  POST   /chats/{chat_id}/leave          post leave message + remove participant
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from auth import get_current_user, verify_participant
from config import supabase


router = APIRouter()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class CreateChatRequest(BaseModel):
    name: str | None = None


class RenameChatRequest(BaseModel):
    name: str


class PinChatRequest(BaseModel):
    pinned: bool


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/chats")
def create_chat(body: CreateChatRequest, authorization: str = Header()):
    user_id = get_current_user(authorization)
    name = (body.name or "New chat").strip() or "New chat"

    chat_result = (
        supabase.table("chats")
        .insert({"name": name, "created_by": user_id})
        .execute()
    )
    if not chat_result.data:
        raise HTTPException(status_code=500, detail="Failed to create chat")
    chat = chat_result.data[0]

    participant_result = (
        supabase.table("chat_participants")
        .insert({"chat_id": chat["id"], "user_id": user_id, "role": "owner"})
        .execute()
    )
    participant = (participant_result.data or [{}])[0]

    return {
        "chat": chat,
        "participant": {
            "role": "owner",
            "pinned_at": participant.get("pinned_at"),
            "joined_at": participant.get("joined_at") or participant.get("created_at"),
        },
    }


@router.patch("/chats/{chat_id}")
def rename_chat(chat_id: str, body: RenameChatRequest, authorization: str = Header()):
    user_id = get_current_user(authorization)
    verify_participant(user_id, chat_id)

    new_name = body.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    supabase.table("chats").update({"name": new_name}).eq("id", chat_id).execute()
    return {"ok": True, "name": new_name}


@router.patch("/chats/{chat_id}/pin")
def pin_chat(chat_id: str, body: PinChatRequest, authorization: str = Header()):
    user_id = get_current_user(authorization)
    verify_participant(user_id, chat_id)

    pinned_at = datetime.now(timezone.utc).isoformat() if body.pinned else None
    supabase.table("chat_participants").update({"pinned_at": pinned_at}) \
        .eq("chat_id", chat_id).eq("user_id", user_id).execute()

    return {"ok": True, "pinned_at": pinned_at}


@router.post("/chats/{chat_id}/leave")
def leave_chat(chat_id: str, authorization: str = Header()):
    user_id = get_current_user(authorization)
    verify_participant(user_id, chat_id)

    profile = (
        supabase.table("profiles").select("first_name").eq("id", user_id).execute()
    )
    first_name = "Someone"
    if profile.data:
        first_name = (profile.data[0] or {}).get("first_name") or first_name

    supabase.table("messages").insert({
        "chat_id": chat_id,
        "sender_type": "user",
        "sender_user_id": user_id,
        "content": f"{first_name} left the chat",
        "kind": "leave",
    }).execute()

    supabase.table("chat_participants").delete() \
        .eq("chat_id", chat_id).eq("user_id", user_id).execute()

    return {"ok": True}
