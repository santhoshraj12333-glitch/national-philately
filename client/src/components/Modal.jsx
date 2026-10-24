export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-display font-bold text-lg text-postal-blue">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl transition">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
