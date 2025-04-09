import { useState } from "react"

function Message ({text}) {
    const [msgLen, setMsgLen] = useState()
    const [more, setIsMore] = useState(true)    
    function determineBtnRender () {
        
        return Boolean
    }
    return (
        <div className="bg-neutral-800 border border-yellow-300 border-solid mt-4 rounded-lg max-h-160 max-w-90 flex flex-col justify-between">

            {more ? (
                <div>
                    <p className="m-4 line-clamp-25">{text}</p>
                    <div className="flex justify-end mt-4">
                        <button
                        className="border border-yellow-300 border-solid p-2"
                        onClick={() => setIsMore(!more)}
                        ></button>
                    </div>
                </div>

            ) : (
                <div>
                    <p>{text}</p>
                </div>
            )}
        </div>
    )
}

export default Message