import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

/**
 * Landing page for the Google sign-in redirect. The server sends the visitor
 * back here with a short-lived token, which is swapped for a real session.
 */
export default function AuthCallback() {
  const [params] = useSearchParams()
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const token = params.get('token')
    const oauthError = params.get('error')

    if (oauthError) {
      navigate(`/login?error=${oauthError}`, { replace: true })
      return
    }

    if (!token) {
      navigate('/login?error=oauth_failed', { replace: true })
      return
    }

    let active = true
    loginWithToken(token)
      .then((user) => {
        if (!active) return
        navigate(user?.role === 'admin' ? '/admin' : '/home', { replace: true })
      })
      .catch(() => {
        if (!active) return
        setFailed(true)
        setTimeout(() => navigate('/login?error=oauth_failed', { replace: true }), 1200)
      })

    return () => {
      active = false
    }
  }, [params, loginWithToken, navigate])

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      {failed ? (
        <p className="text-red-600 font-medium">That sign-in could not be completed.</p>
      ) : (
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-500 mt-4">Finishing your sign-in...</p>
        </div>
      )}
    </div>
  )
}
