import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

export function LoginForm() {
  const { login, signup, error } = useAuth()
  const [isSignup, setIsSignup] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (isSignup) {
        await signup(username, password, displayName || username)
      } else {
        await login(username, password)
      }
    } catch {
      // Error is handled by auth context
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-center text-yellow-400">
          {isSignup ? 'Create Account' : 'Log In'}
        </h2>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-white/40 focus:border-yellow-400 focus:outline-none"
          required
          minLength={3}
          maxLength={20}
        />

        {isSignup && (
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-white/40 focus:border-yellow-400 focus:outline-none"
          />
        )}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-white/40 focus:border-yellow-400 focus:outline-none"
          required
          minLength={6}
        />

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-900 font-bold rounded-lg hover:-translate-y-0.5 hover:shadow-lg hover:shadow-yellow-400/40 transition-all disabled:opacity-50"
        >
          {submitting ? 'Loading...' : isSignup ? 'Sign Up' : 'Log In'}
        </button>

        <button
          type="button"
          onClick={() => setIsSignup(!isSignup)}
          className="text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </form>
    </div>
  )
}
