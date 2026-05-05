"""Email-based chat invitations.

Endpoints:
  POST   /invitations                                  create + send email
  GET    /invitations?chat_id=...                      list pending invites
  DELETE /invitations/{id}                             revoke a pending invite
  POST   /invitations/accept                           redeem token (auth required)
  GET    /invitations/peek?token=...                   public preview for signup page
  PATCH  /chat_participants/{id}/can_invite            owner toggles delegated invite power

Imports `supabase` and `get_current_user` from main at function call time to
avoid circular imports. The router is included from main.py at the bottom of
that module, after both names are defined.
"""

import os
import re
import secrets
from datetime import datetime, timedelta, timezone

import resend
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel


resend.api_key = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "Glyph <onboarding@resend.dev>")
APP_URL = os.getenv("APP_URL", "http://localhost:5173").rstrip("/")
INVITATION_TTL = timedelta(days=7)
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

router = APIRouter()


def _supabase():
    from main import supabase
    return supabase


def _auth(authorization: str) -> str:
    from main import get_current_user
    return get_current_user(authorization)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def verify_can_invite(user_id: str, chat_id: str) -> dict:
    """Return the participant row if user can invite to this chat; 403 otherwise.

    Uses select('*') so the lookup doesn't fail before the can_invite column is
    added. A missing can_invite key is treated as False, so non-owners are still
    correctly blocked when the column hasn't been migrated yet.
    """
    sb = _supabase()
    result = (
        sb.table("chat_participants")
        .select("*")
        .eq("chat_id", chat_id)
        .eq("user_id", user_id)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=403, detail="Not a participant of this chat")
    row = rows[0]
    if row.get("role") != "owner" and not row.get("can_invite"):
        raise HTTPException(status_code=403, detail="Not allowed to invite to this chat")
    return row


def get_user_email(user_id: str) -> str:
    """Look up a user's email via Supabase auth admin. Returns lowercased email."""
    sb = _supabase()
    try:
        resp = sb.auth.admin.get_user_by_id(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to look up user: {e}")
    user = getattr(resp, "user", None)
    if user is None or not getattr(user, "email", None):
        raise HTTPException(status_code=404, detail="User not found")
    return user.email.lower()


def _is_expired(expires_at: str | None) -> bool:
    if not expires_at:
        return False
    return datetime.fromisoformat(expires_at.replace("Z", "+00:00")) < datetime.now(timezone.utc)


def send_invitation_email(to_email: str, chat_name: str, inviter_name: str, token: str):
    """Send the invitation email via Resend. Raises 502 on failure."""
    link = f"{APP_URL}/invite/{token}"
    safe_chat = (chat_name or "a Glyph chat").strip()
    safe_inviter = (inviter_name or "Someone").strip()
    html = (
        f'<div style="font-family: -apple-system, system-ui, sans-serif; padding: 24px; max-width: 480px;">'
        f'<h2 style="margin: 0 0 8px;">You\'re invited to a Glyph chat</h2>'
        f'<p style="margin: 0 0 16px; color: #444;">'
        f'<strong>{safe_inviter}</strong> invited you to <strong>{safe_chat}</strong>.</p>'
        f'<p style="margin: 0 0 24px;">'
        f'<a href="{link}" style="display: inline-block; background: #0a0a0a; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">Join the chat</a>'
        f'</p>'
        f'<p style="margin: 0; font-size: 12px; color: #888;">'
        f'Or paste this link in your browser:<br/>{link}</p>'
        f'<p style="margin: 16px 0 0; font-size: 12px; color: #888;">This link expires in 7 days.</p>'
        f'</div>'
    )
    text = (
        f"{safe_inviter} invited you to {safe_chat} on Glyph.\n\n"
        f"Join: {link}\n\n"
        f"This link expires in 7 days."
    )
    try:
        resend.Emails.send({
            "from": EMAIL_FROM,
            "to": to_email,
            "subject": f"You're invited to {safe_chat}",
            "html": html,
            "text": text,
        })
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to send invitation email: {e}")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class CreateInvitationRequest(BaseModel):
    chat_id: str
    email: str


class AcceptInvitationRequest(BaseModel):
    token: str


class CanInviteRequest(BaseModel):
    can_invite: bool


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/invitations")
def create_invitation(body: CreateInvitationRequest, authorization: str = Header()):
    user_id = _auth(authorization)
    verify_can_invite(user_id, body.chat_id)
    sb = _supabase()

    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Invalid email address")

    existing = (
        sb.table("chat_invitations")
        .select("id")
        .eq("chat_id", body.chat_id)
        .eq("email", email)
        .is_("accepted_at", "null")
        .is_("revoked_at", "null")
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="An invitation for this email is already pending")

    chat_result = sb.table("chats").select("name").eq("id", body.chat_id).single().execute()
    if not chat_result.data:
        raise HTTPException(status_code=404, detail="Chat not found")
    chat_name = chat_result.data.get("name") or "a Glyph chat"

    inviter_name = "Someone"
    profile_result = sb.table("profiles").select("first_name").eq("id", user_id).execute()
    if profile_result.data:
        inviter_name = profile_result.data[0].get("first_name") or inviter_name

    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + INVITATION_TTL).isoformat()

    insert_result = sb.table("chat_invitations").insert({
        "chat_id": body.chat_id,
        "email": email,
        "token": token,
        "invited_by": user_id,
        "expires_at": expires_at,
    }).execute()
    if not insert_result.data:
        raise HTTPException(status_code=500, detail="Failed to create invitation")
    new_row = insert_result.data[0]

    send_invitation_email(
        to_email=email,
        chat_name=chat_name,
        inviter_name=inviter_name,
        token=token,
    )

    return new_row


