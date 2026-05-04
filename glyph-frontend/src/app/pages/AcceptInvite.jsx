import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { apiFetch } from "../../services/supabase"

function AcceptInvite() {
    const { token } = useParams()
    const navigate = useNavigate()
    const { user, loading: authLoading, logout } = useAuth()

    const [status, setStatus] = useState("idle") // idle | redeeming | error
    const [error, setError] = useState("")
    const [preview, setPreview] = useState(null)

    useEffect(() => {
        if (authLoading) return
        if (!token) {
            setStatus("error")
            setError("Missing invitation token.")
            return
        }

        if (!user) {
            apiFetch(`/invitations/peek?token=${encodeURIComponent(token)}`, { auth: false })
                .then(setPreview)
                .catch((err) => {
                    setStatus("error")
                    setError(err.detail || err.message || "This invitation is no longer valid.")
                })
            return
        }

        setStatus("redeeming")
        apiFetch("/invitations/accept", { method: "POST", body: { token } })
            .then((res) => navigate(`/app/chat/${res.chat_id}`, { replace: true }))
            .catch((err) => {
                setStatus("error")
                setError(err.detail || err.message || "Could not redeem this invitation.")
            })
    }, [token, user, authLoading, navigate])

    if (authLoading || status === "redeeming") {
        return <Centered title="Joining the chat…" />
    }

    if (status === "error") {
        return (
            <Centered title="Something went wrong">
                <p className="mt-2 text-sm text-rose-300">{error}</p>
                <div className="mt-6 flex flex-col gap-2">
                    {user ? (
                        <>
                            <button
                                onClick={async () => { await logout(); navigate(`/login?invite=${token}`) }}
                                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-[var(--color-brand)]"
                            >
                                Log out and try a different account
                            </button>
                            <button
                                onClick={() => navigate('/app')}
                                className="rounded-lg px-4 py-2 text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
                            >
                                Go to my chats
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-[var(--color-brand)]"
                        >
                            Back to login
                        </button>
                    )}
                </div>
            </Centered>
        )
    }

    // Not signed in — show preview + options
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
