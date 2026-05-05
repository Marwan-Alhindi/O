import { useState, useEffect, useRef } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { supabase, apiFetch } from "../services/supabase"

function AppLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [chats, setChats] = useState([])
    const [landingInput, setLandingInput] = useState("")
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const [leaveChatTarget, setLeaveChatTarget] = useState(null)
    const [leavePending, setLeavePending] = useState(false)
    const [renamingChatId, setRenamingChatId] = useState(null)
    const [renameDraft, setRenameDraft] = useState("")
    const userMenuRef = useRef(null)
    const skipNextRenameBlur = useRef(false)

    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const firstName = user?.user_metadata?.first_name || 'User'
    const lastName = user?.user_metadata?.last_name || ''
    const avatarLetter = firstName[0]?.toUpperCase() || 'U'

    useEffect(() => { fetchChats() }, [user])

    // After login/signup, claim any pending invitations addressed to the
    // user's email. Covers users who created their account *after* being
    // invited (or who first logged in with a different account and then made
    // a new one). Idempotent on the backend.
    useEffect(() => {
        if (!user?.id) return
        let cancelled = false
        apiFetch('/invitations/claim_pending', { method: 'POST' })
            .then(({ joined_chat_ids } = {}) => {
                if (cancelled || !joined_chat_ids?.length) return
                fetchChats()
                if (location.pathname === '/app' || location.pathname === '/app/') {
                    navigate(`/app/chat/${joined_chat_ids[0]}`)
                }
            })
            .catch(() => { /* best-effort */ })
        return () => { cancelled = true }
    // Run once per user session — location/navigate don't need to retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id])

    useEffect(() => {
        function onClick(e) {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setUserMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', onClick)
        return () => document.removeEventListener('mousedown', onClick)
    }, [])

    async function fetchChats() {
        if (!user) return
        const { data } = await supabase
            .from("chat_participants")
            .select("chat_id, role, chats(id, name, created_at)")
            .eq("user_id", user.id)
            .order("joined_at", { ascending: false })
        if (data) {
            setChats(data.map(p => ({ ...p.chats, role: p.role })))
        }
    }

    async function handleCreateChat() {
        const { data: chat, error } = await supabase
            .from("chats")
            .insert({ name: "New chat", created_by: user.id })
            .select()
            .single()

        if (error) {
            console.error("Create chat error:", error)
            alert("Failed to create chat: " + error.message)
            return
        }

        await supabase.from("chat_participants").insert({
            chat_id: chat.id,
            user_id: user.id,
            role: "owner"
        })

        setChats(prev => [{ ...chat, role: "owner" }, ...prev])
        navigate(`/app/chat/${chat.id}`)
    }

    async function handleStartChatWithMessage(text) {
        if (!text.trim()) return

        const { data: chat, error } = await supabase
            .from("chats")
            .insert({ name: text.trim().slice(0, 40), created_by: user.id })
            .select()
            .single()

        if (error) {
            console.error("Create chat error:", error)
            alert("Failed to create chat: " + error.message)
            return
        }

        const { error: partError } = await supabase.from("chat_participants").insert({
            chat_id: chat.id,
            user_id: user.id,
            role: "owner"
        })

        if (partError) {
            console.error("Participant insert error:", partError)
            alert("Failed to join chat: " + partError.message)
            return
        }

        const { error: msgError } = await supabase.from("messages").insert({
            chat_id: chat.id,
            sender_type: "user",
            sender_user_id: user.id,
            content: text.trim()
        })

        if (msgError) console.error("Message insert error:", msgError)

        setChats(prev => [{ ...chat, role: "owner" }, ...prev])
        setLandingInput("")
        navigate(`/app/chat/${chat.id}`)
    }

    async function handleLogout() {
        await logout()
        navigate('/login')
    }

    function handleLeaveChat(chat, e) {
        e?.stopPropagation()
        setLeaveChatTarget(chat)
    }

    function handleRenameStart(chat, e) {
        e?.stopPropagation()
        setRenameDraft(chat.name || "")
        setRenamingChatId(chat.id)
    }

    async function handleRenameCommit(chat) {
        const newName = renameDraft.trim()
        setRenamingChatId(null)
        if (!newName || newName === chat.name) return

        const { error } = await supabase
            .from("chats")
            .update({ name: newName })
            .eq("id", chat.id)
        if (error) {
            alert("Failed to rename chat: " + error.message)
            return
        }
        setChats(prev => prev.map(c => c.id === chat.id ? { ...c, name: newName } : c))
    }

    function handleRenameCancel() {
        skipNextRenameBlur.current = true
        setRenamingChatId(null)
    }

    async function confirmLeaveChat() {
        const chat = leaveChatTarget
        if (!chat) return
        setLeavePending(true)

        await supabase.from("messages").insert({
            chat_id: chat.id,
            sender_type: "user",
            sender_user_id: user.id,
            content: `${firstName} left the chat`,
            kind: "leave"
        })

        const { error } = await supabase
            .from("chat_participants")
            .delete()
            .eq("chat_id", chat.id)
            .eq("user_id", user.id)

        if (error) {
            console.error("Leave chat error:", error)
            alert("Failed to leave chat: " + error.message)
            setLeavePending(false)
            return
        }

        setChats(prev => prev.filter(c => c.id !== chat.id))

        if (location.pathname === `/app/chat/${chat.id}`) {
            navigate('/app')
        }

        setLeaveChatTarget(null)
        setLeavePending(false)
    }

    const isInChat = location.pathname.includes('/app/chat/')

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[var(--color-canvas)] text-[var(--color-fg)]">
            {/* Leave Chat Modal */}
            {leaveChatTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm mx-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-1)] p-6 shadow-2xl">
                        <div className="mb-3 flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
                                <LeaveIcon />
                            </span>
                            <div className="min-w-0">
                                <p className="text-base font-semibold text-[var(--color-fg)]">Leave chat?</p>
                                <p className="truncate text-xs text-[var(--color-fg-muted)]">"{leaveChatTarget.name}"</p>
                            </div>
                        </div>
                        <p className="mb-5 text-sm text-[var(--color-fg-muted)]">
                            You'll stop receiving messages from this chat. You can rejoin later with the invite code.
                        </p>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => !leavePending && setLeaveChatTarget(null)}
                                disabled={leavePending}
                                className="rounded-lg px-3 py-2 text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)] disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLeaveChat}
                                disabled={leavePending}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400 disabled:opacity-40"
                            >
                                {leavePending ? 'Leaving…' : 'Leave chat'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop layout */}
            <div className="hidden h-full md:flex">
                {/* Sidebar */}
                <aside
                    className={`flex h-full shrink-0 flex-col border-r border-[var(--color-line-soft)] bg-[var(--color-surface-1)] transition-[width] duration-200 ${
                        sidebarCollapsed ? 'w-14' : 'w-64'
                    }`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-3.5 border-b border-[var(--color-line-soft)]">
                        {!sidebarCollapsed && (
                            <button onClick={() => navigate('/app')} className="flex items-center gap-2 px-1">
                                <img src="/logo-white.png" width={22} height={22} alt="" />
                                <span className="text-sm font-semibold tracking-tight">Glyph</span>
                            </button>
                        )}
                        <button
                            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="rounded-md p-1.5 text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
                        >
                            <SidebarIcon collapsed={sidebarCollapsed} />
                        </button>
                    </div>

                    {/* Top actions */}
                    <div className="space-y-1.5 px-3 pt-3">
                        <button
                            onClick={handleCreateChat}
                            className={`flex w-full items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-2 text-sm text-[var(--color-fg)] hover:bg-[var(--color-surface-3)] ${
                                sidebarCollapsed ? 'justify-center' : ''
                            }`}
                            title="New chat"
                        >
                            <PlusIcon />
                            {!sidebarCollapsed && <span>New chat</span>}
                        </button>
                    </div>

                    {/* Conversations */}
                    {!sidebarCollapsed && (
                        <div className="mt-4 flex min-h-0 flex-1 flex-col px-3">
                            <div className="mb-2 flex items-center justify-between px-1">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-subtle)]">
                                    Conversations
                                </span>
                                <span className="text-[10px] text-[var(--color-fg-subtle)]">{chats.length}</span>
                            </div>

                            <div className="lp-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
                                {chats.length === 0 && (
                                    <p className="px-2 py-3 text-xs text-[var(--color-fg-subtle)]">
                                        No chats yet. Create one or join with a code.
                                    </p>
                                )}
                                {chats.map(chat => {
                                    const isActive = location.pathname === `/app/chat/${chat.id}`
                                    const isEditing = renamingChatId === chat.id
                                    return (
                                        <div
                                            key={chat.id}
                                            onClick={isEditing ? undefined : () => navigate(`/app/chat/${chat.id}`)}
                                            className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                                                isEditing ? '' : 'cursor-pointer'
                                            } ${
                                                isActive
                                                    ? 'bg-[var(--color-surface-3)] text-[var(--color-fg)]'
                                                    : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]'
                                            }`}
                                        >
                                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-[var(--color-line)] group-hover:bg-[var(--color-fg-subtle)]'}`} />
                                            {isEditing ? (
                                                <input
                                                    autoFocus
                                                    value={renameDraft}
                                                    onChange={(e) => setRenameDraft(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                            handleRenameCommit(chat)
                                                        } else if (e.key === 'Escape') {
                                                            e.preventDefault()
                                                            handleRenameCancel()
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        if (skipNextRenameBlur.current) {
                                                            skipNextRenameBlur.current = false
                                                            return
                                                        }
                                                        handleRenameCommit(chat)
                                                    }}
                                                    className="min-w-0 flex-1 rounded border border-[var(--color-line)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-fg-subtle)]"
                                                />
                                            ) : (
                                                <>
                                                    <span className="flex-1 truncate">{chat.name || 'Untitled'}</span>
                                                    <button
                                                        onClick={(e) => handleRenameStart(chat, e)}
                                                        className="rounded p-0.5 text-[var(--color-fg-subtle)] opacity-0 hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)] group-hover:opacity-100"
                                                        title="Rename chat"
                                                    >
                                                        <PencilIcon size={12} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleLeaveChat(chat, e)}
                                                        className="rounded p-0.5 text-[var(--color-fg-subtle)] opacity-0 hover:bg-[var(--color-surface-3)] hover:text-rose-400 group-hover:opacity-100"
                                                        title="Leave chat"
                                                    >
                                                        <CloseIcon size={12} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* User */}
                    <div className="relative mt-auto border-t border-[var(--color-line-soft)] p-2" ref={userMenuRef}>
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-[var(--color-surface-2)] ${
                                sidebarCollapsed ? 'justify-center' : ''
                            }`}
                        >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 text-xs font-semibold text-black">
                                {avatarLetter}
                            </div>
                            {!sidebarCollapsed && (
                                <>
                                    <div className="flex-1 truncate text-left">
                                        <div className="truncate text-sm font-medium">{firstName} {lastName}</div>
                                        <div className="truncate text-[10px] text-[var(--color-fg-subtle)]">{user?.email}</div>
                                    </div>
                                    <ChevronUpIcon />
                                </>
                            )}
                        </button>

                        {userMenuOpen && (
                            <div className="absolute bottom-full left-2 right-2 mb-2 overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] shadow-2xl">
                                <button
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-fg)] hover:bg-[var(--color-surface-3)]"
                                >
                                    <LogoutIcon /> Log out
                                </button>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main */}
                <main className="relative flex-1 overflow-hidden">
                    {isInChat ? (
                        <Outlet context={{ sidebarCollapsed }} />
                    ) : (
                        <EmptyLanding
                            firstName={firstName}
                            value={landingInput}
                            setValue={setLandingInput}
                            onSubmit={() => handleStartChatWithMessage(landingInput)}
                            onCreate={handleCreateChat}
                        />
                    )}
                </main>
            </div>

            {/* Mobile fallback */}
            <div className="flex h-full flex-col md:hidden">
                <div className="flex items-center justify-between border-b border-[var(--color-line-soft)] px-4 py-3">
                    <button onClick={() => navigate('/app')} className="flex items-center gap-2">
                        <img src="/logo-white.png" width={22} height={22} alt="" />
                        <span className="text-sm font-semibold">Glyph</span>
                    </button>
                    <button onClick={handleCreateChat} className="rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-xs">
                        New chat
                    </button>
                </div>

                {isInChat ? (
                    <Outlet context={{ sidebarCollapsed: true }} />
                ) : (
                    <div className="flex-1 overflow-y-auto p-4">
                        <h2 className="text-lg font-semibold tracking-tight">Hi {firstName}.</h2>
                        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">Pick a conversation or start a new one.</p>
                        <div className="mt-4 space-y-1">
                            {chats.map(chat => (
                                <button
                                    key={chat.id}
                                    onClick={() => navigate(`/app/chat/${chat.id}`)}
                                    className="flex w-full items-center justify-between rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] px-3 py-2 text-left text-sm"
                                >
                                    <span className="truncate">{chat.name}</span>
                                    <span className="text-xs text-[var(--color-fg-subtle)]">→</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function EmptyLanding({ firstName, value, setValue, onSubmit, onCreate }) {
    return (
        <div className="lp-spotlight relative flex h-full items-center justify-center overflow-y-auto px-6 py-10">
            <div className="w-full max-w-2xl">
                <div className="text-center">
                    <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-fg-subtle)]">
                        Workspace
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                        Hi {firstName}, what's on your mind?
                    </h1>
                    <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-fg-muted)]">
                        Start a new chat with your team and bring in any model.
                    </p>
                </div>

                {/* Prompt box */}
                <div className="mt-8">
                    <div className="group relative rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-1)] p-1 shadow-2xl transition-colors focus-within:border-[var(--color-fg-subtle)]">
                        <textarea
                            rows={2}
                            placeholder="Describe what you want to work on… ⏎ to start"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    onSubmit()
                                }
                            }}
                            className="block w-full resize-none bg-transparent px-4 py-3 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] outline-none"
                        />
                        <div className="flex items-center justify-between border-t border-[var(--color-line-soft)] px-2 py-1.5">
                            <div className="flex items-center gap-1 text-xs text-[var(--color-fg-subtle)] px-1">
                                <span>Tip:</span>
                                <span>type @ in the chat to mention a model</span>
                            </div>
                            <button
                                onClick={onSubmit}
                                disabled={!value.trim()}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-[var(--color-brand)] disabled:opacity-40"
                            >
                                Start chat <span>→</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick actions */}
                <div className="mt-6">
                    <ActionCard onClick={onCreate} title="New empty chat" desc="Open a blank thread and invite people or models." />
                </div>
            </div>
        </div>
    )
}

function ActionCard({ onClick, title, desc }) {
    return (
        <button
            onClick={onClick}
            className="rounded-xl border border-[var(--color-line-soft)] bg-[var(--color-surface-1)] p-4 text-left transition-colors hover:border-[var(--color-line)] hover:bg-[var(--color-surface-2)]"
        >
            <div className="text-sm font-medium text-[var(--color-fg)]">{title}</div>
            <div className="mt-1 text-xs text-[var(--color-fg-muted)]">{desc}</div>
        </button>
    )
}

/* Inline icons */
function PlusIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    )
}
function CloseIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    )
}
function SidebarIcon({ collapsed }) {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" />
        </svg>
    )
}
function ChevronUpIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
        </svg>
    )
}
function LogoutIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    )
}
function PencilIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
    )
}
function LeaveIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    )
}

export default AppLayout
