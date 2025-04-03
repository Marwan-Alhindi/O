function Navigation () {
    return (
        <div>
            <div className="flex flex-row justify-between mr-20">
                <div className="flex flex-row gap-x-80">
                    <img></img>
                    <p  className="text-white">LangPulse</p>
                    <button className="text-white">Pricing</button>
                    <button className="text-white">More</button>
                </div>
                <div className="flex flex-row gap-x-10">
                    <button className="text-white">Log in</button>
                    <button className="text-white">Get Started</button>
                </div>
            </div>
        </div>
    )
}

export default Navigation