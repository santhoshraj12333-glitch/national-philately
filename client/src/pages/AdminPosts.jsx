import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import PostCard from '../components/PostCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function AdminPosts() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api
      .get('/admin/posts')
      .then(({ data }) => active && setPosts(data))
      .catch(() => active && setError('Could not load posts'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const remove = async (id) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    const snapshot = posts
    setPosts((prev) => prev.filter((p) => p._id !== id))
    try {
      await api.delete(`/admin/posts/${id}`)
    } catch {
      setPosts(snapshot)
      setError('Could not delete post')
    }
  }

  if (loading) return <LoadingSpinner fullScreen />

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/admin" className="text-sm text-gray-500 hover:text-postal-red transition">
        ← Admin Dashboard
      </Link>
      <h1 className="font-display text-3xl font-bold text-postal-blue mt-4 mb-2">Manage Posts</h1>
      <p className="text-gray-500 text-sm mb-6">{posts.length} post{posts.length === 1 ? '' : 's'} in the community feed.</p>

      {error && <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-4 text-sm">{error}</div>}

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <span className="text-3xl block mb-3">💬</span>
          <p className="text-gray-500 text-sm">No posts to moderate.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  )
}