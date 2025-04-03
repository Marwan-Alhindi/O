import { useState } from "react"

function Navigation () {
    const [isMobile, setIsMobile] = useState(false);

    return (
        <div>
            
            <div className="md:flex justify-between items-center py-4 px-8 lg:px-20 w-full border-b border-b-neutral-800 border-solid">                
                <div className="flex flex-row justify-between">
                    <div className="sm:flex flex-row gap-x-4 items-center text-white md:ml-20">
                        <img src="/public/logo-white.png" height={40} width={40}></img>
                        <button>LangPulse</button>
                    </div>

                    <button className="md:hidden" onClick={() => setIsMobile(!isMobile)}>
                        <img src="/public/hamburger.png"></img>
                    </button>
                </div>
                <div className="hidden md:flex flex-row text-white gap-x-12 ml-20 mr-20 text-zinc-500 lg:gap-x-24 mr-30 ml-30">
                    <button>Pricing</button>
                    <button>More</button>
                </div>

                <div className="hidden md:flex flex-row text-white gap-x-10">
                    <button>Log in</button>
                    <button className="md:bg-white text-black p-2 rounded-full">Get Started</button>
                </div>
            </div>

            {isMobile && (
                <div className="absolute w-full text-white flex flex-col items-center justify-between h-screen">
                    <div className="flex flex-col justify-between mt-8 gap-y-8">
                        <button>More</button>
                        <button>Docs</button>
                    </div>

                    <div className="flex flex-col justify-between mb-8 gap-y-8">
                        <button className="py-4 px-30 border border-white border-solid rounded-full">Log In</button>
                        <button className="bg-white py-4 px-30 border border-white border-solid rounded-full text-black">Get Started</button>
                    </div>
                </div>
            )}
        </div>

    )
}

export default Navigation