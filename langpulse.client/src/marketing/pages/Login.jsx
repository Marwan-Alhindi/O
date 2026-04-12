import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { useState } from "react"

function Login () {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleLogin(e) {
        e.preventDefault()
        setError("")
        setLoading(true)
        try {
            await login(email, password)
            navigate('/app')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="text-white h-screen flex flex-col">

            {/* top line */}
            <div className="text-black w-full">.</div>

            {/* login content */}
            <div className="flex-grow flex items-center justify-center">
                <form onSubmit={handleLogin} className="flex flex-col border border-neutral-800 border-solid p-20 text-white">
                    <p className="text-2xl mb-4">Log in to your account</p>
                    <p className="text-l mb-4 text-neutral-400">
                        New to LangPulse? <span onClick={() => navigate('/getstarted')} className="underline cursor-pointer">Get Started</span>
                    </p>
                    {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}
                    <input
                        className="border border-white border-solid py-4 px-20 mb-4 w-full rounded-sm"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        className="border border-white border-solid py-4 px-20 mb-4 w-full rounded-sm"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-white text-black py-3 mt-2 rounded-full disabled:opacity-50"
                    >
                        {loading ? 'Logging in...' : 'Continue'}
                    </button>
                </form>
            </div>

            {/* bottom line */}
            <div className="text-black w-full">.</div>
        </div>
    )
}

export default Login
