import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import StampCard from '../components/StampCard'
import StampImage from '../components/StampImage'
import LoadingSpinner from '../components/LoadingSpinner'
import { countryName } from '../utils/stamp'

export default function StampDetail() {
  const { id } = useParams()
  const { user, collectionIds, toggleCollection: toggleInCollection } = useAuth()
  const navigate = useNavigate()

  const [stamp, setStamp] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  // The shared collection set tells us whether this stamp is already owned,
  // so the page no longer has to download the whole collection to find out.
  const inCollection = collectionIds.has(id)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const { data } = await api.get(`/stamps/${id}`)
        if (!active) return
        setStamp(data)

        const { data: rel } = await api.get(
          `/stamps?category=${encodeURIComponent(data.category)}&theme=${encodeURIComponent(
            data.theme || ''
          )}`
        )
        if (!active) return
        const others = rel.filter((s) => s._id !== data._id)
        // Prefer stamps from the same country, then fall back to the wider pool.
        const sameCountry = others.filter((s) => s.country?.iso2 === data.country?.iso2)
        const picked = sameCountry.length >= 4 ? sameCountry : [...sameCountry, ...others]
        setRelated(Array.from(new Map(picked.map((s) => [s._id, s])).values()).slice(0, 4))
      } catch {
        if (active) setNotFound(true)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [id])

  // Count the visit so the "Most viewed" ordering reflects real traffic
  // rather than the seeded numbers.
  useEffect(() => {
    api.post(`/stamps/${id}/view`).catch(() => {})
  }, [id])

  const toggleCollection = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setBusy(true)
    setMessage('')
    const result = await toggleInCollection(stamp._id)
    setMessage(result.message)
    setBusy(false)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading) return <LoadingSpinner fullScreen />

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <span className="text-4xl block mb-3">🔍</span>
        <h1 className="font-display text-2xl font-bold text-postal-blue">Stamp not found</h1>
        <p className="text-gray-500 mt-2">This stamp may have been removed.</p>
        <Link to="/explore" className="inline-block mt-6 bg-postal-red text-white px-5 py-2.5 rounded-full font-semibold hover:bg-red-700 transition">
          Back to Explore
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/explore" className="text-sm text-gray-500 hover:text-postal-red transition">
        ← Back to Explore
      </Link>

      <div className="grid lg:grid-cols-2 gap-8 mt-4">
        <div className="rounded-2xl self-start bg-[#EFE7D8] p-6 shadow-sm border border-gray-100">
          <StampImage stamp={stamp} className="w-full h-auto object-contain drop-shadow-md" />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Link
              to={`/explore?category=${encodeURIComponent(stamp.category)}`}
              className="inline-block bg-postal-cream text-postal-blue text-xs font-semibold px-3 py-1 rounded-full hover:bg-postal-red hover:text-white transition"
            >
              {stamp.category}
            </Link>
            {stamp.theme && (
              <Link
                to={`/explore?theme=${encodeURIComponent(stamp.theme)}`}
                className="inline-block bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full hover:bg-postal-blue hover:text-white transition"
              >
                {stamp.theme}
              </Link>
            )}
            {stamp.series && (
              <span className="inline-block bg-gray-50 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
                {stamp.series.name}
                {stamp.seriesNumber ? ` · No. ${stamp.seriesNumber}` : ''}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold text-postal-blue">{stamp.name}</h1>
          <p className="text-gray-500 mt-1">
            {stamp.country?.flag && <span className="mr-1.5">{stamp.country.flag}</span>}
            {countryName(stamp)} • {stamp.year}
            {stamp.denomination && <> • {stamp.denomination}</>}
          </p>

          <p className="text-xs text-gray-400 mt-1.5">
            👁 {stamp.viewCount ?? 0} views
          </p>

          {stamp.person && (
            <p className="text-sm text-gray-600 mt-2">
              Depicts <span className="font-semibold text-postal-blue">{stamp.person}</span>
            </p>
          )}

          {stamp.designNote && (
            <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-postal-blue mb-2">Design Note</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{stamp.designNote}</p>
            </div>
          )}

          {stamp.description && (
            <p className="text-gray-700 leading-relaxed mt-5">{stamp.description}</p>
          )}

          {stamp.story && (
            <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-postal-blue mb-2">The Story</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{stamp.story}</p>
            </div>
          )}

          {(stamp.credit || stamp.license || stamp.sourceUrl) && (
            <p className="mt-5 text-xs text-gray-400 leading-relaxed">
              Image credit:{' '}
              {stamp.credit && <span>{stamp.credit} · </span>}
              {stamp.license && <span>{stamp.license} · </span>}
              {stamp.sourceUrl ? (
                <a
                  href={stamp.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-postal-red"
                >
                  {stamp.source || 'Source'}
                </a>
              ) : (
                <span>{stamp.source}</span>
              )}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={toggleCollection}
              disabled={busy}
              className={`px-6 py-3 rounded-full font-semibold transition disabled:opacity-50 ${
                inCollection
                  ? 'bg-white border-2 border-postal-red text-postal-red hover:bg-red-50'
                  : 'bg-postal-red text-white hover:bg-red-700'
              }`}
            >
              {busy ? 'Updating...' : inCollection ? '✓ In your collection' : '+ Add to Collection'}
            </button>
            <Link to="/collection" className="text-sm text-postal-red font-semibold hover:underline">
              View my collection
            </Link>
          </div>
          {message && <p className="mt-3 text-sm text-postal-blue font-medium">{message}</p>}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-postal-blue mb-5">Related Stamps</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((s) => (
              <StampCard key={s._id} stamp={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}