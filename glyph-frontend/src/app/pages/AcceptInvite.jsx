import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { apiFetch } from "../../services/supabase"

// Status state machine. Renderers branch on this — there's no fallback render
// path, so we never accidentally show the "Create account & join" UI to a
// user who's signed in.
//   loading        — waiting for invitation preview / auth context to settle
//   invite_invalid — preview lookup failed (revoked / expired / not found)
//   not_signed_in  — preview loaded, no current session — show signup/login
//   mismatch       — signed in with a different email than the invitation
//   redeeming      — POST /accept is in flight
//   accept_failed  — accept returned a non-403 error (already used, expired)
function AcceptInvite() {
    const { token } = useParams()
    const navigate = useNavigate()
    const { user, loading: authLoading, logout } = useAuth()

    const [status, setStatus] = useState("loading")
    const [error, setError] = useState("")
    const [preview, setPreview] = useState(null)
    // Make sure we only POST /accept once even if user/preview re-render.
    const acceptInFlight = useRef(false)

    // Step 1 — preview the invitation (no auth required)
    useEffect(() => {
        if (!token) {
            setStatus("invite_invalid")
            setError("Missing invitation token.")
            return
        }
        let cancelled = false
        apiFetch(`/invitations/peek?token=${encodeURIComponent(token)}`, { auth: false })
            .then(p => { if (!cancelled) setPreview(p) })
            .catch(err => {
                if (cancelled) return
                setStatus("invite_invalid")
                setError(err.detail || err.message || "This invitation is no longer valid.")
            })
        return () => { cancelled = true }
    }, [token])

    // Step 2 — once both preview and auth are settled, decide what to do
    useEffect(() => {
        if (authLoading) return
        if (!preview) return
        if (acceptInFlight.current) return
        if (status === "redeeming" || status === "mismatch" || status === "accept_failed" || status === "invite_invalid") return

        if (!user) {
            setStatus("not_signed_in")
            return
        }

        const inviteEmail = (preview.email || "").toLowerCase()
        const userEmail = (user.email || "").toLowerCase()
        if (inviteEmail && userEmail && inviteEmail !== userEmail) {
            setStatus("mismatch")
            return
        }

        acceptInFlight.current = true
        setStatus("redeeming")
        apiFetch("/invitations/accept", { method: "POST", body: { token } })
            .then(res => navigate(`/app/chat/${res.chat_id}`, { replace: true }))
            .catch(err => {
                acceptInFlight.current = false
                if (err.status === 403) {
                    setStatus("mismatch")
                } else {
                    setStatus("accept_failed")
                    setError(err.detail || err.message || "Could not redeem this invitation.")
                }
            })
    }, [authLoading, user, preview, token, navigate, status])

    if (status === "loading") {
        return <Centered title="Loading invitation…" />
    }

    if (status === "redeeming") {
        return <Centered title="Joining the chat…" />
    }

    if (status === "invite_invalid") {
        return (
            <Centered title="Invitation issue">
                <p className="mt-2 text-sm text-rose-300">{error}</p>
                <div className="mt-6 flex flex-col gap-2">
                    <button
                        onClick={() => navigate(user ? '/app' : '/login')}
                        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-[var(--color-brand)]"
                    >
                        {user ? 'Go to my chats' : 'Back to log in'}
                    </button>
                </div>
            </Centered>
        )
    }

    if (status === "accept_failed") {
        return (
            <Centered title="Couldn't join the chat">
                <p className="mt-2 text-sm text-rose-300">{error}</p>
                <div className="mt-6 flex flex-col gap-2">
                    <button
                        onClick={() => navigate('/app')}
                        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-[var(--color-brand)]"
                    >
                        Go to my chats
                    </button>
                </div>
            </Centered>
        )
    }

    if (status === "mismatch") {
        return (
            <Centered title="Wrong account">
                <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
                    This invitation was sent to{' '}
                    <strong className="text-[var(--color-fg)]">{preview?.email || "another email"}</strong>,
                    but you're signed in as{' '}
                    <strong className="text-[var(--color-fg)]">{user?.email}</strong>.
                </p>
                <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">
                    Sign out and log in with the invited email — or create an account using it. Glyph will pull you into the chat automatically.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                    <button
                        onClick={async () => { await logout(); navigate(`/login?invite=${token}`) }}
                        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-[var(--color-brand)]"
                    >
                        Sign out and switch account
                    </button>
                    <button
                        onClick={async () => { await logout(); navigate(`/getstarted?invite=${token}`) }}
                        className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-2 text-sm text-[var(--color-fg)] hover:border-[var(--color-fg-subtle)]"
                    >
                        Create account with invited email
                    </button>
                    <button
                        onClick={() => navigate('/app')}
                        className="rounded-lg px-4 py-2 text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
                    >
                        Stay on this account
                    </button>
                </div>
            </Centered>
        )
    }

    if (status === "not_signed_in") {
        return (
            <Centered title={preview ? `You're invited to ${preview.chat_name}` : "Invitation"}>
                {preview && (
                    <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
                        {preview.inviter_name} invited <strong className="text-[var(--color-fg)]">{preview.email}</strong> to join.
                    </p>
                )}
                <div className="mt-6 flex flex-col gap-2">
                    <button
                        onClick={() => navigate(`/getstarted?invite=${token}`)}
                        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-[var(--color-brand)]"
                    >
                        Create account & join
                    </button>
                    <button
                        onClick={() => navigate(`/login?invite=${token}`)}
                        className="rounded-lg px-4 py-2 text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
                    >
                        I already have an account
                    </button>
                </div>
            </Centered>
        )
    }

    return null
}

function Centered({ title, children }) {
    return (
        <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <div className="mb-6 flex flex-col items-center text-center">
                    <img src="/logo-white.png" width={36} height={36} alt="" />
                </div>
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-1)]/70 p-7 text-center backdrop-blur-md">
                    <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
                    {children}
                </div>
            </div>
        </div>
    )
}

export default AcceptInvite
