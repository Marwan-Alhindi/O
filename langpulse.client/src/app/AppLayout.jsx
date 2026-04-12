import Chat from "./components/Chat"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

function AppLayout () {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const firstName = user?.user_metadata?.first_name || 'User'
    const avatarLetter = firstName[0]?.toUpperCase() || 'U'

    async function handleLogout() {
        await logout()
        navigate('/login')
    }

    return (
        <div className="bg-zinc-900 w-screen h-screen md:bg-neutral-800">

            {/* Desktop and large screens */}
            <div className="hidden md:flex flex-row">
                {/* first */}
                <div className={`absolute flex flex-row items-center gap-x-4 text-white mt-8 ml-8 ${sidebarCollapsed ? 'hidden' : ''}`}>
                        <button onClick={() => navigate('/app')}>
                            <img src="/public/logo-white.png" height={40} width={40}></img>
                        </button>
                        <button onClick={() => navigate('/app')}><b>LANGPULSE</b></button>
                        <button onClick={() => setSidebarCollapsed(true)}>
                            <img src="public/sidebarCollapse.png" width={20} height={20}></img>
                        </button>
                </div>

                <div className={`flex flex-col h-screen shrink-0 grow-0 transition-all duration-300 ${sidebarCollapsed ? 'w-0 min-w-0 max-w-0 overflow-hidden' : 'w-60 min-w-60 max-w-60'}`}>
                    <div className="absolute flex flex-row items-center mt-40 ml-12 gap-x-2">
                        <button>
                            <img src="folder.png" width={30} height={30}></img>
                        </button>
                        <p className="text-neutral-400">Projects</p>
                        <button>
                            <img src="plus.png" width={12} height={12}></img>
                        </button>
                    </div>

                    <div className="absolute flex flex-row items-center mt-50 ml-12 gap-x-2">
                        <button>
                            <img src="conversations.png" height={30} width={30}></img>
                        </button>
                        <p className="text-neutral-400">Conversations</p>
                        <button>
                            <img src="plus.png" width={12} height={12}></img>
                        </button>
                    </div>

                    <div className="mt-auto border-t border-b border-neutral-700 py-3 mb-20">
                        <div className="ml-8 flex flex-row items-center gap-x-2 bg-neutral-800 rounded-full text-white">
                            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                                <p className="text-white font-bold">{avatarLetter}</p>
                            </div>
                            <p>{firstName}</p>
                            <button onClick={handleLogout}><img src="public/settings.png" width={20} height={20}></img></button>
                        </div>
                    </div>
                </div>
                {/* margin */}
                <div className="relative bg-neutral-700">
                </div>

                {/* Expand button when sidebar is collapsed */}
                {sidebarCollapsed && (
                    <button
                        className="absolute top-8 left-8 z-10 text-white"
                        onClick={() => setSidebarCollapsed(false)}
                    >
                        <img src="public/sidebarCollapse.png" width={20} height={20} className="rotate-180" />
                    </button>
                )}

                <Chat sidebarCollapsed={sidebarCollapsed} />
            </div>

            {/* Mobile */}
            <div className="bg-zinc-900 md:hidden">
                {/* navigation */}
                <div className="flex flex-row justify-between">
                    {/* logo and name */}
                    <div className="flex flex-row gap-x-4 items-center text-white m-4">
                            <button onClick={() => navigate('/')}>
                                <img src="/public/logo-white.png" height={40} width={40}></img>
                            </button>
                            <button onClick={() => navigate('/')}>LangPulse</button>
                    </div>

                    <button className="md:hidden">
                        <img src="/public/hamburger.png" width={50} height={50}></img>
                    </button>
                </div>

                {/* solid line */}
                <div className="border border-white ml-8 mr-8"></div>

                {/* name of the chat */}
                <div className="absolute flex flex-row text-white justify-center items-center w-full mt-4">
                    <p className="text-2xl mr-4">Name of the Chat</p>
                    <img src="public/nameOfChatArrow.png" height={20} width={20}></img>
                </div>

                {/* what do you want to work on? */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white text-lg">What do you want to work on?</p>
                </div>

                <div className="absolute bottom-0 w-full flex justify-center mb-8">
                    <div className="flex flex-row gap-x-4 items-end">
                        {/* Input box */}
                        <div className="bg-neutral-800 px-6 py-4 border border-yellow-300 border-solid rounded-full flex items-center justify-between w-[300px] text-white">
                        <p className="text-sm text-neutral-400">Ask anything...</p>
                        <img src="public/sendMessage.png" height={20} width={20} className="ml-4" />
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-row gap-x-4">
                        <button className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center">
                            <img src="public/attachFile.png" height={20} width={20} />
                        </button>
                        <button className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center">
                            <img src="public/mic.png" height={20} width={20} />
                        </button>
                        <button className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center">
                            <img src="public/searchBar.png" height={20} width={20} />
                        </button>
                        </div>
                    </div>
                    </div>

            </div>
        </div>
    )
}

export default AppLayout
