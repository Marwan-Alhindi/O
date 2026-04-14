import { useState, useEffect } from "react"
import { supabase } from "../../services/supabase"

function InviteUser({ chatId, onClose }) {
    const [inviteCode, setInviteCode] = useState("")
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        async function fetchCode() {
            const { data } = await supabase
                .from("chats")
                .select("invite_code")
                .eq("id", chatId)
                .single()
            if (data) setInviteCode(data.invite_code)
        }
        fetchCode()
    }, [chatId])

    function handleCopy() {
        navigator.clipboard.writeText(inviteCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center rounded-2xl">
            <div className="p-8 bg-zinc-800 rounded-xl text-white w-full max-w-sm mx-4">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-lg font-semibold">Invite People</p>
                    <img src="/close.png" width={20} height={20} className="cursor-pointer" onClick={onClose} />
                </div>

                <p className="text-neutral-400 text-sm mb-4">Share this invite code with others so they can join this chat</p>

                <div className="flex items-center gap-2 bg-neutral-900 rounded-lg p-3">
                    <code className="flex-grow text-yellow-400 text-lg font-mono tracking-wider">{inviteCode || "..."}</code>
                    <button
                        onClick={handleCopy}
                        className="bg-yellow-400 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-300"
                    >
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default InviteUser
