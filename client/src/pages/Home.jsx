import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import StampCard from '../components/StampCard'
import PostCard from '../components/PostCard'
import AchievementBadge from '../components/AchievementBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { countryName } from '../utils/stamp'
import { recommendStamps } from '../utils/recommend'

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const { user } = useAuth()
  const [stamps, setStamps] = useState([])
  const [posts, setPosts] = useState([])
  const [collection, setCollection] = useState([])
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [stampsRes, postsRes, collRes, meRes] = await Promise.all([
          api.get('/stamps'),
          api.get('/posts'),
          api.get('/collection'),
          api.get('/users/me'),
        ])
        if (!active) return
        setStamps(stampsRes.data)
        setPosts(postsRes.data)
        setCollection(collRes.data)
        setMe(meRes.data)
      } catch {
        if (active) setError('Could not load your dashboard.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const handleDeletePost = async (id) => {
    try {
      await api.delete(`/posts/${id}`)
      setPosts((prev) => prev.filter((p) => p._id !== id))
    } catch {
      /* ignore */
    }
  }

  if (loading) return <LoadingSpinner fullScreen />

  // Prefer stamps already in the collection, then fill with catalogue picks
  const collected = collection.map((c) => c.stamp).filter(Boolean)
  const continueStamps = [
    ...collected,
    ...stamps.filter((s) => !collected.some((c) => c._id === s._id)),
  ].slice(0, 4)

  const trending = [...posts].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)).slice(0, 2)

  // The interests the collector picked in Settings finally drive a suggestion
  // instead of sitting unused on the profile.
  const interests = me?.interests || []
  const recommended = recommendStamps(
    stamps,
    interests,
    collected.map((c) => c._id),
    4
  )

  const countries = new Set(collection.map((c) => countryName(c.stamp)).filter(Boolean)).size
  const categories = new Set(collection.map((c) => c.stamp?.category).filter(Boolean)).size
  const themes = new Set(collection.map((c) => c.stamp?.theme).filter(Boolean)).size

  const stats = [
    { label: 'Stamps', value: collection.length, icon: '📚' },
    { label: 'Countries', value: countries, icon: '🌍' },
    { label: 'Categories', value: categories, icon: '🗂️' },
    { label: 'Themes', value: themes, icon: '🎨' },
    { label: 'Followers', value: me?.followerCount ?? 0, icon: '👥' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-postal-blue">
          {greeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening in your philately world.</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-6 text-sm">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
            <span className="text-xl block mb-1.5">{s.icon}</span>
            <p className="font-display text-2xl font-bold text-postal-blue">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-postal-blue">Continue Exploring</h2>
          <Link to="/explore" className="text-postal-red text-sm font-semibold hover:underline">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {continueStamps.map((s) => (
            <StampCard key={s._id} stamp={s} />
          ))}
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-postal-blue">Recommended for you</h2>
          {interests.length > 0 && (
            <Link to="/settings" className="text-postal-red text-sm font-semibold hover:underline">
              Edit interests →
            </Link>
          )}
        </div>

        {recommended.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {recommended.map((s) => (
              <StampCard key={s._id} stamp={s} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-sm text-gray-500 flex flex-wrap items-center gap-3">
            <span className="text-xl">🎯</span>
            {interests.length > 0 ? (
              <span>
                Nothing new matches your interests just yet — you may already own them all.
              </span>
            ) : (
              <>
                <span>
                  Tell us what you collect and we'll suggest stamps you haven't seen yet.
                </span>
                <Link
                  to="/settings"
                  className="font-semibold text-postal-red hover:underline"
                >
                  Pick your interests →
                </Link>
              </>
            )}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-postal-blue">Trending in the Community</h2>
            <Link to="/community" className="text-postal-red text-sm font-semibold hover:underline">
              View All →
            </Link>
          </div>
          {trending.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">
              No posts yet.
            </div>
          ) : (
            <div className="space-y-4">
              {trending.map((post) => (
                <PostCard key={post._id} post={post} onDelete={handleDeletePost} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-postal-blue mb-4">Recent Achievements</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              {me?.achievements?.length ? (
                <div className="flex flex-wrap gap-4">
                  {me.achievements.map((a) => (
                    <AchievementBadge key={a._id} achievement={a} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Start collecting to earn achievements!</p>
              )}
            </div>
          </div>

          <div className="bg-postal-cream rounded-xl p-6">
            <h3 className="font-semibold text-postal-blue mb-2">Your Collection</h3>
            <p className="font-display text-4xl font-bold text-postal-red">
              {collection.length} <span className="text-sm font-normal text-gray-500">stamps</span>
            </p>
            <Link to="/collection" className="inline-block mt-3 text-postal-red text-sm font-semibold hover:underline">
              View Collection →
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}