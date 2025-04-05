function Getstarted () {
    return (
        <div className="text-white h-screen flex flex-col">

            {/* top line */}
            <div className="text-black w-full">.</div>

            {/* form */}

            <div className="flex-grow flex items-center justify-center">
                <div className="flex flex-col border border-neutral-800 border-solid p-20 text-white">
                    <p className="text-2xl mb-4">Start with free LLM models!</p>
                    <p className="text-l mb-4 text-neutral-400">You can subscribe then for more powerful models</p>
                    <p className="text-l mb-4 text-neutral-400">Please fill below form to register a new account</p>
                    <form className="space-y-4 mt-2">
                        <input className="border border-white border-solid py-4 px-20 mb-4 w-full rounded-sm" type="email" placeholder="example@app.com" />
                        <div className="flex gap-4">
                            <input className="border border-white border-solid py-4 px-4 w-1/2 rounded-sm" type="text" placeholder="First Name" />
                            <input className="border border-white border-solid py-4 px-4 w-1/2 rounded-sm" type="text" placeholder="Last Name" />
                        </div>
                        <input className="border border-white border-solid py-4 px-20 mb-4 w-full rounded-sm" type="password" placeholder="Password" />
                        <input className="border border-white border-solid py-4 px-20 mb-4 w-full rounded-sm" type="password" placeholder="Confirm Password" />
                        <button className="bg-white text-black py-3 mt-2 w-full rounded-full">Join</button>
                    </form>
                </div>
            </div>

            {/* bottom line */}
            <div className="text-black w-full">.</div>
        </div>
    )
}

export default Getstarted