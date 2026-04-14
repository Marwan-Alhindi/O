import { useState, useEffect, useRef } from "react"
import Message from "./Message"
import AIMessage from "./AIMessage"
import React from "react"
import InviteLLM from "./InviteLLM"
import LLMContext from "./LLMContext"
import InviteUser from "./InviteUser"
import { supabase, API_BASE } from "../../services/supabase"
import { useAuth } from "../../contexts/AuthContext"

function Chat({ chatId, sidebarCollapsed }) {
    const [messages, setMessages] = useState([])
    const [invitedLLMs, setInvitedLLMs] = useState([])
    const [inputText, setInputText] = useState("")
    const [InviteLLMpop, setInviteLLMpop] = useState(false)
    const [showMentionDropdown, setShowMentionDropdown] = useState(false)
    const [mentionFilter, setMentionFilter] = useState("")
    const [contextLLM, setContextLLM] = useState(null)
    const [showInviteUser, setShowInviteUser] = useState(false)
    const [profilesById, setProfilesById] = useState({})
    const [loading, setLoading] = useState(true)
    const { user, session } = useAuth()
    const messagesEndRef = useRef(null)

    // Load messages and LLMs from Supabase when chatId changes
    useEffect(() => {
        if (!chatId) return
        setLoading(true)

        async function loadData() {
            // Fetch messages with joined LLM data
            const { data: msgs } = await supabase
                .from("messages")
                .select("*, invited_llms(id, display_name, display_number, model_type)")
                .eq("chat_id", chatId)
                .order("created_at", { ascending: true })

            if (msgs) setMessages(msgs)

            // Fetch invited LLMs with connections
            const { data: llms } = await supabase
                .from("invited_llms")
                .select("*, llm_connections!llm_id(*)")
                .eq("chat_id", chatId)
                .order("created_at", { ascending: true })

            if (llms) setInvitedLLMs(llms)

            // Fetch profiles for all chat participants
            const { data: participants } = await supabase
                .from("chat_participants")
                .select("user_id")
                .eq("chat_id", chatId)

            if (participants?.length) {
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, first_name")
                    .in("id", participants.map(p => p.user_id))

                if (profiles) {
                    setProfilesById(Object.fromEntries(profiles.map(p => [p.id, p])))
                }
            }

            setLoading(false)
        }

        loadData()
    }, [chatId])

    // Subscribe to Supabase Realtime for live updates
    useEffect(() => {
        if (!chatId) return

        const channel = supabase
            .channel(`chat-${chatId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
                async (payload) => {
                    // Fetch the full message with joined LLM data
                    const { data: fullMsg } = await supabase
                        .from("messages")
                        .select("*, invited_llms(id, display_name, display_number, model_type)")
                        .eq("id", payload.new.id)
                        .single()

                    if (fullMsg) {
                        setMessages(prev => {
                            // Avoid duplicates
                            if (prev.some(m => m.id === fullMsg.id)) return prev
                            return [...prev, fullMsg]
                        })
                    }
                }
            )
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'invited_llms', filter: `chat_id=eq.${chatId}` },
                async (payload) => {
                    const { data: fullLlm } = await supabase
                        .from("invited_llms")
                        .select("*, llm_connections!llm_id(*)")
                        .eq("id", payload.new.id)
                        .single()

                    if (fullLlm) {
                        setInvitedLLMs(prev => {
                            if (prev.some(l => l.id === fullLlm.id)) return prev
                            return [...prev, fullLlm]
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [chatId])

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    async function handleInviteLLM(name, modelType, instructions, connections) {
        // Compute display_number
        const maxNum = invitedLLMs.reduce((max, l) => Math.max(max, l.display_number || 0), 0)
        const displayNumber = maxNum + 1

        // Insert LLM into Supabase
        const { data: newLlm, error: llmError } = await supabase
            .from("invited_llms")
            .insert({
                chat_id: chatId,
                display_name: name,
                model_type: modelType,
                model_instruct: instructions,
                display_number: displayNumber,
                invited_by: user.id
            })
            .select()
            .single()

        if (llmError) {
            console.error("Error inviting LLM:", llmError)
            alert("Failed to invite LLM: " + llmError.message)
            return
        }

        // Insert connections
        const connRows = connections.map(c => {
            if (c === "user") {
                return { llm_id: newLlm.id, target_type: "user", target_llm_id: null }
            } else {
                return { llm_id: newLlm.id, target_type: "llm", target_llm_id: c }
            }
        })

        if (connRows.length > 0) {
            const { error: connError } = await supabase.from("llm_connections").insert(connRows)
            if (connError) {
                console.error("Connection insert error:", connError)
                alert("Failed to create connections: " + connError.message)
            }
        }

        // Add LLM to state directly
        const fullLlm = { ...newLlm, llm_connections: connRows.map((c, i) => ({ id: `temp-${i}`, ...c })) }
        setInvitedLLMs(prev => {
            if (prev.some(l => l.id === fullLlm.id)) return prev
            return [...prev, fullLlm]
        })

        setInviteLLMpop(false)

        // Call backend to generate join message
        try {
            const res = await fetch(`${API_BASE}/inviteLLM`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ chat_id: chatId, llm_id: newLlm.id })
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                console.error("Backend invite error:", err)
                alert("Backend error: " + (err.detail || res.statusText))
            }
        } catch (err) {
            console.error("Invite fetch error:", err)
            alert(`Could not reach backend at ${API_BASE}: ${err.message}`)
        }
    }

    function handleInputChange(e) {
        const value = e.target.value
        setInputText(value)

        const lastAtIndex = value.lastIndexOf('@')
        if (lastAtIndex !== -1) {
            const afterAt = value.slice(lastAtIndex + 1)
            if (!afterAt.includes(' ')) {
                setMentionFilter(afterAt)
                setShowMentionDropdown(true)
            } else {
                setShowMentionDropdown(false)
            }
        } else {
            setShowMentionDropdown(false)
        }
    }

    function handleSelectMention(llm) {
        const lastAtIndex = inputText.lastIndexOf('@')
        const newText = inputText.slice(0, lastAtIndex) + `@${llm.display_name} `
        setInputText(newText)
        setShowMentionDropdown(false)
    }

    async function handleSendMessage() {
        if (!inputText.trim()) return

        const text = inputText
        setInputText("")
        setShowMentionDropdown(false)

        // Insert user message into Supabase (Realtime will broadcast)
        const { data: newMsg, error: msgError } = await supabase.from("messages").insert({
            chat_id: chatId,
            sender_type: "user",
            sender_user_id: user.id,
            content: text
        }).select("*, invited_llms(id, display_name, display_number, model_type)").single()

        if (msgError) {
            console.error("Message insert error:", msgError)
            alert("Failed to send message: " + msgError.message)
            setInputText(text)
            return
        }

        // Add message to state immediately (don't wait for Realtime)
        setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
        })

        // Parse @mentions
        const mentionRegex = /@(\S+)/g
        const mentions = []
        let match
        while ((match = mentionRegex.exec(text)) !== null) {
            mentions.push(match[1])
        }

        // Find target LLMs
        let targetLLMs
        if (mentions.length > 0) {
            const firstMentioned = invitedLLMs.find(llm => llm.display_name === mentions[0])
            targetLLMs = firstMentioned ? [firstMentioned] : []
        } else {
            targetLLMs = invitedLLMs.filter(llm =>
                llm.llm_connections?.some(c => c.target_type === "user")
            )
        }

        // Call backend for each target LLM
        for (const llm of targetLLMs) {
            try {
                const res = await fetch(`${API_BASE}/askLLM`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ chat_id: chatId, llm_id: llm.id })
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    console.error("Backend ask error:", err)
                    alert("LLM error: " + (err.detail || res.statusText))
                }
            } catch (err) {
                console.error("Ask fetch error:", err)
                alert(`Could not reach backend at ${API_BASE}: ${err.message}`)
            }
        }
    }

    function openContext(llmId) {
        const llm = invitedLLMs.find(l => l.id === llmId)
        if (llm) setContextLLM(llm)
    }

    const hasMessages = messages.length > 0

    const filteredLLMs = invitedLLMs.filter(llm =>
        llm.display_name.toLowerCase().startsWith(mentionFilter.toLowerCase())
    )

    const mentionDropdown = showMentionDropdown && filteredLLMs.length > 0 && (
        <div className="absolute bottom-full mb-2 left-0 w-full bg-zinc-800 border border-zinc-600 rounded-lg overflow-hidden z-10">
            {filteredLLMs.map(llm => (
                <button
                    key={llm.id}
                    className="w-full px-4 py-2 flex items-center gap-2 hover:bg-zinc-700 text-left text-white"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectMention(llm)}
                >
                    <img src="/chatgpt.png" width={24} height={24} className="rounded-full" />
                    <span>{llm.display_name} #{llm.display_number}</span>
                </button>
            ))}
        </div>
    )

    if (loading) {
        return (
            <div className={`relative flex-grow m-4 p-6 bg-zinc-900 rounded-2xl border border-neutral-700 shadow-inner text-white flex items-center justify-center ${sidebarCollapsed ? '' : 'ml-0'}`}>
                <p className="text-neutral-400">Loading chat...</p>
            </div>
        )
    }

    return (
        <div className={`relative flex-grow m-4 p-6 bg-zinc-900 rounded-2xl border border-neutral-700 shadow-inner text-white flex flex-col min-h-0 ${sidebarCollapsed ? '' : 'ml-0'}`}>
            {/* Context panel overlay */}
            {contextLLM && (
                <LLMContext
                    llm={contextLLM}
                    messages={messages}
                    invitedLLMs={invitedLLMs}
                    onClose={() => setContextLLM(null)}
                />
            )}

            {/* Invite User modal */}
            {showInviteUser && (
                <InviteUser
                    chatId={chatId}
                    onClose={() => setShowInviteUser(false)}
                />
            )}

            {InviteLLMpop ? (
                <InviteLLM
                    onClose={() => setInviteLLMpop(false)}
                    onInvite={handleInviteLLM}
                    invitedLLMs={invitedLLMs}
                />
            ) : hasMessages ? (
                <div className="flex flex-col flex-1 min-h-0">
                    {/* Top actions */}
                    <div className="flex flex-row justify-end items-center gap-x-2">
                        <button onClick={() => setInviteLLMpop(true)}><img src='/LLMinvite.png' /></button>
                        <button onClick={() => setShowInviteUser(true)}><img src='/userInvite.png' width={30} height={30} /></button>
                        <button><img src='/searchBar.png' width={30} height={30} /></button>
                        <button><img src='/info.png' width={30} height={30} /></button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-2 text-white overflow-x-hidden">
                        {messages.map((msg) => {
                            if (msg.sender_type === 'user') {
                                const isMe = msg.sender_user_id === user?.id
                                const profile = profilesById[msg.sender_user_id]
                                const displayName = isMe ? 'You' : (profile?.first_name || 'User')
                                const avatarLetter = (displayName[0] || 'U').toUpperCase()
                                return (
                                    <div key={msg.id} className={`flex mt-4 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start gap-2`}>
                                        <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shrink-0">
                                            <span className="text-black font-bold">{avatarLetter}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-sm text-neutral-400 mb-1 ${isMe ? 'text-right' : 'text-left'}`}>{displayName}</span>
                                            <Message text={msg.content} />
                                        </div>
                                    </div>
                                )
                            } else if (msg.sender_type === 'llm') {
                                const llmInfo = msg.invited_llms
                                const isJoinMessage = msg.kind === 'join'

                                return (
                                    <div key={msg.id} className="mt-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <img
                                                src="/chatgpt.png" width={40} height={40}
                                                className="rounded-full cursor-pointer hover:ring-2 hover:ring-yellow-400"
                                                onClick={() => openContext(msg.sender_llm_id)}
                                            />
                                            <span className="text-sm text-neutral-400">
                                                {llmInfo?.display_name || 'LLM'} #{llmInfo?.display_number || '?'}
                                            </span>
                                            {isJoinMessage && <span className="text-xs text-yellow-400 italic">(joined)</span>}
                                        </div>
                                        <div className="ml-12">
                                            {isJoinMessage ? (
                                                <p className="text-yellow-300 italic">{msg.content}</p>
                                            ) : (
                                                <AIMessage text={msg.content} />
                                            )}
                                        </div>
                                    </div>
                                )
                            }
                            return null
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input field */}
                    <div className="mt-4 w-full max-w-xl mx-auto">
                        <div className="relative border border-yellow-500 rounded-xl px-4 py-3 flex items-center gap-2">
                            {mentionDropdown}
                            <input
                                type="text"
                                placeholder="Ask anything... (type @ to mention an LLM)"
                                className="bg-transparent outline-none flex-grow text-white placeholder-neutral-400"
                                value={inputText}
                                onChange={handleInputChange}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button className="text-yellow-400 hover:text-yellow-300">
                                <img src="/attachFile.png" height={30} width={30} />
                            </button>
                            <button className="text-yellow-400 hover:text-yellow-300" onClick={handleSendMessage}>
                                <img src="/sendMessage.png" height={30} width={30} />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex flex-row justify-end items-center gap-x-2">
                        <button onClick={() => setInviteLLMpop(true)}><img src='/LLMinvite.png' /></button>
                        <button onClick={() => setShowInviteUser(true)}><img src='/userInvite.png' width={30} height={30} /></button>
                        <button><img src='/searchBar.png' width={30} height={30} /></button>
                        <button><img src='/info.png' width={30} height={30} /></button>
                    </div>

                    <div className="flex flex-col h-full w-full items-center justify-center">
                        <p className="text-lg mb-6">What do you want to work on?</p>

                        <div className="relative w-full max-w-xl border border-yellow-500 rounded-xl px-4 py-3 flex items-center gap-2">
                            {mentionDropdown}
                            <input
                                type="text"
                                placeholder="Ask anything... (type @ to mention an LLM)"
                                className="bg-transparent outline-none flex-grow text-white placeholder-neutral-400"
                                value={inputText}
                                onChange={handleInputChange}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button className="text-yellow-400 hover:text-yellow-300">
                                <img src="/attachFile.png" height={30} width={30} />
                            </button>
                            <button className="text-yellow-400 hover:text-yellow-300" onClick={handleSendMessage}>
                                <img src="/sendMessage.png" height={30} width={30} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default Chat
