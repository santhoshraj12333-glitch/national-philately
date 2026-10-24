import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import CollectionGrid from '../components/CollectionGrid'
import SearchBar from '../components/SearchBar'
import LoadingSpinner from '../components/LoadingSpinner'
import { CATEGORY_NAMES, THEME_NAMES } from '../constants'
import { countryName } from '../utils/stamp'

export default function Collection() {
  const { toggleCollection } = useAuth()
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [theme, setTheme] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get('/collection')
        if (active) setItems(data)
      } catch {
        if (active) setError('Could not load your collection.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const remove = async (stampId) => {
    const snapshot = items
    setItems((prev) => prev.filter((i) => i.stamp?._id !== stampId))
    // Removing goes through the shared collection state so every other
    // screen (stamp cards, explore grid) updates at the same time.
    const result = await toggleCollection(stampId)
    if (!result.ok) setItems(snapshot)
  }

  const filtered = items.filter((i) => {
    const s = i.stamp
    if (!s) return false
    const q = search.toLowerCase()
    const matchesSearch =
      !search ||
      s.name?.toLowerCase().includes(q) ||
      s.person?.toLowerCase().includes(q) ||
      countryName(s).toLowerCase().includes(q) ||
      s.theme?.toLowerCase().includes(q)
    const matchesCategory = !category || s.category === category
    const matchesTheme = !theme || s.theme === theme
    return matchesSearch && matchesCategory && matchesTheme
  })

  const usedCategories = CATEGORY_NAMES.filter((c) => items.some((i) => i.stamp?.category === c))
  const usedThemes = THEME_NAMES.filter((t) => items.some((i) => i.stamp?.theme === t))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-3xl font-bold text-postal-blue">My Collection</h1>
        <div className="flex gap-2">
          <Link
            to="/collection/passport"
            className="px-4 py-2 rounded-full bg-white border border-postal-blue text-postal-blue text-sm font-semibold hover:bg-blue-50 transition"
          >
            Passport
          </Link>
          <Link
            to="/collection/gaps"
            className="px-4 py-2 rounded-full bg-postal-blue text-white text-sm font-semibold hover:bg-blue-800 transition"
          >
            Collection Gaps
          </Link>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner fullScreen />
      ) : error ? (
        <div className="bg-red-50 text-red-600 rounded-xl p-6 text-center text-sm">{error}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <span className="text-3xl block mb-3">📮</span>
          <h3 className="font-semibold text-gray-700">Your collection is waiting for its first stamp 📮</h3>
          <p className="text-gray-400 text-sm mt-1">Explore stamps and start collecting.</p>
          <Link
            to="/explore"
            className="inline-block mt-5 bg-postal-red text-white px-6 py-2.5 rounded-full font-semibold hover:bg-red-700 transition"
          >
            Explore Stamps
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your collection..." />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-postal-red transition"
            >
              <option value="">All categories</option>
              {usedCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="border border-gray-200 rounded-full px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-postal-red transition"
            >
              <option value="">All themes</option>
              {usedThemes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <p className="text-gray-500 text-sm">No stamps match your filters.</p>
              <button
                onClick={() => {
                  setSearch('')
                  setCategory('')
                }}
                className="mt-3 text-postal-red text-sm font-semibold hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <CollectionGrid items={filtered} onRemove={remove} />
          )}
        </>
      )}
    </div>
  )
}