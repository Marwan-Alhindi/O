"""LLM Integrations router — per-LLM credential store.

Route order: exact paths (/catalog, /oauth/callback) before parameterized ones.
All routes require a valid JWT. LLM-scoped routes also verify chat membership.
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from auth import get_current_user
from config import supabase, SUPABASE_SERVICE_KEY
from integrations.catalog import CATALOG

router = APIRouter(prefix="/integrations", tags=["integrations"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
INTEGRATIONS_OAUTH_REDIRECT_URI = os.getenv(
    "INTEGRATIONS_OAUTH_REDIRECT_URI",
    "http://localhost:8000/integrations/oauth/callback",
)

_GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
]


class SaveCredentialsRequest(BaseModel):
    credentials: dict


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _verify_llm_access(authorization: str, llm_id: str) -> str:
    """Return user_id if the requester is a participant in the chat owning llm_id."""
    user_id = get_current_user(authorization)
    row = (
        supabase.table("invited_llms")
        .select("chat_id")
        .eq("id", llm_id)
        .maybe_single()
        .execute()
        .data
    )
    if not row:
        raise HTTPException(status_code=404, detail="LLM not found")
    participants = (
        supabase.table("chat_participants")
        .select("id")
        .eq("chat_id", row["chat_id"])
        .eq("user_id", user_id)
        .execute()
        .data
    )
    if not participants:
        raise HTTPException(status_code=403, detail="Not a participant in this chat")
    return user_id


def _sign_state(user_id: str, llm_id: str, integration_type: str, code_verifier: str = "") -> str:
    exp = int(time.time()) + 300
    payload = json.dumps({
        "user_id": user_id,
        "llm_id": llm_id,
        "integration_type": integration_type,
        "exp": exp,
        "cv": code_verifier,
    })
    sig = hmac.new(
        SUPABASE_SERVICE_KEY.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}|{sig}".encode()).decode()


def _verify_state(token: str) -> dict:
    try:
        decoded = base64.urlsafe_b64decode(token + "==").decode()
        payload_str, sig = decoded.rsplit("|", 1)
        expected = hmac.new(
            SUPABASE_SERVICE_KEY.encode(), payload_str.encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            raise ValueError("invalid signature")
        data = json.loads(payload_str)
        if data.get("exp", 0) < time.time():
            raise ValueError("state expired")
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid OAuth state: {e}")


# ---------------------------------------------------------------------------
# Routes — exact paths first
# ---------------------------------------------------------------------------


@router.get("/catalog")
def get_catalog(authorization: str = Header()):
    get_current_user(authorization)
    return {"integrations": [spec.to_dict() for spec in CATALOG.values()]}


@router.get("/oauth/callback")
def oauth_callback(code: str = "", state: str = "", error: str = ""):
    if error:
        return HTMLResponse(
            f"<script>window.opener?.postMessage({{type:'oauth_error',detail:{json.dumps(error)}}},'*');window.close();</script>"
        )

    if not code or not state:
        return HTMLResponse("<script>window.close();</script>")

    state_data = _verify_state(state)
    llm_id = state_data["llm_id"]
    integration_type = state_data["integration_type"]
    code_verifier = state_data.get("cv", "")

    try:
        from google_auth_oauthlib.flow import Flow
    except ImportError:
        return HTMLResponse("<script>window.close();</script>", status_code=501)

    flow = Flow.from_client_config(
        client_config={
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uris": [INTEGRATIONS_OAUTH_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=_GMAIL_SCOPES,
        redirect_uri=INTEGRATIONS_OAUTH_REDIRECT_URI,
        state=state,
    )
    flow.fetch_token(code=code, code_verifier=code_verifier)
    creds = flow.credentials

    credentials_payload = {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_expiry": creds.expiry.isoformat() if creds.expiry else None,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "scopes": list(creds.scopes or _GMAIL_SCOPES),
    }

    supabase.table("llm_integrations").upsert(
        {
            "llm_id": llm_id,
            "integration_type": integration_type,
            "credentials": credentials_payload,
            "status": "active",
        },
        on_conflict="llm_id,integration_type",
    ).execute()

    return HTMLResponse(
        f"<script>"
        f"window.opener?.postMessage({{type:'oauth_complete',integration:{json.dumps(integration_type)}}},'*');"
        f"window.close();"
        f"</script>"
    )


# ---------------------------------------------------------------------------
# Routes — parameterized paths
# ---------------------------------------------------------------------------


@router.get("/{llm_id}")
def list_integrations(llm_id: str, authorization: str = Header()):
    _verify_llm_access(authorization, llm_id)
    rows = (
        supabase.table("llm_integrations")
        .select("id, integration_type, status, created_at")
        .eq("llm_id", llm_id)
        .eq("status", "active")
        .execute()
        .data
        or []
    )
    return {"integrations": rows}


@router.post("/{llm_id}/{integration_type}/credentials")
def save_credentials(
    llm_id: str,
    integration_type: str,
    body: SaveCredentialsRequest,
    authorization: str = Header(),
):
    _verify_llm_access(authorization, llm_id)
    supabase.table("llm_integrations").upsert(
        {
            "llm_id": llm_id,
            "integration_type": integration_type,
            "credentials": body.credentials,
            "status": "active",
        },
        on_conflict="llm_id,integration_type",
    ).execute()
    return {"ok": True}


@router.delete("/{llm_id}/{integration_type}")
def delete_integration(llm_id: str, integration_type: str, authorization: str = Header()):
    _verify_llm_access(authorization, llm_id)
    supabase.table("llm_integrations").delete().eq("llm_id", llm_id).eq(
        "integration_type", integration_type
    ).execute()
    return {"ok": True}


@router.get("/{llm_id}/oauth/gmail/start")
def oauth_start(llm_id: str, authorization: str = Header()):
    user_id = _verify_llm_access(authorization, llm_id)

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=501,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env",
        )

    try:
        from google_auth_oauthlib.flow import Flow
    except ImportError:
        raise HTTPException(status_code=501, detail="google-auth-oauthlib is not installed")

    code_verifier = secrets.token_urlsafe(96)
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).rstrip(b"=").decode()
    state = _sign_state(user_id, llm_id, "gmail", code_verifier)

    flow = Flow.from_client_config(
        client_config={
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uris": [INTEGRATIONS_OAUTH_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=_GMAIL_SCOPES,
        redirect_uri=INTEGRATIONS_OAUTH_REDIRECT_URI,
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=state,
        include_granted_scopes="true",
        code_challenge=code_challenge,
        code_challenge_method="S256",
    )
    return {"url": auth_url}
