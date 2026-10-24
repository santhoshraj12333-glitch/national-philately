export default function LoadMore({ hasMore, loading, onClick, total, shown }) {
  if (!hasMore && !loading) {
    return total > 6 ? (
      <p className="text-center text-xs text-gray-400 mt-8">
        That is all {total} of them.
      </p>
    ) : null
  }

  return (
    <div className="flex flex-col items-center gap-2 mt-8">
      <button
        onClick={onClick}
        disabled={loading}
        className="px-6 py-2.5 rounded-full border border-postal-blue text-postal-blue text-sm font-semibold hover:bg-blue-50 transition disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Load more'}
      </button>
      {shown > 0 && (
        <p className="text-xs text-gray-400">
          Showing {shown} of {total}
        </p>
      )}
    </div>
  )
}
