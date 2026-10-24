import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const Ring = ({ percent }) => {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#f1f0ea" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={percent === 100 ? '#22c55e' : percent >= 50 ? '#1e3a8a' : '#dc2626'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-postal-blue">
        {percent}%
      </span>
    </div>
  )
}

const COMPLETE = 'bg-green-50 border-green-200'
const PARTIAL = 'border-gray-100'

export default function Passport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: d } = await api.get('/collection/passport')
        if (active) setData(d)
      } catch {
        if (active) setError('Could not load your passport.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  if (loading) return <LoadingSpinner fullScreen />
  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-50 text-red-600 rounded-xl p-6 text-sm">{error}</div>
      </div>
    )
  }

  const { summary, pages } = data
  const started = pages.filter((p) => p.total > 0)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-postal-blue">Stamp Passport</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your progress through every country in the catalogue, least complete first.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/collection/gaps"
            className="px-4 py-2 rounded-full bg-postal-blue text-white text-sm font-semibold hover:bg-blue-800 transition"
          >
            Collection Gaps
          </Link>
          <Link
            to="/collection"
            className="px-4 py-2 rounded-full bg-white border border-postal-blue text-postal-blue text-sm font-semibold hover:bg-blue-50 transition"
          >
            My Collection
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Overall', value: `${summary.percent}%` },
          { label: 'Stamps', value: `${summary.stampsOwned}/${summary.catalogueStamps}` },
          { label: 'Countries started', value: `${summary.countriesStarted}/${summary.countriesInCatalogue}` },
          { label: 'Countries complete', value: summary.countriesCompleted },
          { label: 'Countries in catalogue', value: summary.countriesInCatalogue },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center"
          >
            <p className="font-display text-xl font-bold text-postal-blue">{s.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {started.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <span className="text-3xl block mb-3">🛂</span>
          <h3 className="font-semibold text-gray-700">Your passport is blank</h3>
          <p className="text-gray-400 text-sm mt-1">
            Add your first stamp and your passport starts filling in.
          </p>
          <Link
            to="/explore"
            className="inline-block mt-5 bg-postal-red text-white px-6 py-2.5 rounded-full font-semibold hover:bg-red-700 transition"
          >
            Explore Stamps
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {started.map((p) => (
            <div
              key={p.country._id}
              className={`bg-white rounded-2xl border p-5 sm:p-6 ${
                p.completed ? COMPLETE : PARTIAL
              }`}
            >
              <div className="flex items-center gap-5">
                <Ring percent={p.percent} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl leading-none">{p.country.flag}</span>
                    <h3 className="font-display text-lg font-bold text-gray-800">
                      {p.country.name}
                    </h3>
                    {p.completed && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                        Complete
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {[p.country.region, p.country.iso3, p.country.currency]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-semibold text-postal-blue">{p.owned}</span> of{' '}
                    {p.total} stamps
                    {p.missing > 0 && (
                      <span className="text-gray-400"> · {p.missing} missing</span>
                    )}
                    {p.seriesTotal > 0 && (
                      <span className="text-gray-400">
                        {' '}
                        · {p.seriesHeld}/{p.seriesTotal} series
                      </span>
                    )}
                  </p>
                  {(p.earliest || p.latest) && (
                    <p className="text-xs text-gray-400 mt-1">
                      Your holdings span {p.earliest}
                      {p.latest && p.latest !== p.earliest ? ` – ${p.latest}` : ''}
                    </p>
                  )}
                </div>

                <Link
                  to={`/explore?country=${p.country.iso2}`}
                  className="hidden sm:inline-block shrink-0 text-sm text-postal-red font-semibold hover:underline"
                >
                  Browse →
                </Link>
              </div>

              {p.byCategory.length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
                    Category coverage
                  </p>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    {p.byCategory.map((c) => (
                      <div key={c.category} className="flex items-center gap-2.5 text-xs">
                        <span className="w-5 shrink-0">{c.icon}</span>
                        <span className="text-gray-600 w-24 truncate">{c.category}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-postal-blue rounded-full"
                            style={{
                              width: `${c.total ? (c.owned / c.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-gray-400 w-10 text-right shrink-0">
                          {c.owned}/{c.total}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {p.topThemes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.topThemes.map((t) => (
                    <span
                      key={t.theme}
                      className="text-xs bg-blue-50 text-postal-blue px-2.5 py-1 rounded-full"
                    >
                      {t.theme} {t.owned}/{t.total}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}