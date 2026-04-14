import { useState } from "react";

function InviteLLM({ onClose, onInvite, invitedLLMs }) {
    const [name, setName] = useState("");
    const [modelType, setModelType] = useState("openai");
    const [instructions, setInstructions] = useState("");
    const [connections, setConnections] = useState(["user"]);

    function toggleConnection(id) {
        setConnections(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        )
    }

    function handleConfirm() {
        if (!name.trim()) return
        onInvite(name, modelType, instructions, connections)
    }

    return (
        <div className="flex items-center justify-center h-full w-full">
            <div className="p-10 bg-zinc-800 rounded-xl text-white w-full max-w-md max-h-[85vh] overflow-y-auto">
                <div className="flex flex-col items-start gap-4">
                    <div className="flex justify-between w-full items-center">
                        <p className="text-lg font-semibold">Invite new LLM to join the group!</p>
                        <img src="/close.png" width={20} height={20} className="cursor-pointer" onClick={onClose}/>
                    </div>
                </div>
                <div className="border border-white border-solid px-4 m-4"></div>
                    <p>Type the LLM name below:</p>
                    <input
                        type="text"
                        placeholder="Type the model member name"
                        className="w-full px-4 py-2 bg-neutral-800 rounded text-white my-4 border border-yellow-300 border-solid"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <p>Model:</p>
                    <select
                        value={modelType}
                        onChange={(e) => setModelType(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 text-white rounded border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 my-4 border border-yellow-300 border-solid"
                    >
                        <option value="openai">ChatGPT (GPT-4o)</option>
                    </select>
                    <p>Instructions:</p>
                    <input
                        type="text"
                        placeholder="Type the model instructions"
                        className="w-full px-4 py-2 bg-neutral-800 rounded text-white my-4 border border-yellow-300 border-solid"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                    />

                    <p>Connect to:</p>
                    <div className="my-4 space-y-2">
                        <label className="flex items-center gap-3 px-3 py-2 bg-neutral-900 rounded-lg cursor-pointer hover:bg-neutral-700">
                            <input
                                type="checkbox"
                                checked={connections.includes("user")}
                                onChange={() => toggleConnection("user")}
                                className="accent-yellow-400 w-4 h-4"
                            />
                            <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">U</div>
                            <span>User (All humans)</span>
                        </label>
                        {invitedLLMs.map(llm => (
                            <label key={llm.id} className="flex items-center gap-3 px-3 py-2 bg-neutral-900 rounded-lg cursor-pointer hover:bg-neutral-700">
                                <input
                                    type="checkbox"
                                    checked={connections.includes(llm.id)}
                                    onChange={() => toggleConnection(llm.id)}
                                    className="accent-yellow-400 w-4 h-4"
                                />
                                <img src="/chatgpt.png" width={24} height={24} className="rounded-full" />
                                <span>{llm.display_name} #{llm.display_number}</span>
                            </label>
                        ))}
                        {invitedLLMs.length === 0 && (
                            <p className="text-neutral-500 text-sm px-3">No other LLMs invited yet</p>
                        )}
                    </div>

                    <div className="flex flex-row justify-between">
                    <button className="bg-neutral-800 hover:bg-yellow-400 text-white px-4 py-2 rounded-xl mt-4 border border-yellow-300 border-solid" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="bg-neutral-800 hover:bg-yellow-400 text-white px-4 py-2 rounded-xl mt-4 border border-yellow-300 border-solid" onClick={handleConfirm}>
                        Confirm
                    </button>
                    </div>

            </div>
        </div>
    );
}

export default InviteLLM
