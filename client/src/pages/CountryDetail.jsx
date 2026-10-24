import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import StampCard from '../components/StampCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function CountryDetail() {
  const { iso2 } = useParams()
  const [country, setCountry] = useState(null)
  const [stamps, setStamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api
      .get(`/countries/${iso2}`)
      .then(({ data }) => {
        if (!active) return
        setCountry(data)
        setStamps(data.stamps || [])
      })
      .catch(() => active && setError('Could not load this country'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [iso2])

  if (loading) return <LoadingSpinner fullScreen />

  if (error || !country) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <span className="text-4xl block mb-3">📭</span>
        <h1 className="font-display text-2xl font-bold text-postal-blue">Country not found</h1>
        <Link to="/countries" className="inline-block mt-5 text-postal-red font-semibold hover:underline">
          ← Back to all countries
        </Link>
      </div>
    )
  }

  const maxYearCount = Math.max(1, ...country.timeline.map((t) => t.count))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/countries" className="text-sm text-gray-400 hover:text-postal-red transition">
        ← All countries
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mt-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-6">
          <span className="text-7xl leading-none">{country.flag}</span>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl font-bold text-postal-blue">{country.name}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {country.iso2} / {country.iso3} · {country.region} · {country.currency}
            </p>
            {country.description && (
              <p className="text-gray-600 text-sm mt-3 leading-relaxed">{country.description}</p>
            )}

            <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-gray-100">
              <div>
                <p className="font-display text-2xl font-bold text-postal-red">{country.stampCount}</p>
                <p className="text-xs text-gray-400">Stamps</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-postal-red">
                  {country.firstIssueYear || '—'}
                </p>
                <p className="text-xs text-gray-400">First issue</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-postal-red">
                  {country.themes.length}
                </p>
                <p className="text-xs text-gray-400">Themes</p>
              </div>
            </div>
          </div>
        </div>

        {country.themes.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-postal-blue mb-3">Popular themes</h3>
            <div className="flex flex-wrap gap-2">
              {country.themes.map((t) => (
                <Link
                  key={t.theme}
                  to={`/explore?country=${country.iso2}&theme=${encodeURIComponent(t.theme)}`}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-postal-cream text-postal-blue hover:bg-postal-red hover:text-white transition"
                >
                  {t.theme} · {t.count}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {country.timeline.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="font-display text-lg font-bold text-postal-blue mb-4">Browse the timeline</h2>
          <div className="space-y-2">
            {country.timeline.map((t) => (
              <Link
                key={t.year}
                to={`/explore?country=${country.iso2}&year=${t.year}`}
                className="flex items-center gap-4 group"
              >
                <span className="w-14 text-right font-display font-bold text-sm text-gray-600 group-hover:text-postal-red transition">
                  {t.year}
                </span>
                <span className="flex-1 h-6 bg-gray-50 rounded overflow-hidden">
                  <span
                    className="block h-full bg-postal-cream group-hover:bg-postal-red/70 transition-all"
                    style={{ width: `${(t.count / maxYearCount) * 100}%` }}
                  />
                </span>
                <span className="w-8 text-xs text-gray-400">{t.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-display text-xl font-bold text-postal-blue mb-4">
        Stamps of {country.name}
      </h2>
      {stamps.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500 text-sm">No stamps in the catalogue for this country yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {stamps.map((s) => (
            <StampCard key={s._id} stamp={s} />
          ))}
        </div>
      )}
    </div>
  )
}
