import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const ProgressBar = ({ percent, tone = 'blue' }) => (
  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full transition-all ${
        tone === 'green'
          ? 'bg-green-500'
          : percent >= 50
            ? 'bg-postal-blue'
            : 'bg-postal-red'
      }`}
      style={{ width: `${percent}%` }}
    />
  </div>
)

export default function CollectionGaps() {
  const [data, setData] = useState(null)
  const [view, setView] = useState('series')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: d } = await api.get('/collection/gaps')
        if (active) setData(d)
      } catch {
        if (active) setError('Could not load your collection gaps.')
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

  const { totals, countries, series } = data
  const list = view === 'series' ? series : countries
  const complete = countries.filter((c) => c.missingCount === 0)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-postal-blue">Collection Gaps</h1>
          <p className="text-sm text-gray-500 mt-1">
            What's missing from your collection, so you know what to hunt for next.
          </p>
        </div>
        <Link
          to="/collection"
          className="text-sm text-postal-blue font-semibold hover:underline"
        >
          ← Back to collection
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Catalogue', value: totals.catalogue },
          { label: 'Collected', value: totals.owned },
          { label: 'Missing', value: totals.missing },
          { label: 'Countries complete', value: `${complete.length}/${countries.length}` },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center"
          >
            <p className="font-display text-2xl font-bold text-postal-blue">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">
            {totals.owned} of {totals.catalogue} stamps collected
          </p>
          <p className="text-sm font-bold text-postal-blue">{totals.percent}%</p>
        </div>
        <ProgressBar percent={totals.percent} />
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'series', label: `By Series (${series.length})` },
          { key: 'country', label: `By Country (${countries.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition ${
              view === t.key
                ? 'border-postal-red text-postal-red'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <span className="text-3xl block mb-3">🏆</span>
          <h3 className="font-semibold text-gray-700">Nothing missing. Really.</h3>
          <p className="text-gray-400 text-sm mt-1">
            You hold every {view === 'series' ? 'series' : 'country'} in the catalogue.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((entry) => {
            const isSeries = view === 'series'
            const title = isSeries ? entry.series.name : entry.country.name
            const href = isSeries
              ? `/explore?series=${entry.series._id}`
              : `/explore?country=${entry.country.iso2}`

            return (
              <div
                key={isSeries ? entry.series._id : entry.country._id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      {isSeries
                        ? '📦'
                        : entry.country.flag}
                      <span className="truncate">{title}</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isSeries
                        ? [
                            entry.series.country?.name,
                            entry.series.issuedFrom,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : entry.country.region}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-postal-blue">
                      {entry.owned}/{entry.total}
                    </p>
                    <p className="text-xs text-gray-400">
                      {entry.missingCount} missing · {entry.percent}%
                    </p>
                  </div>
                </div>

                <ProgressBar percent={entry.percent} tone={entry.missingCount === 0 ? 'green' : 'blue'} />

                <div className="mt-4 space-y-2">
                  {entry.missing.map((s) => (
                    <Link
                      key={s._id}
                      to={`/stamp/${s._id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3.5 py-2.5 hover:border-postal-red hover:bg-red-50/40 transition"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-700 truncate">
                          {s.name}
                        </span>
                        <span className="block text-xs text-gray-400">
                          {[s.year, s.denomination, s.series].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs bg-postal-cream text-postal-blue px-2 py-0.5 rounded-full">
                          {s.category}
                        </span>
                        <span className="text-xs bg-blue-50 text-postal-blue px-2 py-0.5 rounded-full">
                          {s.theme}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>

                <Link
                  to={href}
                  className="inline-block mt-4 text-sm text-postal-red font-semibold hover:underline"
                >
                  Browse {isSeries ? title : entry.country.name} in Explore →
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}