import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import PostCard from '../components/PostCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function SavedPosts() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const { data } = await api.get('/posts/saved')
        setPosts(data)
      } catch {}
      setLoading(false)
    }
    fetchSaved()
  }, [user])

  if (loading) return <LoadingSpinner fullScreen />

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
      <h2 className="font-display text-2xl font-bold text-postal-blue mb-1">Saved Posts</h2>
      <p className="text-gray-500 text-sm mb-6">
        Posts you bookmarked to revisit later.
      </p>

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center border border-gray-100">
          <span className="text-3xl block mb-3">📑</span>
          <h3 className="font-semibold text-gray-600">Nothing saved yet</h3>
          <p className="text-gray-400 text-sm mt-1">
            Tap the bookmark icon on any post in the Community feed to save it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onDelete={(id) => setPosts((prev) => prev.filter((p) => p._id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
