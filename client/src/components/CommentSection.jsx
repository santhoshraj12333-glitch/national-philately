import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function CommentSection({ postId, comments, onAdd, onDelete }) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    try {
      const { data } = await api.post(`/posts/${postId}/comments`, { content })
      onAdd(data)
      setContent('')
    } catch {}
    setLoading(false)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/posts/comments/${id}`)
      onDelete(id)
    } catch {}
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50/50 p-4">
      <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
        {comments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">No comments yet. Be the first!</p>
        )}
        {comments.map((comment) => (
          <div key={comment._id} className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-postal-blue text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {comment.user?.name?.[0]}
            </div>
            <div className="flex-1 bg-white rounded-lg px-3 py-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">{comment.user?.name}</span>
                {user?._id === comment.user?._id && (
                  <button onClick={() => handleDelete(comment._id)} className="text-gray-300 hover:text-postal-red text-xs transition">✕</button>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 text-sm border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:border-postal-red transition"
          />
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="bg-postal-red text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-red-700 transition disabled:opacity-50"
          >
            Post
          </button>
        </form>
      )}
    </div>
  )
}
