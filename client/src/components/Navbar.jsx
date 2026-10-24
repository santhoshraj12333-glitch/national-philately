import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/explore', label: 'Explore' },
  { to: '/home', label: 'Home', auth: true },
  { to: '/community', label: 'Community', auth: true },
  { to: '/collection', label: 'Collection', auth: true },
]

export default function Navbar() {
  const { user, logout, unreadCount, refreshUnreadCount } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [mobileOpen, setMobileOpen] = useState(false)
  const unread = unreadCount || 0

  useEffect(() => {
    if (user) refreshUnreadCount()
  }, [user, pathname, refreshUnreadCount])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const visible = links.filter((l) => !l.auth || user)
  const isActive = (to) => pathname === to

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">📮</span>
            <span className="font-display font-bold text-lg sm:text-xl text-postal-blue hidden sm:block">
              National Philately
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {visible.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-2 rounded-full text-sm font-medium transition ${
                  isActive(l.to) ? 'bg-postal-cream text-postal-red' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link to="/admin" className="px-3 py-2 rounded-full text-sm font-semibold text-postal-gold hover:bg-amber-50 transition">
                    Admin
                  </Link>
                )}
                <Link to="/notifications" className="relative p-2 hover:bg-gray-100 rounded-full transition" aria-label="Notifications">
                  <span className="text-xl">🔔</span>
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-postal-red text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {unread}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="flex items-center gap-2 hover:bg-gray-100 rounded-full px-2 py-1 transition">
                  <span className="w-8 h-8 rounded-full bg-postal-blue text-white flex items-center justify-center font-bold text-sm">
                    {user.name?.[0]}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{user.name?.split(' ')[0]}</span>
                </Link>
                <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-postal-red transition px-2">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-postal-red transition">
                  Login
                </Link>
                <Link to="/register" className="bg-postal-red text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-700 transition">
                  Join Free
                </Link>
              </>
            )}
          </div>

          <button className="lg:hidden p-2 -mr-2" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
            <span className="text-2xl">{mobileOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 max-h-[80vh] overflow-y-auto">
          {visible.map((l) => (
            <Link key={l.to} to={l.to} className="block py-2.5 px-3 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
              {l.label}
            </Link>
          ))}
          {user && (
            <>
              <Link to="/notifications" className="block py-2.5 px-3 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                Notifications {unread > 0 && <span className="text-postal-red">({unread})</span>}
              </Link>
              <Link to="/profile" className="block py-2.5 px-3 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                Profile
              </Link>
              <Link to="/settings" className="block py-2.5 px-3 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                Settings
              </Link>
              <Link to="/community/saved" className="block py-2.5 px-3 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                Saved Posts
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="block py-2.5 px-3 rounded-lg text-postal-gold font-semibold hover:bg-gray-50">
                  Admin Dashboard
                </Link>
              )}
              <button onClick={handleLogout} className="block w-full text-left py-2.5 px-3 rounded-lg text-postal-red font-medium hover:bg-red-50">
                Logout
              </button>
            </>
          )}
          {!user && (
            <div className="pt-2 space-y-1">
              <Link to="/login" className="block py-2.5 px-3 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                Login
              </Link>
              <Link to="/register" className="block py-2.5 px-3 rounded-lg text-postal-red font-semibold hover:bg-red-50">
                Join Free
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}