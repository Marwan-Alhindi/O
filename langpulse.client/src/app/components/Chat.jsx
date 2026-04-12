import { useState } from "react"
import Message from "./Message"
import AIMessage from "./AIMessage"
import React from "react"
import InviteLLM from "./InviteLLM"

function Chat ({ sidebarCollapsed }) {
    const [messages, setMessages] = useState([])
    const [inputText, setInputText] = useState("")
    const [invitedLLMs, setInvitedLLMs] = useState([])
    const [nextModelId, setNextModelId] = useState(1)
    const [InviteLLMpop, setInviteLLMpop] = useState(false)
    const [showMentionDropdown, setShowMentionDropdown] = useState(false)
    const [mentionFilter, setMentionFilter] = useState("")

    function handleInviteLLM(name, modelType, instructions) {
        const modelId = nextModelId
        setNextModelId(prev => prev + 1)
        setInviteLLMpop(false)

        fetch(`http://localhost:8000/inviteLLM?model_id=${modelId}&model_name=${encodeURIComponent(name)}&model_type=${modelType}&model_instruct=${encodeURIComponent(instructions)}`)
            .then(res => res.json())
            .then(data => {
                setInvitedLLMs(prev => [...prev, { id: modelId, name, type: modelType, instructions, number: modelId }])
                setMessages(prev => [...prev, { type: 'join', text: data.response, modelName: name, modelNumber: modelId, modelType }])
            })
            .catch(err => console.error("Invite error:", err))
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
        const newText = inputText.slice(0, lastAtIndex) + `@${llm.name} `
        setInputText(newText)
        setShowMentionDropdown(false)
    }

    function handleSendMessage() {
        if (!inputText.trim()) return

        const text = inputText
        setMessages(prev => [...prev, { type: 'user', text }])
        setInputText("")
        setShowMentionDropdown(false)

        // Parse @mentions to find which LLMs to send to
        const mentionRegex = /@(\S+)/g
        const mentions = []
        let match
        while ((match = mentionRegex.exec(text)) !== null) {
            mentions.push(match[1])
        }

        const targetLLMs = mentions.length > 0
            ? invitedLLMs.filter(llm => mentions.includes(llm.name))
            : invitedLLMs

        targetLLMs.forEach(llm => {
            fetch(`http://localhost:8000/askLLM?user_input=${encodeURIComponent(text)}&model_id=${llm.id}`)
                .then(res => res.json())
                .then(data => {
                    setMessages(prev => [...prev, { type: 'ai', text: data.response, modelName: llm.name, modelNumber: llm.number, modelType: llm.type }])
                })
                .catch(err => console.error("Ask error:", err))
        })
    }

    const hasMessages = messages.length > 0

    const filteredLLMs = invitedLLMs.filter(llm =>
        llm.name.toLowerCase().startsWith(mentionFilter.toLowerCase())
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
                    <span>{llm.name} #{llm.number}</span>
                </button>
            ))}
        </div>
    )

    return (
        <div className={`relative flex-grow m-4 p-6 bg-zinc-900 rounded-2xl border border-neutral-700 shadow-inner text-white ${sidebarCollapsed ? '' : 'ml-0'}`}>
            {InviteLLMpop ? (
                  <InviteLLM
                  onClose={() => setInviteLLMpop(false)}
                  onInvite={handleInviteLLM}
                />
            ) : hasMessages ? (
                <div>
                    {/* Top actions */}
                    <div className="flex flex-row justify-end items-center gap-x-2">
                        <button onClick={() => setInviteLLMpop(true)}><img src='public/LLMinvite.png' /></button>
                        <button><img src='public/userInvite.png' width={30} height={30}/></button>
                        <button><img src='public/searchBar.png' width={30} height={30}/></button>
                        <button><img src='public/info.png' width={30} height={30}/></button>
                    </div>

                    <div className="max-h-[700px] overflow-y-auto flex flex-col gap-2 pr-2 text-white overflow-x-hidden">
                        {messages.map((msg, i) => {
                            if (msg.type === 'user') {
                                return (
                                    <div key={i} className="flex left-0 justify-end mr-6">
                                        <Message text={msg.text} />
                                    </div>
                                )
                            } else if (msg.type === 'join') {
                                return (
                                    <div key={i} className="mt-4 flex items-start gap-3">
                                        <img src="/chatgpt.png" width={40} height={40} className="rounded-full" />
                                        <div>
                                            <p className="text-sm text-neutral-400">{msg.modelName} #{msg.modelNumber}</p>
                                            <p className="text-yellow-300 italic mt-1">{msg.text}</p>
                                        </div>
                                    </div>
                                )
                            } else if (msg.type === 'ai') {
                                return (
                                    <div key={i} className="mt-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <img src="/chatgpt.png" width={40} height={40} className="rounded-full" />
                                            <span className="text-sm text-neutral-400">{msg.modelName} #{msg.modelNumber}</span>
                                        </div>
                                        <div className="ml-12">
                                            <AIMessage text={msg.text} />
                                        </div>
                                    </div>
                                )
                            }
                        })}
                    </div>
                    {/* Input field */}
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-xl">
                        <div className="relative border border-yellow-500 rounded-xl px-4 py-3 flex items-center gap-2">
                            {mentionDropdown}
                            <input
                            type="text"
                            placeholder="Ask anything... (type @ to mention an LLM)"
                            className="bg-transparent outline-none flex-grow text-white placeholder-neutral-400"
                            value={inputText}
                            onChange={handleInputChange}
                            />
                            <button className="text-yellow-400 hover:text-yellow-300">
                            <img src="public/attachFile.png" height={30} width={30} />
                            </button>
                            <button className="text-yellow-400 hover:text-yellow-300" onClick={handleSendMessage}>
                            <img src="public/sendMessage.png" height={30} width={30} />
                            </button>
                        </div>
                    </div>
                </div>
                ) : (
                <>
                    <div className="flex flex-row justify-end items-center gap-x-2">
                    <button onClick={() => setInviteLLMpop(true)}><img src='public/LLMinvite.png' /></button>
                    <button><img src='public/userInvite.png' width={30} height={30}/></button>
                    <button><img src='public/searchBar.png' width={30} height={30}/></button>
                    <button><img src='public/info.png' width={30} height={30} /></button>
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
                        />
                        <button className="text-yellow-400 hover:text-yellow-300">
                        <img src="public/attachFile.png" height={30} width={30} />
                        </button>
                        <button className="text-yellow-400 hover:text-yellow-300" onClick={handleSendMessage}>
                        <img src="public/sendMessage.png" height={30} width={30} />
                        </button>
                    </div>
                    </div>
                </>
                )
            }
        </div>
    )
}

export default Chat
