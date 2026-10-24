import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import NotificationItem from '../components/NotificationItem'
import LoadMore from '../components/LoadMore'
import { usePagedList } from '../hooks/usePagedList'

export default function Notifications() {
  const { refreshUnreadCount, unreadCount } = useAuth()

  const {
    items: notifications,
    total,
    loading,
    error,
    loadMore,
    hasMore,
    mutate,
  } = usePagedList('/notifications', { limit: 15 })

  // Marking one as read updates the row in place; re-reading the whole list
  // would throw away the pages the reader had already loaded.
  const handleRead = (id) => {
    refreshUnreadCount()
    mutate((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)))
  }

  const handleReadAll = async () => {
    try {
      await api.put('/notifications/read-all')
      mutate((prev) => prev.map((n) => ({ ...n, read: true })))
      refreshUnreadCount()
    } catch {}
  }

  if (loading && notifications.length === 0) return <LoadingSpinner fullScreen />

  if (notifications.length === 0 && !error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white rounded-xl p-8 text-center">
          <span className="text-3xl mb-3">📮</span>
          <h3 className="font-semibold text-gray-600">No notifications</h3>
          <p className="text-gray-400 text-sm">You'll see them here</p>
        </div>
      </div>
    )
  }

  // The headline uses the account-wide unread count, not just the rows that
  // happen to be loaded.
  const unread = unreadCount

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-postal-blue">Notifications</h2>
          {unread > 0 && (
            <button
              onClick={handleReadAll}
              className="text-xs font-medium text-postal-blue hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
        <p className="text-gray-400 text-sm mb-4">
          {unread > 0 ? (
            <>
              You have <span className="font-medium text-postal-blue">{unread}</span> unread
              {unread === 1 ? ' notification' : ' notifications'}
            </>
          ) : (
            "You're all caught up."
          )}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-4 text-sm">{error}</div>
        )}

        <div className="space-y-3">
          {notifications.map((notif) => (
            <NotificationItem
              key={notif._id}
              notification={notif}
              onRead={handleRead}
            />
          ))}
        </div>

        <LoadMore
          hasMore={hasMore}
          loading={loading}
          onClick={loadMore}
          total={total}
          shown={notifications.length}
        />
      </div>
    </div>
  )
}
