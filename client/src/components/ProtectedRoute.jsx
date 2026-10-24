import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Sends signed-out visitors to the login page and remembers where they were
 * going, so they land there again once they sign in instead of on a generic
 * home page.
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/home" replace />
  }

  return children
}
