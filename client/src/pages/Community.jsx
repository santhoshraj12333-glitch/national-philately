import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import PostCard from '../components/PostCard'
import LoadingSpinner from '../components/LoadingSpinner'
import LoadMore from '../components/LoadMore'
import { usePagedList } from '../hooks/usePagedList'

export default function Community() {
  const [params, setParams] = useSearchParams()
  const [feed, setFeed] = useState('all')
  const [reloadKey, setReloadKey] = useState(0)
  const [focused, setFocused] = useState(null)

  const { items: posts, total, loading, error, loadMore, hasMore } = usePagedList('/posts', {
    limit: 8,
    reloadKey,
  })

  // A notification can point straight at a post. The post is fetched on its
  // own and shown at the top, so the link works no matter which page of the
  // feed it happens to live on.
  const focusId = params.get('post')
  useEffect(() => {
    if (!focusId) {
      setFocused(null)
      return
    }
    let active = true
    api
      .get(`/posts/${focusId}`)
      .then(({ data }) => {
        if (active) setFocused(data)
      })
      .catch(() => {
        if (active) setFocused(null)
      })
    return () => {
      active = false
    }
  }, [focusId])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post?')) return
    try {
      await api.delete(`/posts/${id}`)
    } catch {
      // The server refused; the list is re-read below either way.
    }
    setReloadKey((n) => n + 1)
    if (focused?._id === id) {
      setFocused(null)
      const next = new URLSearchParams(params)
      next.delete('post')
      setParams(next, { replace: true })
    }
  }

  const mostLiked = [...posts].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
  const shown = feed === 'popular' ? mostLiked : posts

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold text-postal-blue">Community</h1>
        <Link
          to="/community/create"
          className="bg-postal-red text-white px-5 py-2.5 rounded-full font-semibold hover:bg-red-700 transition"
        >
          + New Post
        </Link>
      </div>

      {error && <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-4 text-sm">{error}</div>}

      {focused && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-postal-blue uppercase tracking-wide mb-2">
            The post you were notified about
          </p>
          <div className="ring-2 ring-postal-red rounded-xl">
            <PostCard post={focused} onDelete={handleDelete} />
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { key: 'all', label: 'Latest' },
          { key: 'popular', label: 'Most Liked' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFeed(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
              feed === t.key
                ? 'border-postal-red text-postal-red'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && posts.length === 0 ? (
        <LoadingSpinner fullScreen />
      ) : shown.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <span className="text-3xl mb-3">📮</span>
          <h3 className="font-semibold text-gray-700">No posts yet</h3>
          <p className="text-gray-400 text-sm mt-1">Be the first to share your collection!</p>
          <Link
            to="/community/create"
            className="inline-block mt-5 bg-postal-red text-white px-6 py-2.5 rounded-full font-semibold hover:bg-red-700 transition"
          >
            Create your first post
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-5">
            {shown.map((post) => (
              <PostCard key={post._id} post={post} onDelete={handleDelete} />
            ))}
          </div>

          <LoadMore
            hasMore={hasMore}
            loading={loading}
            onClick={loadMore}
            total={total}
            shown={shown.length}
          />
        </>
      )}
    </div>
  )
}
