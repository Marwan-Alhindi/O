import { useParams, useOutletContext } from "react-router-dom"
import Chat from "../components/Chat"

function ChatPage() {
    const { chatId } = useParams()
    const { sidebarCollapsed } = useOutletContext()

    return <Chat chatId={chatId} sidebarCollapsed={sidebarCollapsed} />
}

export default ChatPage
