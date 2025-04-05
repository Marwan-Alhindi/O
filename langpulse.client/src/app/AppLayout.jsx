import Chat from "./components/Chat"
function AppLayout () {
    return (
        <div className="bg-neutral-800 h-screen">
            <div className="flex flex-row h-screen">
                {/* sidebar */}
                <div className="ml-60 bg-neutral-700">
                    {/* Sidebar content here */}
                </div>

                <Chat />
            </div>
        </div>
    )
}

export default AppLayout