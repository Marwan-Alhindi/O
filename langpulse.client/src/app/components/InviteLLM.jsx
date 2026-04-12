import { useState } from "react";

function InviteLLM({ onClose, onInvite }) {
    const [name, setName] = useState("");
    const [modelType, setModelType] = useState("openai");
    const [instructions, setInstructions] = useState("");

    function handleConfirm() {
        if (!name.trim()) return
        onInvite(name, modelType, instructions)
    }

    return (
        <div className="flex items-center justify-center h-full w-full">
            <div className="p-10 bg-zinc-800 rounded-xl text-white w-full max-w-md">
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
