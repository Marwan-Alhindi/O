import { useState } from "react"
import Message from "./Message"
function Chat () {
    const [messages, setMessages] = useState([])
    const [inputText, setInputText] = useState("")

    console.log(inputText)
    function handleInputMessages () {
        if (!inputText.trim()) return

        setMessages(prev => [...prev, inputText])
        setInputText("") // clear input
        console.log(messages)
    }
    return (
        <div className="flex-grow m-4 ml-0 p-6 bg-zinc-900 rounded-2xl border border-neutral-700 shadow-inner text-white">
            {messages.length > 0 ? (
            <div>
                {/* Top actions */}
                <div className="flex flex-row justify-end items-center gap-x-2">
                    <button><img src='public/LLMinvite.png' /></button>
                    <button><img src='public/userInvite.png' /></button>
                    <button><img src='public/searchBar.png' /></button>
                    <button><img src='public/info.png' /></button>
                </div>

                {/* messages section */}
                {messages.map((message, i) => (<Message key={i} text={message} />))}
                
                {/* Input field */}
                <div className="absolute bottom-20 right-80 w-full max-w-xl border border-yellow-500 rounded-xl px-4 py-3 flex items-center gap-2">
                    <input
                    type="text"
                    placeholder="Ask anything..."
                    className="bg-transparent outline-none flex-grow text-white placeholder-neutral-400"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    />
                    <button className="text-yellow-400 hover:text-yellow-300">
                    <img src="public/attachFile.png" height={30} width={30} />
                    </button>
                    <button className="text-yellow-400 hover:text-yellow-300" onClick={handleInputMessages}>
                    <img src="public/sendMessage.png" height={30} width={30} />
                    </button>
                </div>
            </div>
            ) : (
            <>
                <div className="flex flex-row justify-end items-center gap-x-2">
                <button><img src='public/LLMinvite.png' /></button>
                <button><img src='public/userInvite.png' /></button>
                <button><img src='public/searchBar.png' /></button>
                <button><img src='public/info.png' /></button>
                </div>

                <div className="flex flex-col h-full w-full items-center justify-center">
                <p className="text-lg mb-6">What do you want to work on?</p>

                <div className="w-full max-w-xl border border-yellow-500 rounded-xl px-4 py-3 flex items-center gap-2">
                    <input
                    type="text"
                    placeholder="Ask anything..."
                    className="bg-transparent outline-none flex-grow text-white placeholder-neutral-400"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    />
                    <button className="text-yellow-400 hover:text-yellow-300">
                    <img src="public/attachFile.png" height={30} width={30} />
                    </button>
                    <button className="text-yellow-400 hover:text-yellow-300" onClick={handleInputMessages}>
                    <img src="public/sendMessage.png" height={30} width={30} />
                    </button>
                </div>
                </div>
            </>
            )}
        </div>
    )
}

export default Chat