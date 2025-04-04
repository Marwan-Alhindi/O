function Login () {
    return (
        <div className="text-white h-screen flex flex-col">

            {/* top line */}
            <div className="text-black w-full">.</div>

            {/* login content */}
            <div className="flex-grow flex items-center justify-center">
                <div className="flex flex-col border border-neutral-800 border-solid p-20 text-white">
                    <p className="text-2xl mb-4">Log in to your account</p>
                    <p className="text-l mb-4 text-neutral-400">
                        New to LangPulse? <span className="underline">Get Started</span>
                    </p>
                    <input className="border border-white border-solid py-4 px-20 mb-4 w-full" type="text" placeholder="Email" />
                    <input className="border border-white border-solid py-4 px-20 mb-4 w-full" type="password" placeholder="Password" />
                    <button className="bg-white text-black py-3 mt-2">Continue</button>
                </div>
            </div>

            {/* bottom line */}
            <div className="text-black w-full">.</div>
        </div>
    )
}

export default Login