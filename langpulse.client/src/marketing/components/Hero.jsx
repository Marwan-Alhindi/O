function Hero () {
    return (
        <div>
            {/* line + margin at the top of the landing page*/}
            <div className="pt-20 border-b border-b-neutral-800 border-solid text-white"></div>

            {/* first block */}
            <div>
                <div className="relative text-white bg-black pb-20 py-8 border-x border-x-neutral-800 border-solid text-white">
                    <img className="absolute -top-0.5" src="/public/Vector1.png"></img>
                    <img className="absolute -right-0 -top-0.5" src="/public/Vector2.png"></img> 
                    {/* <img className="absolute -right-0.3" src="/public/Vector3.png"></img> */}
                    <img className="absolute -right-0 -bottom-1" src="/public/Vector4.png"></img>
                    <p className="flex w-full justify-center text-2xl text-center">Elevate your and your team productivity <br/>with collaborative LLMs.</p>
                    <div className="flex w-full justify-center gap-x-4 mt-4 items-center">
                        <img src="/public/perplexity.png"></img>
                        <p className="text-2xl text-center">Perplexity</p>
                    </div>
                    
                    <div className="absolute w-full flex justify-center mt-6">
                        <button className="bg-white py-2 px-6 border border-white border-solid rounded-full text-black">
                            Get Started!
                        </button>
                    </div>
                </div>
            </div>

            {/* line */}
            <div className="border-b border-b-neutral-800 border-solid text-white"></div>

            {/* second section */}
            <div>
            </div>
                <div className="relative bg-black border border-white border-solid px-10 py-40 my-10 mx-59 shadow-[0_0_50px_white]"></div>
            <div>

            {/* line */}
            <div className="border-b border-b-neutral-800 border-solid text-white"></div>

            {/* third section */}
            <div className="text-white text-2xl p-20 flex flex-row justify-between">
                <p>Connect</p>
                <p>Build</p>
                <p>Manage</p>
                <p>Flourish</p>
            </div>


            </div>
        </div>
    )
}

export default Hero