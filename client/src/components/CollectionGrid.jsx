import StampImage from './StampImage'
import { countryName, countryYearLabel } from '../utils/stamp'

export default function CollectionGrid({ items, onRemove }) {
  const countries = new Set(items.map((i) => countryName(i.stamp)).filter(Boolean))
  const categories = new Set(items.map((i) => i.stamp?.category).filter(Boolean))
  const themes = new Set(items.map((i) => i.stamp?.theme).filter(Boolean))

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[
          { label: 'Stamps', value: items.length },
          { label: 'Countries', value: countries.size },
          { label: 'Categories', value: categories.size },
          { label: 'Themes', value: themes.size },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
            <p className="font-display text-2xl font-bold text-postal-blue">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item._id} className="group relative">
            <div className="stamp-frame rounded-lg overflow-hidden transition group-hover:shadow-lg">
              <div className="aspect-[4/5] bg-[#EFE7D8] p-2">
                <StampImage stamp={item.stamp} className="w-full h-full object-contain" />
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-gray-800 text-sm truncate">{item.stamp?.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {countryYearLabel(item.stamp)}
                </p>
              </div>
            </div>
            {onRemove && (
              <button
                onClick={() => onRemove(item.stamp?._id)}
                className="absolute top-2 right-2 bg-white/90 rounded-full w-8 h-8 shadow text-sm opacity-0 group-hover:opacity-100 transition"
                title="Remove from collection"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}