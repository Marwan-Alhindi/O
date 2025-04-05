import Navigation from "../marketing/components/Navigation"
import Chat from "./components/Chat"
import { useState } from "react"

function AppLayout () {
    return (
        <div className="bg-zinc-900 w-screen h-screen md:bg-neutral-800">

            {/* Desktop and large screens */}
            <div className="hidden md:flex flex-row">
                {/* first */}
                <div className="absolute flex flex-row items-center gap-x-4 text-white mt-8 ml-8">
                        <button onClick={() => navigate('/app')}>
                            <img src="/public/logo-white.png" height={40} width={40}></img>
                        </button>
                        <button onClick={() => navigate('/app')}><b>LANGPULSE</b></button>
                        <button>
                            <img src="public/sidebarCollapse.png"></img>
                        </button>
                </div>

                <div className="flex flex-col h-screen w-60">
                    <div className="absolute flex flex-row items-center mt-40 ml-12 gap-x-2">
                        <button>
                            <img src="folder.png"></img>
                        </button>
                        <p className="text-neutral-400">Projects</p>
                        <button>
                            <img src="plus.png"></img>
                        </button>
                    </div>

                    <div className="absolute flex flex-row items-center mt-50 ml-12 gap-x-2">
                        <button>
                            <img src="conversations.png"></img>
                        </button>
                        <p className="text-neutral-400">Conversations</p>
                        <button>
                            <img src="plus.png"></img>
                        </button>
                    </div>                    

                    <div className="mt-auto border-t border-b border-neutral-700 py-3 mb-20">
                        <div className="ml-8 flex flex-row items-center gap-x-2 bg-neutral-800 rounded-full text-white">                            
                            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                                <p className="text-white font-bold">H</p>
                            </div>
                            <p>Marwan</p>
                            <button><img src="public/settings.png"></img></button>
                        </div>
                    </div>
                </div>
                {/* margin */}
                <div className="relative bg-neutral-700">
                </div>
                <Chat />
            </div>

            {/* Mobile */}
            <div className="bg-zinc-900 md:hideen">
                {/* navigation */}
                <div className="flex flex-row justify-between">
                    {/* logo and name */}
                    <div className="flex flex-row gap-x-4 items-center text-white m-4">
                            <button onClick={() => navigate('/')}>
                                <img src="/public/logo-white.png" height={40} width={40}></img>
                            </button>
                            <button onClick={() => navigate('/')}>LangPulse</button>
                    </div>

                    <button className="md:hidden" onClick={() => setIsMobile(!isMobile)}>
                        <img src="/public/hamburger.png"></img>
                    </button>
                </div>

                {/* solid line */}
                <div className="border border-white ml-8 mr-8"></div>

                {/* name of the chat */}
                <div className="absolute flex flex-row text-white justify-center w-full mt-4">
                    <p className="text-2xl">Name of the Chat</p>
                    <img src="public/nameOfChatArrow.png" height={10} width={10}></img>
                </div>

                {/* what do you want to work on? */}
                <div class="absolute inset-0 flex items-center justify-center">
                    <p className="text-white text-lg">What do you want to work on?</p>
                </div>

                {/* solid line */}
                <div className="absolute flex flex-row bottom-0 md:hidden">
                    <div className="bg-white px-20 py-4 mb-8 ml-8 border border-neutral-800 border-solid rounded-full flex flex-row gap-x-4">
                        <p>Meow!</p>
                        <img src="public/nameOfChatArrow.png"></img>
                    </div>

                    <button>
                        <img></img>
                    </button>

                    <button>
                        <img></img>
                    </button>

                    <button>
                        <img></img>
                    </button>
                </div>
                
            </div>
        </div>
    )
}

export default AppLayout