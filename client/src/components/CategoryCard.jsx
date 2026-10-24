export default function CategoryCard({ icon, name, count, active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl p-4 shadow-sm border text-center group transition-all ${
        active
          ? 'bg-postal-red text-white border-postal-red shadow-md -translate-y-0.5'
          : 'bg-white border-gray-100 hover:shadow-md hover:border-postal-red/30 hover:-translate-y-0.5'
      }`}
    >
      <span className="text-2xl block mb-1.5 group-hover:scale-110 transition-transform">{icon}</span>
      <span className={`font-semibold text-xs block ${active ? 'text-white' : 'text-gray-800'}`}>{name}</span>
      <span className={`text-[11px] mt-0.5 block ${active ? 'text-white/80' : 'text-gray-400'}`}>
        {count} stamp{count === 1 ? '' : 's'}
      </span>
    </button>
  )
}