import { useState, useEffect } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../services/supabase"

function AppLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [chats, setChats] = useState([])
    const [showJoinModal, setShowJoinModal] = useState(false)
    const [joinCode, setJoinCode] = useState("")
    const [joinError, setJoinError] = useState("")
    const [landingInput, setLandingInput] = useState("")
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const firstName = user?.user_metadata?.first_name || 'User'
    const avatarLetter = firstName[0]?.toUpperCase() || 'U'

    // Fetch user's chats on mount
    useEffect(() => {
        fetchChats()
    }, [user])

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
            .insert({ name: "New Chat", created_by: user.id })
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

    async function handleJoinChat() {
        setJoinError("")
        if (!joinCode.trim()) return

        const { data: chat, error } = await supabase
            .from("chats")
            .select("id, name")
            .eq("invite_code", joinCode.trim())
            .single()

        if (error || !chat) {
            setJoinError("Invalid invite code")
            return
        }

        // Check if already a participant
        const { data: existing } = await supabase
            .from("chat_participants")
            .select("id")
            .eq("chat_id", chat.id)
            .eq("user_id", user.id)
            .single()

        if (!existing) {
            await supabase.from("chat_participants").insert({
                chat_id: chat.id,
                user_id: user.id,
                role: "member"
            })
        }

        setShowJoinModal(false)
        setJoinCode("")
        await fetchChats()
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

        if (msgError) {
            console.error("Message insert error:", msgError)
        }

        setChats(prev => [{ ...chat, role: "owner" }, ...prev])
        setLandingInput("")
        navigate(`/app/chat/${chat.id}`)
    }

    async function handleLogout() {
        await logout()
        navigate('/login')
    }

    const isInChat = location.pathname.includes('/app/chat/')

    return (
        <div className="bg-zinc-900 w-screen h-screen md:bg-neutral-800">

            {/* Join Chat Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
                    <div className="bg-zinc-800 rounded-xl p-8 text-white w-full max-w-sm mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-lg font-semibold">Join a Chat</p>
                            <img src="/close.png" width={20} height={20} className="cursor-pointer" onClick={() => { setShowJoinModal(false); setJoinError("") }} />
                        </div>
                        <p className="text-neutral-400 text-sm mb-4">Enter the invite code shared with you</p>
                        <input
                            type="text"
                            placeholder="Paste invite code..."
                            className="w-full px-4 py-2 bg-neutral-900 rounded text-white mb-2 border border-yellow-300"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoinChat()}
                        />
                        {joinError && <p className="text-red-400 text-sm mb-2">{joinError}</p>}
                        <button
                            onClick={handleJoinChat}
                            className="w-full bg-yellow-400 text-black py-2 rounded-xl mt-2 font-semibold hover:bg-yellow-300"
                        >
                            Join
                        </button>
                    </div>
                </div>
            )}

            {/* Desktop and large screens */}
            <div className="hidden md:flex flex-row h-screen">
                {/* Sidebar header */}
                <div className={`absolute flex flex-row items-center gap-x-2 text-white mt-8 ml-8 ${sidebarCollapsed ? 'hidden' : ''}`}>
                    <button onClick={() => navigate('/app')} className="flex items-center gap-x-2">
                        <img src="/logo-white.png" height={26} width={26} />
                        <b className="text-sm">LANGPULSE</b>
                    </button>
                    <button onClick={() => setSidebarCollapsed(true)}>
                        <img src="/sidebarCollapse.png" width={18} height={18} />
                    </button>
                </div>

                <div className={`flex flex-col h-screen shrink-0 grow-0 transition-all duration-300 ${sidebarCollapsed ? 'w-0 min-w-0 max-w-0 overflow-hidden' : 'w-60 min-w-60 max-w-60'}`}>
                    {/* Conversations section */}
                    <div className="mt-28 ml-6 mr-4">
                        <div className="flex flex-row items-center gap-x-2 mb-3">
                            <button>
                                <img src="/conversations.png" height={30} width={30} />
                            </button>
                            <p className="text-neutral-400">Conversations</p>
                            <button onClick={handleCreateChat}>
                                <img src="/plus.png" width={12} height={12} />
                            </button>
                        </div>

                        {/* Chat list */}
                        <div className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto">
                            {chats.map(chat => {
                                const isActive = location.pathname === `/app/chat/${chat.id}`
                                return (
                                    <button
                                        key={chat.id}
                                        onClick={() => navigate(`/app/chat/${chat.id}`)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${isActive ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-700/50 hover:text-white'}`}
                                    >
                                        {chat.name}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Join chat button */}
                        <button
                            onClick={() => setShowJoinModal(true)}
                            className="mt-3 text-sm text-yellow-400 hover:text-yellow-300"
                        >
                            + Join with invite code
                        </button>
                    </div>

                    {/* User profile at bottom */}
                    <div className="mt-auto border-t border-b border-neutral-700 py-3 mb-20">
                        <div className="ml-8 flex flex-row items-center gap-x-2 bg-neutral-800 rounded-full text-white">
                            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                                <p className="text-white font-bold">{avatarLetter}</p>
                            </div>
                            <p>{firstName}</p>
                            <button onClick={handleLogout}><img src="/settings.png" width={20} height={20} /></button>
                        </div>
                    </div>
                </div>

                {/* Expand button when sidebar is collapsed */}
                {sidebarCollapsed && (
                    <button
                        className="absolute top-8 left-8 z-10 text-white"
                        onClick={() => setSidebarCollapsed(false)}
                    >
                        <img src="/sidebarCollapse.png" width={20} height={20} className="rotate-180" />
                    </button>
                )}

                {/* Main content area */}
                {isInChat ? (
                    <Outlet context={{ sidebarCollapsed }} />
                ) : (
                    <div className={`relative flex-grow m-4 p-6 bg-zinc-900 rounded-2xl border border-neutral-700 shadow-inner text-white flex items-center justify-center ${sidebarCollapsed ? '' : 'ml-0'}`}>
                        <div className="flex flex-col items-center w-full">
                            <p className="text-lg mb-6">What do you want to work on?</p>
                            <div className="relative w-full max-w-xl border border-yellow-500 rounded-xl px-4 py-3 flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Ask anything..."
                                    className="bg-transparent outline-none flex-grow text-white placeholder-neutral-400"
                                    value={landingInput}
                                    onChange={(e) => setLandingInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleStartChatWithMessage(landingInput)}
                                />
                                <button className="text-yellow-400 hover:text-yellow-300" onClick={() => handleStartChatWithMessage(landingInput)}>
                                    <img src="/sendMessage.png" height={30} width={30} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile */}
            <div className="bg-zinc-900 md:hidden">
                <div className="flex flex-row justify-between">
                    <div className="flex flex-row gap-x-4 items-center text-white m-4">
                        <button onClick={() => navigate('/')}>
                            <img src="/logo-white.png" height={40} width={40} />
                        </button>
                        <button onClick={() => navigate('/')}>LangPulse</button>
                    </div>
                    <button className="md:hidden">
                        <img src="/hamburger.png" width={50} height={50} />
                    </button>
                </div>
                <div className="border border-white ml-8 mr-8"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white text-lg">What do you want to work on?</p>
                </div>
            </div>
        </div>
    )
}

export default AppLayout
