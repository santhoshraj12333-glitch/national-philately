import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const OAUTH_ERRORS = {
  oauth_state: 'That sign-in attempt expired. Please try again.',
  oauth_no_code: 'Google did not return an authorisation code. Please try again.',
  oauth_failed: 'Google sign-in could not be completed. Please try again.',
  account_deactivated: 'That account has been deactivated.',
}

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleAvailable, setGoogleAvailable] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Where the visitor was heading before they were asked to sign in.
  const from = location.state?.from

  useEffect(() => {
    const code = new URLSearchParams(location.search).get('error')
    if (code && OAUTH_ERRORS[code]) setError(OAUTH_ERRORS[code])
  }, [location.search])

  // The Google button only appears when the server actually has credentials
  // configured, so a dead button is never shown.
  useEffect(() => {
    let active = true
    api
      .get('/auth/providers')
      .then(({ data }) => {
        if (active) setGoogleAvailable(Boolean(data.google))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(identifier, password, remember)
      if (from) navigate(from, { replace: true })
      else if (user.role === 'admin') navigate('/admin')
      else navigate('/home')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">📮</span>
          <h1 className="font-display text-3xl font-bold text-postal-blue">Welcome Back</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email or username
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-postal-red transition"
              placeholder="arjun or you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-postal-red transition"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-postal-red focus:ring-postal-red"
              />
              Keep me signed in
            </label>
            <span className="text-xs text-gray-400">
              {remember ? 'For 30 days' : 'This session only'}
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-postal-red text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {googleAvailable && (
            <>
              <div className="flex items-center gap-3 pt-1">
                <span className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">or</span>
                <span className="flex-1 h-px bg-gray-200" />
              </div>
              <a
                href="/api/auth/google"
                className="w-full flex items-center justify-center gap-2.5 border border-gray-200 rounded-lg py-2.5 font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.8-2.1 5.2-4.4 6.8v5.6h7.1c4.2-3.8 6.6-9.5 6.6-16.6z" />
                  <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.6c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.4v5.8C7.9 41.1 15.4 46 24 46z" />
                  <path fill="#FBBC05" d="M11.7 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.8H4.4C2.8 17.1 2 20.4 2 24s.8 6.9 2.4 9.9l7.3-5.8z" />
                  <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.4 2 7.9 6.9 4.4 14.1l7.3 5.8c1.7-5.2 6.6-9.1 12.3-9.1z" />
                </svg>
                Continue with Google
              </a>
            </>
          )}
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{' '}
          <Link to="/register" state={from ? { from } : undefined} className="text-postal-red font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
