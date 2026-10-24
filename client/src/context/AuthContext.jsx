import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

const TOKEN_KEY = 'token'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  // The ids of the stamps this collector owns. Kept here so every stamp card
  // can show the correct "already collected" state without each one fetching
  // the whole collection on its own.
  const [collectionIds, setCollectionIds] = useState(() => new Set())

  const refreshUnreadCount = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setUnreadCount(0)
      return
    }
    try {
      const { data } = await api.get('/notifications/unread-count')
      setUnreadCount(data.count || 0)
    } catch {
      setUnreadCount(0)
    }
  }, [])

  const refreshCollection = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setCollectionIds(new Set())
      return new Set()
    }
    try {
      const { data } = await api.get('/collection')
      const ids = new Set(
        data.map((item) => item.stamp?._id).filter(Boolean)
      )
      setCollectionIds(ids)
      return ids
    } catch {
      setCollectionIds(new Set())
      return new Set()
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data)
      refreshUnreadCount()
      refreshCollection()
      return data
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      delete api.defaults.headers.common['Authorization']
      return null
    } finally {
      setLoading(false)
    }
  }

  /**
   * Adds or removes a stamp from the collector's collection and keeps the
   * shared id set in step. Returns the server's message so the caller can
   * show it - a silent failure is what made the heart button look dead.
   */
  const toggleCollection = async (stampId) => {
    const owned = collectionIds.has(stampId)

    // Optimistic: the button reacts immediately, and is rolled back if the
    // server disagrees.
    setCollectionIds((prev) => {
      const next = new Set(prev)
      if (owned) next.delete(stampId)
      else next.add(stampId)
      return next
    })

    try {
      if (owned) {
        await api.delete(`/collection/${stampId}`)
        return { ok: true, added: false, message: 'Removed from your collection' }
      }
      await api.post('/collection', { stampId })
      return { ok: true, added: true, message: 'Added to your collection' }
    } catch (err) {
      setCollectionIds((prev) => {
        const next = new Set(prev)
        if (owned) next.add(stampId)
        else next.delete(stampId)
        return next
      })
      return {
        ok: false,
        added: owned,
        message: err.response?.data?.message || 'Something went wrong',
      }
    }
  }

  const login = async (identifier, password, remember = true) => {
    const { data } = await api.post('/auth/login', {
      email: identifier,
      password,
      remember,
    })
    localStorage.setItem(TOKEN_KEY, data.token)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setUser(data)
    refreshUnreadCount()
    refreshCollection()
    return data
  }

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData)
    localStorage.setItem(TOKEN_KEY, data.token)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setUser(data)
    refreshUnreadCount()
    refreshCollection()
    return data
  }

  /** Used by the Google sign-in callback, which arrives with a token. */
  const loginWithToken = async (token) => {
    localStorage.setItem(TOKEN_KEY, token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    const signedIn = await fetchUser()
    if (!signedIn) {
      logout()
      throw new Error('Could not sign in with that token')
    }
    return signedIn
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    delete api.defaults.headers.common['Authorization']
    setUser(null)
    setUnreadCount(0)
    setCollectionIds(new Set())
  }

  const updateUser = (data) => setUser(data)

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        unreadCount,
        refreshUnreadCount,
        collectionIds,
        refreshCollection,
        toggleCollection,
        loginWithToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
