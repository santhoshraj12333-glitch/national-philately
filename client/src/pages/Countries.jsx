import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Countries() {
  const [countries, setCountries] = useState([])
  const [regions, setRegions] = useState([])
  const [region, setRegion] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([api.get('/countries'), api.get('/countries/regions')])
      .then(([c, r]) => {
        if (!active) return
        setCountries(c.data)
        setRegions(r.data)
      })
      .catch(() => active && setError('Could not load countries'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return countries
      .filter((c) => !region || c.region === region)
      .filter((c) => !q || c.name.toLowerCase().includes(q))
  }, [countries, region, search])

  const grouped = useMemo(() => {
    const map = new Map()
    visible.forEach((c) => {
      if (!map.has(c.region)) map.set(c.region, [])
      map.get(c.region).push(c)
    })
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [visible])

  if (loading) return <LoadingSpinner fullScreen />

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-bold text-postal-blue mb-1">Country Explorer</h1>
      <p className="text-gray-500 mb-6">
        Browse the catalogue by country — {countries.length} countries and counting.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl p-6 text-center text-sm mb-6">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search country..."
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-postal-red transition"
        />
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="border border-gray-200 rounded-full px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-postal-red transition"
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <span className="text-3xl block mb-3">🌍</span>
          <p className="text-gray-500 text-sm">No countries match your search.</p>
        </div>
      ) : (
        grouped.map(([regionName, list]) => (
          <div key={regionName} className="mb-8">
            <h2 className="font-display text-lg font-bold text-postal-blue mb-3">{regionName}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((c) => (
                <Link
                  key={c._id}
                  to={`/countries/${c.iso2}`}
                  className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-postal-red/30 transition"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-4xl leading-none">{c.flag}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-800 truncate">{c.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {c.iso3} · {c.currency}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-display text-xl font-bold text-postal-red">{c.stampCount}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">stamps</p>
                    </div>
                  </div>
                  {c.firstIssueYear && (
                    <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50">
                      First issue · <span className="font-semibold">{c.firstIssueYear}</span>
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
