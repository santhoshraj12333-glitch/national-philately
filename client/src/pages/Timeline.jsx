import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import StampCard from '../components/StampCard'
import LoadingSpinner from '../components/LoadingSpinner'

const ERAS = [
  { name: 'Colonial era', test: (y) => y < 1947 },
  { name: 'Early republic', test: (y) => y >= 1947 && y < 1980 },
  { name: 'Modern era', test: (y) => y >= 1980 && y < 2000 },
  { name: 'Digital age', test: (y) => y >= 2000 },
]

export default function Timeline() {
  const [stamps, setStamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeYear, setActiveYear] = useState('')

  useEffect(() => {
    let active = true
    api
      .get('/stamps?sort=oldest')
      .then(({ data }) => active && setStamps(data))
      .catch(() => active && setError('Could not load the timeline'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  // Fold flat stamps into rows of (year, stamps).
  const rows = useMemo(() => {
    const map = new Map()
    stamps.forEach((s) => {
      if (!map.has(s.year)) map.set(s.year, [])
      map.get(s.year).push(s)
    })
    return [...map.entries()].sort((a, b) => b[0] - a[0])
  }, [stamps])

  const eras = useMemo(
    () =>
      ERAS.map((e) => ({
        ...e,
        years: rows.filter(([y]) => e.test(y)).map(([y, list]) => ({ year: y, count: list.length })),
      })).filter((e) => e.years.length > 0),
    [rows]
  )

  const visible = activeYear ? stamps.filter((s) => s.year === Number(activeYear)) : stamps

  if (loading) return <LoadingSpinner fullScreen />

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-bold text-postal-blue mb-1">Philately Timeline</h1>
      <p className="text-gray-500 mb-6">
        {stamps.length} stamps across {rows.length} years — from {rows[rows.length - 1]?.[0]} to{' '}
        {rows[0]?.[0]}.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl p-6 text-center text-sm mb-6">{error}</div>
      )}

      {/* Era strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {eras.map((era) => (
          <div key={era.name} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-postal-red uppercase tracking-wide">{era.name}</p>
            <p className="font-display text-xl font-bold text-postal-blue mt-1">
              {era.years.reduce((n, y) => n + y.count, 0)}{' '}
              <span className="text-xs font-normal text-gray-400">stamps</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {era.years[era.years.length - 1].year}–{era.years[0].year}
            </p>
          </div>
        ))}
      </div>

      {/* Year rail */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
        <h2 className="font-display text-lg font-bold text-postal-blue mb-3">Jump to a year</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveYear('')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              activeYear === ''
                ? 'bg-postal-red text-white'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            All years
          </button>
          {rows.map(([year, list]) => (
            <button
              key={year}
              onClick={() => setActiveYear(String(year))}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                activeYear === String(year)
                  ? 'bg-postal-red text-white'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {year} <span className="opacity-60">{list.length}</span>
            </button>
          ))}
        </div>
      </div>

      <h2 className="font-display text-xl font-bold text-postal-blue mb-4">
        {activeYear ? `Stamps from ${activeYear}` : 'Newest first'}
      </h2>
      {visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500 text-sm">No stamps to show.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((s) => (
            <StampCard key={s._id} stamp={s} />
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link to="/explore" className="text-postal-red text-sm font-semibold hover:underline">
          Use the advanced filters →
        </Link>
      </div>
    </div>
  )
}