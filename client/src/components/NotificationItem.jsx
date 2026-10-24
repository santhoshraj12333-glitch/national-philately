import { Link } from 'react-router-dom'
import api from '../services/api'

export default function NotificationItem({ notification, onRead }) {
  const handleRead = async () => {
    if (!notification.read) {
      try {
        await api.put(`/notifications/${notification._id}/read`)
        onRead(notification._id)
      } catch {}
    }
  }

  const icons = {
    like: '❤️',
    comment: '💬',
    follow: '👤',
    achievement: '🏅',
  }

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

  const body = (
    <>
      <span className="text-xl flex-shrink-0">{icons[notification.type] || '🔔'}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {timeAgo(notification.createdAt)}
          {notification.link && <span className="ml-2 text-postal-blue">View →</span>}
        </p>
      </div>
      {!notification.read && (
        <span className="w-2 h-2 bg-postal-red rounded-full flex-shrink-0 mt-2"></span>
      )}
    </>
  )

  const className = `flex items-start gap-3 p-3 rounded-lg transition hover:bg-gray-50 ${
    !notification.read ? 'bg-postal-cream/50' : ''
  }`

  // A notification that points somewhere becomes a link, so the reader can go
  // and look at the thing they were told about.
  if (notification.link) {
    return (
      <Link to={notification.link} onClick={handleRead} className={className}>
        {body}
      </Link>
    )
  }

  return (
    <div onClick={handleRead} className={`${className} cursor-pointer`}>
      {body}
    </div>
  )
}
