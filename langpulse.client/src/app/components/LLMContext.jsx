function LLMContext({ llm, messages, invitedLLMs, onClose }) {
    const relevantMessages = messages.filter(msg => {
        if (msg.type === 'join' && msg.modelName === llm.name) return true
        if (msg.type === 'ai' && msg.modelName === llm.name) return true
        if (msg.type === 'user') {
            // Show user messages that were directed at this LLM (via @mention or no mention)
            const mentionRegex = /@(\S+)/g
            const mentions = []
            let match
            while ((match = mentionRegex.exec(msg.text)) !== null) {
                mentions.push(match[1])
            }
            if (mentions.length === 0) return llm.connections?.includes("user")
            return mentions.includes(llm.name)
        }
        return false
    })

    return (
        <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center rounded-2xl">
            <div className="p-8 bg-zinc-800 rounded-xl text-white w-full max-w-lg max-h-[80vh] overflow-y-auto mx-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <img src="/chatgpt.png" width={40} height={40} className="rounded-full" />
                        <div>
                            <p className="text-lg font-semibold">{llm.name} #{llm.number}</p>
                            <p className="text-sm text-neutral-400">{llm.type === 'openai' ? 'ChatGPT (GPT-4o)' : llm.type}</p>
                        </div>
                    </div>
                    <img src="/close.png" width={20} height={20} className="cursor-pointer" onClick={onClose} />
                </div>

                <div className="border border-neutral-600 my-4"></div>

                {/* System Prompt */}
                <div className="mb-5">
                    <p className="text-yellow-400 font-semibold mb-2">System Prompt</p>
                    <div className="bg-neutral-900 rounded-lg p-3 text-sm">
                        <p className="text-neutral-300">{llm.instructions || 'No instructions set'}</p>
                    </div>
                </div>

                {/* Connected To */}
                <div className="mb-5">
                    <p className="text-yellow-400 font-semibold mb-2">Connected To</p>
                    <div className="flex flex-wrap gap-2">
                        {(!llm.connections || llm.connections.length === 0) && (
                            <p className="text-neutral-500 text-sm">No connections</p>
                        )}
                        {llm.connections?.map(connId => {
                            if (connId === 'user') {
                                return (
                                    <span key="user" className="bg-neutral-900 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                        <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">U</div>
                                        User (You)
                                    </span>
                                )
                            }
                            const connLLM = invitedLLMs.find(l => l.id === connId)
                            return connLLM ? (
                                <span key={connId} className="bg-neutral-900 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                    <img src="/chatgpt.png" width={18} height={18} className="rounded-full" />
                                    {connLLM.name} #{connLLM.number}
                                </span>
                            ) : null
                        })}
                    </div>
                </div>

                {/* Messages */}
                <div>
                    <p className="text-yellow-400 font-semibold mb-2">Messages ({relevantMessages.length})</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {relevantMessages.map((msg, i) => (
                            <div key={i} className="bg-neutral-900 rounded-lg p-3 text-sm">
                                <p className="text-xs mb-1 font-semibold" style={{
                                    color: msg.type === 'user' ? '#facc15' : '#9ca3af'
                                }}>
                                    {msg.type === 'user' ? 'User' : `${msg.modelName} #${msg.modelNumber}`}
                                    {msg.type === 'join' ? ' (joined)' : ''}
                                </p>
                                <p className="text-neutral-300 line-clamp-3">{msg.text}</p>
                            </div>
                        ))}
                        {relevantMessages.length === 0 && (
                            <p className="text-neutral-500 text-sm">No messages yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LLMContext
