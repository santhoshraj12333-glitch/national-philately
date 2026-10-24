import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import StampCard from '../components/StampCard'
import CategoryCard from '../components/CategoryCard'
import SearchBar from '../components/SearchBar'
import LoadingSpinner from '../components/LoadingSpinner'
import LoadMore from '../components/LoadMore'
import { CATEGORIES, THEME_NAMES, SORT_OPTIONS, buildDecades } from '../constants'

const EMPTY = {
  search: '',
  country: '',
  year: '',
  fromYear: '',
  toYear: '',
  decade: '',
  series: '',
  category: '',
  theme: '',
  sort: 'newest',
}

// `year`, `decade` and `fromYear`/`toYear` all constrain the same field, so
// letting them coexist would produce contradictory Mongo operators and a
// confusing empty result set. Only one year mode is kept active at a time.
const exclusiveYear = (patch) => {
  const next = { ...patch }
  if (next.year) {
    next.decade = ''
    next.fromYear = ''
    next.toYear = ''
  } else if (next.decade) {
    next.year = ''
    next.fromYear = ''
    next.toYear = ''
  } else {
    if (next.fromYear !== undefined || next.toYear !== undefined) {
      next.year = ''
      next.decade = ''
    }
  }
  return next
}

const fromParams = (params) => ({
  ...EMPTY,
  sort: 'newest',
  ...Object.fromEntries(
    Object.keys(EMPTY)
      .filter((k) => k !== 'sort' && params.get(k))
      .map((k) => [k, params.get(k)])
  ),
})

