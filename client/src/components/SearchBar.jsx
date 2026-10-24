export default function SearchBar({ value, onChange, placeholder = 'Search stamps...' }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full bg-white focus:outline-none focus:border-postal-red focus:ring-1 focus:ring-postal-red/20 transition text-sm"
      />
    </div>
  )
}
