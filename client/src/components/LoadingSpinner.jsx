export default function LoadingSpinner({ fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-postal-paper">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-postal-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-10 h-10 border-4 border-postal-red border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
}
