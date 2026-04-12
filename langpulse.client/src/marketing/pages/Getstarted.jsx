import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { useState } from "react"

function Getstarted () {
    const navigate = useNavigate()
    const { register } = useAuth()
    const [email, setEmail] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleRegister(e) {
        e.preventDefault()
        setError("")

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setLoading(true)
        try {
            await register(email, firstName, lastName, password)
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

            {/* form */}
            <div className="flex-grow flex items-center justify-center">
                <div className="flex flex-col border border-neutral-800 border-solid p-20 text-white">
                    <p className="text-2xl mb-4">Start with free LLM models!</p>
                    <p className="text-l mb-4 text-neutral-400">You can subscribe then for more powerful models</p>
                    <p className="text-l mb-4 text-neutral-400">Please fill below form to register a new account</p>
                    {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}
                    <form className="space-y-4 mt-2" onSubmit={handleRegister}>
                        <input
                            className="border border-white border-solid py-4 px-20 mb-4 w-full rounded-sm"
                            type="email"
                            placeholder="example@app.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <div className="flex gap-4">
                            <input
                                className="border border-white border-solid py-4 px-4 w-1/2 rounded-sm"
                                type="text"
                                placeholder="First Name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                            />
                            <input
                                className="border border-white border-solid py-4 px-4 w-1/2 rounded-sm"
                                type="text"
                                placeholder="Last Name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                            />
                        </div>
                        <input
                            className="border border-white border-solid py-4 px-20 mb-4 w-full rounded-sm"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <input
                            className="border border-white border-solid py-4 px-20 mb-4 w-full rounded-sm"
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-white text-black py-3 mt-2 w-full rounded-full disabled:opacity-50"
                        >
                            {loading ? 'Creating account...' : 'Join'}
                        </button>
                    </form>
                    <p className="text-neutral-400 text-sm mt-4 text-center">
                        Already have an account? <span onClick={() => navigate('/login')} className="underline cursor-pointer text-white">Log in</span>
                    </p>
                </div>
            </div>

            {/* bottom line */}
            <div className="text-black w-full">.</div>
        </div>
    )
}

export default Getstarted
