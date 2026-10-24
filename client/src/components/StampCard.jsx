import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import StampImage from './StampImage'
import { countryYearLabel } from '../utils/stamp'

export default function StampCard({ stamp }) {
  const { user, collectionIds, toggleCollection } = useAuth()
  const navigate = useNavigate()

  const inCollection = collectionIds.has(stamp._id)

  const toggle = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/login')
      return
    }
    const result = await toggleCollection(stamp._id)
    if (!result.ok) {
      // Surface the reason instead of failing silently - a button that does
      // nothing is worse than one that explains itself.
      console.warn(result.message)
    }
  }

  return (
    <Link to={`/stamp/${stamp._id}`} className="group block">
      <div className="stamp-frame rounded-lg overflow-hidden transition group-hover:shadow-lg">
        <div className="relative aspect-[4/5] p-2 bg-[#EFE7D8] group-hover:scale-[1.02] transition-transform">
          <StampImage
            stamp={stamp}
            className="w-full h-full object-contain drop-shadow-sm"
          />
          <button
            onClick={toggle}
            aria-label={inCollection ? 'Remove from collection' : 'Save to collection'}
            title={inCollection ? 'In your collection - click to remove' : 'Add to your collection'}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full shadow flex items-center justify-center text-sm hover:scale-110 transition ${
              inCollection ? 'bg-white' : 'bg-white/90'
            }`}
          >
            {inCollection ? '❤️' : '🤍'}
          </button>
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-gray-800 text-sm leading-tight truncate">{stamp.name}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {countryYearLabel(stamp)}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-[10px] bg-postal-cream text-postal-blue px-2 py-0.5 rounded-full font-medium">
              {stamp.category}
            </span>
            {stamp.theme && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                {stamp.theme}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