@router.get("/invitations")
def list_invitations(chat_id: str, authorization: str = Header()):
    user_id = _auth(authorization)
    verify_can_invite(user_id, chat_id)
    sb = _supabase()

    now_iso = datetime.now(timezone.utc).isoformat()
    result = (
        sb.table("chat_invitations")
        .select("id, chat_id, email, token, invited_by, created_at, expires_at")
        .eq("chat_id", chat_id)
        .is_("accepted_at", "null")
        .is_("revoked_at", "null")
        .gt("expires_at", now_iso)
        .order("created_at", desc=True)
        .execute()
    )
    return {"invitations": result.data or []}


@router.delete("/invitations/{invitation_id}")
def revoke_invitation(invitation_id: str, authorization: str = Header()):
    user_id = _auth(authorization)
    sb = _supabase()

    inv_result = sb.table("chat_invitations").select("*").eq("id", invitation_id).single().execute()
    invitation = inv_result.data
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation["invited_by"] != user_id:
        owner_check = (
            sb.table("chat_participants")
            .select("id")
            .eq("chat_id", invitation["chat_id"])
            .eq("user_id", user_id)
            .eq("role", "owner")
            .execute()
        )
        if not owner_check.data:
            raise HTTPException(status_code=403, detail="Not allowed to revoke this invitation")

    sb.table("chat_invitations").update({
        "revoked_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", invitation_id).execute()

    return {"ok": True}


@router.post("/invitations/claim_pending")
def claim_pending_invitations(authorization: str = Header()):
    """Find every pending invitation for the current user's email and accept them.

    Called after login/signup so users who created their account *after* being
    invited (or who first logged in with a different account) still land in the
    chats they were invited to, without having to re-click the email link.
    """
    user_id = _auth(authorization)
    user_email = get_user_email(user_id)
    sb = _supabase()

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    pending = (
        sb.table("chat_invitations")
        .select("*")
        .eq("email", user_email)
        .is_("accepted_at", "null")
        .is_("revoked_at", "null")
        .gt("expires_at", now_iso)
        .execute()
    )
    rows = pending.data or []

    joined_chat_ids: list[str] = []
    for inv in rows:
        chat_id = inv["chat_id"]
        existing = (
            sb.table("chat_participants")
            .select("id")
            .eq("chat_id", chat_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not existing.data:
            sb.table("chat_participants").insert({
                "chat_id": chat_id,
                "user_id": user_id,
                "role": "member",
            }).execute()
            joined_chat_ids.append(chat_id)
        sb.table("chat_invitations").update({
            "accepted_at": now_iso,
            "accepted_by": user_id,
        }).eq("id", inv["id"]).execute()

    return {"joined_chat_ids": joined_chat_ids}


@router.post("/invitations/accept")
def accept_invitation(body: AcceptInvitationRequest, authorization: str = Header()):
    user_id = _auth(authorization)
    user_email = get_user_email(user_id)
    sb = _supabase()

    inv_result = sb.table("chat_invitations").select("*").eq("token", body.token).execute()
    rows = inv_result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Invitation not found")
    invitation = rows[0]

    if invitation.get("revoked_at"):
        raise HTTPException(status_code=410, detail="This invitation has been revoked")
    if invitation.get("accepted_at"):
        raise HTTPException(status_code=410, detail="This invitation has already been used")
    if _is_expired(invitation.get("expires_at")):
        raise HTTPException(status_code=410, detail="This invitation has expired")

    if (invitation.get("email") or "").lower() != user_email:
        raise HTTPException(status_code=403, detail="This invitation isn't for your account")

    chat_id = invitation["chat_id"]

    existing = (
        sb.table("chat_participants")
        .select("id")
        .eq("chat_id", chat_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        sb.table("chat_participants").insert({
            "chat_id": chat_id,
            "user_id": user_id,
            "role": "member",
        }).execute()

    sb.table("chat_invitations").update({
        "accepted_at": datetime.now(timezone.utc).isoformat(),
        "accepted_by": user_id,
    }).eq("id", invitation["id"]).execute()

    return {"chat_id": chat_id}


@router.get("/invitations/peek")
def peek_invitation(token: str):
    """Public — minimal context so the signup page can show 'You're joining {chat_name}' and prefill email."""
    sb = _supabase()
    inv_result = sb.table("chat_invitations").select("*").eq("token", token).execute()
    rows = inv_result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Invitation not found")
    invitation = rows[0]
    if invitation.get("revoked_at") or invitation.get("accepted_at"):
        raise HTTPException(status_code=410, detail="This invitation is no longer valid")
    if _is_expired(invitation.get("expires_at")):
        raise HTTPException(status_code=410, detail="This invitation has expired")

    chat_result = sb.table("chats").select("name").eq("id", invitation["chat_id"]).single().execute()
    chat_name = (chat_result.data or {}).get("name") or "a Glyph chat"

    inviter_name = "Someone"
    profile_result = sb.table("profiles").select("first_name").eq("id", invitation["invited_by"]).execute()
    if profile_result.data:
        inviter_name = profile_result.data[0].get("first_name") or inviter_name

    return {
        "email": invitation["email"],
        "chat_name": chat_name,
        "inviter_name": inviter_name,
        "expires_at": invitation["expires_at"],
    }


@router.patch("/chat_participants/{participant_id}/can_invite")
def update_can_invite(participant_id: str, body: CanInviteRequest, authorization: str = Header()):
    user_id = _auth(authorization)
    sb = _supabase()

    target_result = sb.table("chat_participants").select("*").eq("id", participant_id).single().execute()
    target = target_result.data
    if not target:
        raise HTTPException(status_code=404, detail="Participant not found")

    if target.get("role") == "owner":
        raise HTTPException(status_code=400, detail="Cannot change can_invite for the owner")

    owner_check = (
        sb.table("chat_participants")
        .select("id")
        .eq("chat_id", target["chat_id"])
        .eq("user_id", user_id)
        .eq("role", "owner")
        .execute()
    )
    if not owner_check.data:
        raise HTTPException(status_code=403, detail="Only the chat owner can change permissions")

    sb.table("chat_participants").update({
        "can_invite": bool(body.can_invite),
    }).eq("id", participant_id).execute()

    return {"ok": True}
