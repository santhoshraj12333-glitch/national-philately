import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import CommentSection from './CommentSection'
import StampImage from './StampImage'
import { countryYearLabel } from '../utils/stamp'

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(post.likes?.includes(user?._id))
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0)
  const [saved, setSaved] = useState(post.savedBy?.includes(user?._id) || false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])

  const requireLogin = () => {
    if (!user) {
      navigate('/login')
      return false
    }
    return true
  }

  const handleLike = async () => {
    if (!requireLogin()) return
    try {
      const { data } = await api.post(`/posts/${post._id}/like`)
      setLiked(data.likes.includes(user._id))
      setLikeCount(data.likes.length)
    } catch {}
  }

  const handleSave = async () => {
    if (!requireLogin()) return
    try {
      const { data } = await api.post(`/posts/${post._id}/save`)
      setSaved(data.saved)
    } catch {}
  }

  const toggleComments = async () => {
    setShowComments(!showComments)
    if (!showComments && comments.length === 0) {
      try {
        const { data } = await api.get(`/posts/${post._id}/comments`)
        setComments(data)
      } catch {}
    }
  }

  const addComment = (comment) => setComments([comment, ...comments])

  const deleteComment = (id) => setComments(comments.filter((c) => c._id !== id))

  const timeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div
      id={`post-${post._id}`}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-24"
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Link to={`/profile/${post.user?.username}`}>
            <div className="w-10 h-10 rounded-full bg-postal-blue text-white flex items-center justify-center font-bold">
              {post.user?.name?.[0]}
            </div>
          </Link>
          <div className="flex-1">
            <Link to={`/profile/${post.user?.username}`} className="font-semibold text-gray-800 hover:text-postal-red transition text-sm">
              {post.user?.name}
            </Link>
            <p className="text-xs text-gray-400">@{post.user?.username} • {timeAgo(post.createdAt)}</p>
          </div>
          {user?._id === post.user?._id || user?.role === 'admin' ? (
            <button onClick={() => onDelete?.(post._id)} className="text-gray-400 hover:text-postal-red transition text-sm">
              🗑️
            </button>
          ) : null}
        </div>

        <p className="text-gray-700 text-sm leading-relaxed mb-3">{post.content}</p>

        {post.stamp && (
          <Link to={`/stamp/${post.stamp._id}`} className="block mb-3">
            <div className="flex items-center gap-3 bg-postal-cream rounded-lg p-3 hover:bg-postal-cream/80 transition">
              <StampImage stamp={post.stamp} className="w-14 h-14 object-contain" />
              <div>
                <p className="font-semibold text-sm text-postal-blue">{post.stamp.name}</p>
                <p className="text-xs text-gray-500">{countryYearLabel(post.stamp)}</p>
              </div>
            </div>
          </Link>
        )}

        {post.image && (
          <img src={post.image} alt="Post" className="w-full rounded-lg mb-3 object-cover max-h-80" />
        )}

        <div className="flex items-center gap-6 pt-2 border-t border-gray-50">
          <button onClick={handleLike} className={`flex items-center gap-1.5 text-sm font-medium transition ${liked ? 'text-postal-red' : 'text-gray-500 hover:text-postal-red'}`}>
            {liked ? '❤️' : '🤍'} {likeCount}
          </button>
          <button onClick={toggleComments} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-postal-blue transition">
            💬 {comments.length || ''}
          </button>
          <button
            onClick={handleSave}
            title={saved ? 'Remove from saved' : 'Save post'}
            className={`ml-auto flex items-center gap-1.5 text-sm font-medium transition ${saved ? 'text-postal-gold' : 'text-gray-500 hover:text-postal-gold'}`}
          >
            {saved ? '🔖' : '📑'}
          </button>
        </div>
      </div>

      {showComments && (
        <CommentSection
          postId={post._id}
          comments={comments}
          onAdd={addComment}
          onDelete={deleteComment}
        />
      )}
    </div>
  )
}