export default function Explore() {
  const [params, setParams] = useSearchParams()

  const [filters, setFilters] = useState(() => fromParams(params))
  const [seriesList, setSeriesList] = useState([])

  // Re-read state when the URL changes from outside this page (a "view 1947"
  // deep link from a country page, or browser back/forward). Comparing the
  // serialised form keeps our own commitUrl writes from causing a reset.
  const paramKey = params.toString()
  useEffect(() => {
    setFilters((current) => {
      const incoming = fromParams(params)
      const same = JSON.stringify(current) === JSON.stringify(incoming)
      return same ? current : incoming
    })
  }, [paramKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const [stamps, setStamps] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [counts, setCounts] = useState({})
  const [countries, setCountries] = useState([])
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const decades = useMemo(() => buildDecades(years), [years])
  const limit = 24

  // Facets: countries + year range, loaded once.
  useEffect(() => {
    let active = true
    Promise.all([api.get('/countries'), api.get('/stamps/facets')])
      .then(([c, f]) => {
        if (!active) return
        setCountries(c.data)
        setYears(f.data.years)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Series list backs the ?series=<id> deep link from Collection Gaps.
  useEffect(() => {
    let active = true
    api
      .get('/series')
      .then(({ data }) => {
        if (active) setSeriesList(data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Category tile counts come from the unfiltered list so tiles stay stable.
  useEffect(() => {
    let active = true
    api
      .get('/stamps')
      .then(({ data }) => {
        if (!active) return
        const tally = {}
        data.forEach((s) => {
          tally[s.category] = (tally[s.category] || 0) + 1
        })
        setCounts(tally)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const buildQueryString = (f) => {
    const query = new URLSearchParams()
    Object.entries(f).forEach(([k, v]) => {
      if (v && !(k === 'sort' && v === 'newest')) query.set(k, v)
    })
    return query.toString()
  }

  useEffect(() => {
    let active = true
    const run = async () => {
      setLoading(true)
      setError('')
      setPage(1)

      const query = buildQueryString(filters)
      const sep = query ? '&' : ''

      try {
        const { data, headers } = await api.get(`/stamps?${query}${sep}page=1&limit=${limit}`)
        if (!active) return
        setStamps(data)
        setTotal(Number(headers['x-total-count'] ?? data.length))
      } catch {
        if (active) setError('Could not load stamps. Is the server running?')
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [filters])

  const loadMore = async () => {
    if (loadingMore) return
    const next = page + 1
    setLoadingMore(true)
    const query = buildQueryString(filters)
    const sep = query ? '&' : ''
    try {
      const { data } = await api.get(`/stamps?${query}${sep}page=${next}&limit=${limit}`)
      setStamps((prev) => [...prev, ...data])
      setPage(next)
    } catch {
      // The button stays clickable in case of a transient blip.
    } finally {
      setLoadingMore(false)
    }
  }

  const commitUrl = (next) => {
    const p = new URLSearchParams()
    Object.entries(next).forEach(([k, v]) => {
      if (v && !(k === 'sort' && v === 'newest')) p.set(k, v)
    })
    setParams(p, { replace: true })
  }

  const pickCategory = (name) => {
    const next = { ...filters, category: filters.category === name ? '' : name }
    setFilters(next)
    commitUrl(next)
  }

  const apply = (patch) => {
    const next = { ...filters, ...exclusiveYear(patch) }
    setFilters(next)
    commitUrl(next)
  }

  const clearAll = () => {
    setFilters({ ...EMPTY })
    setParams({}, { replace: true })
  }

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v && !(k === 'sort' && v === 'newest')
  ).length

  const select =
    'w-full border border-gray-200 rounded-full px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-postal-red transition'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-bold text-postal-blue mb-1">Explore Stamps</h1>
      <p className="text-gray-500 mb-6">
        Search the catalogue by name, person, theme or country — then narrow by year, category, theme
        and series.
      </p>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-6">
        <SearchBar
          value={filters.search}
          onChange={(e) => apply({ search: e.target.value })}
          placeholder="Search name, person, theme or country..."
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          <select
            value={filters.country}
            onChange={(e) => apply({ country: e.target.value })}
            className={select}
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c._id} value={c.iso2}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>

          <select
            value={filters.decade}
            onChange={(e) => apply({ decade: e.target.value })}
            className={select}
          >
            <option value="">Any decade</option>
            {decades.map((d) => (
              <option key={d} value={d}>
                {d}s
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Exact year"
            value={filters.year}
            onChange={(e) => apply({ year: e.target.value })}
            className={select}
          />
          <input
            type="number"
            placeholder="From year"
            value={filters.fromYear}
            onChange={(e) => apply({ fromYear: e.target.value })}
            className={select}
          />
          <input
            type="number"
            placeholder="To year"
            value={filters.toYear}
            onChange={(e) => apply({ toYear: e.target.value })}
            className={select}
          />

          <select
            value={filters.category}
            onChange={(e) => apply({ category: e.target.value })}
            className={select}
          >
            <option value="">Any category</option>
            {CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filters.theme}
            onChange={(e) => apply({ theme: e.target.value })}
            className={select}
          >
            <option value="">Any theme</option>
            {THEME_NAMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={filters.series}
            onChange={(e) => apply({ series: e.target.value })}
            className={select}
          >
            <option value="">Any series</option>
            {seriesList.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Deep links arrive as ?year= or ?series=; make them visible and removable. */}
        {(filters.year || filters.series) && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Deep link
            </span>
            {filters.year && (
              <button
                onClick={() => apply({ year: '' })}
                className="inline-flex items-center gap-1.5 bg-postal-blue/10 text-postal-blue px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-postal-blue/20 transition"
              >
                Year {filters.year} ✕
              </button>
            )}
            {filters.series && (
              <button
                onClick={() => apply({ series: '' })}
                className="inline-flex items-center gap-1.5 bg-postal-red/10 text-postal-red px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-postal-red/20 transition"
              >
                {seriesList.find((s) => s._id === filters.series)?.name || 'Series'} ✕
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort</label>
          <select
            value={filters.sort}
            onChange={(e) => apply({ sort: e.target.value })}
            className="border border-gray-200 rounded-full px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-postal-red"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="ml-auto text-sm text-postal-red font-semibold hover:underline"
            >
              Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>

      {/* Category tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        {CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.name}
            icon={cat.icon}
            name={cat.name}
            count={counts[cat.name] || 0}
            active={filters.category === cat.name}
            onClick={() => pickCategory(cat.name)}
          />
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="bg-red-50 text-red-600 rounded-xl p-6 text-center text-sm">{error}</div>
      ) : stamps.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <span className="text-3xl block mb-3">📮</span>
          <h3 className="font-semibold text-gray-700">No stamps match your search</h3>
          <p className="text-gray-400 text-sm mt-1">
            Try widening the year range or clearing a filter.
          </p>
          <button onClick={clearAll} className="mt-4 text-postal-red text-sm font-semibold hover:underline">
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-4">
            <span className="font-semibold text-postal-blue">{total}</span> stamp
            {total === 1 ? '' : 's'} found
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stamps.map((stamp) => (
              <StampCard key={stamp._id} stamp={stamp} />
            ))}
          </div>
          <LoadMore
            hasMore={stamps.length < total}
            loading={loadingMore}
            onClick={loadMore}
            total={total}
            shown={stamps.length}
          />
        </>
      )}

      <div className="mt-10 flex items-center justify-center gap-6 text-sm">
        <Link to="/countries" className="text-postal-red font-semibold hover:underline">
          Browse by country →
        </Link>
        <Link to="/timeline" className="text-postal-red font-semibold hover:underline">
          Philately timeline →
        </Link>
      </div>
    </div>
  )
}
