import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import StampImage from '../components/StampImage'
import LoadingSpinner from '../components/LoadingSpinner'
import { countryName, countryYearLabel } from '../utils/stamp'

export default function CreatePost() {
  const navigate = useNavigate()

  const [content, setContent] = useState('')
  const [image, setImage] = useState('')
  const [stampId, setStampId] = useState('')
  const [stamps, setStamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api
      .get('/stamps')
      .then(({ data }) => active && setStamps(data))
      .catch(() => active && setError('Could not load stamps'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await api.post('/posts', {
        content: content.trim(),
        image: image.trim(),
        stamp: stampId || null,
      })
      navigate('/community')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create post')
      setSubmitting(false)
    }
  }

  const selected = stamps.find((s) => s._id === stampId)

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/community" className="text-sm text-gray-500 hover:text-postal-red transition">
        ← Back to Community
      </Link>

      <form onSubmit={handleSubmit} className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h1 className="font-display text-2xl font-bold text-postal-blue mb-5">What are you collecting today?</h1>

        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          maxLength={500}
          required
          placeholder="Share a find, a story, or ask the community..."
          className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-postal-red resize-none text-sm"
        />
        <p className="text-right text-xs text-gray-400 mt-1">{content.length}/500</p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Add Image (optional)</label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/your-photo.jpg"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-postal-red text-sm"
            />
            {image && (
              <img src={image} alt="Preview" className="mt-3 w-full max-h-56 object-cover rounded-lg border border-gray-100" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Attach a Stamp (optional)</label>
            {loading ? (
              <p className="text-sm text-gray-400">Loading stamps...</p>
            ) : (
              <select
                value={stampId}
                onChange={(e) => setStampId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-postal-red text-sm"
              >
                <option value="">-- No stamp --</option>
                {stamps.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({countryName(s)}, {s.year})
                  </option>
                ))}
              </select>
            )}
            {selected && (
              <div className="flex items-center gap-3 mt-3 bg-postal-cream rounded-lg p-3">
                <StampImage stamp={selected} className="w-12 h-12 object-contain" />
                <div>
                  <p className="font-semibold text-sm text-postal-blue">{selected.name}</p>
                  <p className="text-xs text-gray-500">{countryYearLabel(selected)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="w-full mt-6 bg-postal-red text-white py-3 rounded-full font-semibold hover:bg-red-700 transition disabled:opacity-50"
        >
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </form>
    </div>
  )
}