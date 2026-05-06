"""JWT auth + chat membership checks.

Used by every protected route. Raises HTTPException on failure so callers
can just call these and get standard 401/403 responses.
"""

from fastapi import Header, HTTPException
import jwt

from config import jwks_client, supabase


def get_current_user(authorization: str = Header()) -> str:
    """Verify a Supabase JWT via JWKS and return the user UUID."""
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


def verify_participant(user_id: str, chat_id: str) -> None:
    """Raise 403 unless the user is a participant of the chat."""
    result = (
        supabase.table("chat_participants")
        .select("id")
        .eq("chat_id", chat_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=403, detail="Not a participant of this chat")
