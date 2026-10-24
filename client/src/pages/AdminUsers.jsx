import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function AdminUsers() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api
      .get('/admin/users')
      .then(({ data }) => active && setUsers(data))
      .catch(() => active && setError('Could not load users'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const toggle = async (target) => {
    const snapshot = users
    setUsers((prev) => prev.map((u) => (u._id === target._id ? { ...u, isActive: !u.isActive } : u)))
    try {
      await api.put(`/admin/users/${target._id}/toggle`)
    } catch (err) {
      setUsers(snapshot)
      setError(err.response?.data?.message || 'Could not update user')
    }
  }

  if (loading) return <LoadingSpinner fullScreen />

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/admin" className="text-sm text-gray-500 hover:text-postal-red transition">
        ← Admin Dashboard
      </Link>
      <h1 className="font-display text-3xl font-bold text-postal-blue mt-4 mb-6">Manage Users</h1>

      {error && <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">Collector</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-postal-blue text-white flex items-center justify-center font-bold text-xs">
                        {u.name?.[0]}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-400">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        u.role === 'admin' ? 'bg-postal-red/10 text-postal-red' : 'bg-postal-blue/10 text-postal-blue'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${u.isActive ? 'text-green-600' : 'text-red-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.role === 'admin' ? (
                      <span className="text-xs text-gray-300">Protected</span>
                    ) : (
                      <button
                        onClick={() => toggle(u)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                          u.isActive
                            ? 'text-postal-red border border-postal-red hover:bg-red-50'
                            : 'text-green-600 border border-green-600 hover:bg-green-50'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}