import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import ProfileHeader from '../components/ProfileHeader'
import PostCard from '../components/PostCard'
import CollectionGrid from '../components/CollectionGrid'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Profile() {
  const { username } = useParams()
  const { user, updateUser, toggleCollection } = useAuth()
  const navigate = useNavigate()

  const isSelf = !username || username === user?.username
  const target = isSelf ? user?.username : username

  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [collection, setCollection] = useState([])
  const [tab, setTab] = useState('collection')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [following, setFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [privateBlocked, setPrivateBlocked] = useState(false)
  // Bumped after a follow so content that was withheld at first load is
  // fetched once the viewer is allowed to see it.
  const [contentEpoch, setContentEpoch] = useState(0)

  useEffect(() => {
    if (!target) return
    let active = true

    const load = async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const { data: p } = await api.get(isSelf ? '/users/me' : `/users/${target}`)
        if (!active) return
        setProfile(p)
        setFollowing(!!p.isFollowing)

        // A private profile hides its collection and posts from non-followers,
        // so skip those requests entirely rather than relying on the server to 403.
        if (p.canView === false) {
          setPrivateBlocked(true)
          setPosts([])
          setCollection([])
          return
        }
        setPrivateBlocked(false)

        const [postsRes, collRes] = await Promise.all([
          api.get(isSelf ? '/posts' : `/users/${target}/posts`),
          api.get(isSelf ? '/collection' : `/users/${target}/collection`),
        ])
        if (!active) return
        setPosts(isSelf ? postsRes.data.filter((x) => x.user?._id === user?._id) : postsRes.data)
        setCollection(collRes.data)
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
  }, [target, isSelf, user?._id, contentEpoch])

  const handleFollow = async () => {
    const wasWithheld = profile?.canView === false
    setFollowBusy(true)
    try {
      const { data } = await api.post(`/users/${profile._id}/follow`)
      setFollowing(data.following)
      // The server returns authoritative counts so the two sides can never drift.
      setProfile((prev) => ({
        ...prev,
        isFollowing: data.following,
        followerCount: data.followerCount,
        followingCount: data.followingCount,
      }))
      // Following a private collector unlocks their content, so reload it now
      // rather than leaving the locked panel up until a manual refresh.
      if (data.following && wasWithheld) setContentEpoch((n) => n + 1)
    } catch {
      /* ignore */
    }
    setFollowBusy(false)
  }

  const handleDeletePost = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`)
      setPosts((prev) => prev.filter((p) => p._id !== postId))
    } catch {
      /* ignore */
    }
  }

  if (!user) return null
  if (loading) return <LoadingSpinner fullScreen />

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <span className="text-4xl block mb-3">👤</span>
        <h1 className="font-display text-2xl font-bold text-postal-blue">Collector not found</h1>
        <Link to="/community" className="inline-block mt-6 text-postal-red font-semibold hover:underline">
          Back to Community
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <ProfileHeader
        profile={profile}
        isSelf={isSelf}
        onFollow={handleFollow}
        following={following}
        busy={followBusy}
      />

      {isSelf && (
        <div className="flex flex-wrap gap-3">
          <Link
            to="/settings"
            className="px-5 py-2.5 rounded-full bg-white border border-postal-red text-postal-red text-sm font-semibold hover:bg-red-50 transition"
          >
            Edit Profile
          </Link>
          <button
            onClick={() => navigate('/community/create')}
            className="px-5 py-2.5 rounded-full bg-postal-blue text-white text-sm font-semibold hover:bg-blue-800 transition"
          >
            Create Post
          </button>
        </div>
      )}

      {privateBlocked && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <span className="text-3xl block mb-3">🔒</span>
          <h3 className="font-semibold text-gray-700">This profile is private</h3>
          <p className="text-gray-400 text-sm mt-1">
            Follow @{profile?.username} to see their collection and posts.
          </p>
          <button
            onClick={handleFollow}
            disabled={followBusy}
            className="inline-block mt-5 bg-postal-red text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
          >
            {followBusy ? 'Following...' : 'Follow'}
          </button>
        </div>
      )}

      {!privateBlocked && (
      <>
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'collection', label: `Collection (${collection.length})` },
          { key: 'posts', label: `Posts (${posts.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition ${
              tab === t.key
                ? 'border-postal-red text-postal-red'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'collection' ? (
        collection.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <span className="text-3xl block mb-3">📮</span>
            <h3 className="font-semibold text-gray-700">
              {isSelf ? "Your collection is waiting for its first stamp 📮" : 'No stamps shared yet'}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {isSelf ? 'Explore stamps and start collecting.' : `@${profile?.username} hasn't collected any stamps yet.`}
            </p>
            {isSelf && (
              <Link
                to="/explore"
                className="inline-block mt-4 text-postal-red text-sm font-semibold hover:underline"
              >
                Explore Stamps
              </Link>
            )}
          </div>
        ) : (
          <CollectionGrid
            items={collection}
            onRemove={
              isSelf
                ? async (stampId) => {
                    const snapshot = collection
                    setCollection((prev) => prev.filter((i) => i.stamp?._id !== stampId))
                    // Goes through the shared collection state so the rest of
                    // the app sees the same change.
                    const result = await toggleCollection(stampId)
                    if (!result.ok) setCollection(snapshot)
                  }
                : null
            }
          />
        )
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <span className="text-3xl block mb-3">✍️</span>
          <h3 className="font-semibold text-gray-700">No posts yet</h3>
          {isSelf && (
            <Link
              to="/community/create"
              className="inline-block mt-4 text-postal-red text-sm font-semibold hover:underline"
            >
              Share your first find
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onDelete={handleDeletePost} />
          ))}
        </div>
      )}
      </>
      )}
    </div>
  )
}