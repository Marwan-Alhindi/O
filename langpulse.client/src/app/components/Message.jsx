import { useState } from "react"

function Message ({text}) {
    const [msgLen, setMsgLen] = useState()

    function determineBtnRender () {
        
        return Boolean
    }
    return (
        <div className="bg-neutral-800 border border-yellow-300 border-solid mt-4 rounded-lg max-h-160 max-w-90">
            <p className="m-4 line-clamp-25">{text}</p>

        </div>
    )
}

export default Message