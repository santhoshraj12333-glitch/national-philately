import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const cards = [
  { to: '/admin/users', label: 'Manage Users', icon: '👥', desc: 'View and deactivate accounts' },
  { to: '/admin/stamps', label: 'Manage Stamps', icon: '📮', desc: 'Add, edit and delete stamps' },
  { to: '/admin/posts', label: 'Manage Posts', icon: '💬', desc: 'Review and remove posts' },
]

export default function Admin() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api
      .get('/admin/stats')
      .then(({ data }) => active && setStats(data))
      .catch(() => active && setError('Could not load statistics'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  if (loading) return <LoadingSpinner fullScreen />

  const tiles = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: '👥' },
    { label: 'Total Stamps', value: stats?.totalStamps ?? 0, icon: '📮' },
    { label: 'Total Posts', value: stats?.totalPosts ?? 0, icon: '💬' },
    { label: 'Total Collections', value: stats?.totalCollections ?? 0, icon: '📦' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-bold text-postal-blue">Admin Dashboard</h1>
      <p className="text-gray-500 mt-1 mb-8">Platform overview and moderation tools.</p>

      {error && <div className="bg-red-50 text-red-600 rounded-xl p-6 text-center text-sm mb-6">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
            <span className="text-2xl block mb-2">{t.icon}</span>
            <p className="font-display text-3xl font-bold text-postal-blue">{t.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-postal-red/30 transition"
          >
            <span className="text-3xl block mb-3">{c.icon}</span>
            <h2 className="font-display text-lg font-bold text-postal-blue">{c.label}</h2>
            <p className="text-sm text-gray-500 mt-1">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}