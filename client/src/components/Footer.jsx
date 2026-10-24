import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-postal-blue text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📮</span>
              <span className="font-display font-bold text-xl">National Philately</span>
            </div>
            <p className="text-blue-200 text-sm leading-relaxed">
              Discover the stories behind every stamp. Build your collection and connect with fellow collectors.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Explore</h4>
            <div className="space-y-2 text-sm text-blue-200">
              <Link to="/explore" className="block hover:text-white transition">Browse Stamps</Link>
              <Link to="/community" className="block hover:text-white transition">Community</Link>
              <Link to="/register" className="block hover:text-white transition">Join Free</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Categories</h4>
            <div className="space-y-2 text-sm text-blue-200">
              <span className="block">🇮🇳 Indian History</span>
              <span className="block">🌿 Wildlife</span>
              <span className="block">🚀 Space</span>
              <span className="block">🏛️ Culture</span>
            </div>
          </div>
        </div>
        <div className="border-t border-blue-400/30 mt-8 pt-6 text-center text-sm text-blue-300">
          National Philately — A College FSD Project | Discover • Collect • Connect
        </div>
      </div>
    </footer>
  )
}
