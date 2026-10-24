import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../services/api'
import StampCard from '../components/StampCard'
import CategoryCard from '../components/CategoryCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { CATEGORIES } from '../constants'

export default function Landing() {
  const [featured, setFeatured] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .get('/stamps')
      .then(({ data }) => {
        if (!active) return
        setFeatured(data.slice(0, 6))
        const tally = {}
        data.forEach((s) => {
          tally[s.category] = (tally[s.category] || 0) + 1
        })
        setCounts(tally)
      })
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <section className="relative bg-gradient-to-br from-postal-blue via-postal-blue to-postal-red overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-8xl rotate-12">📮</div>
          <div className="absolute top-20 right-20 text-6xl -rotate-12">✉️</div>
          <div className="absolute bottom-10 left-1/4 text-7xl rotate-6">🖼️</div>
          <div className="absolute bottom-20 right-1/3 text-5xl -rotate-6">📬</div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28 relative">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Discover the stories behind every stamp.
            </h1>
            <p className="text-blue-100 text-lg md:text-xl mb-8 leading-relaxed">
              Explore stamps, build your collection, and connect with fellow collectors.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/explore" className="bg-white text-postal-blue px-6 py-3 rounded-full font-semibold hover:bg-postal-cream transition shadow-lg">
                Explore Stamps
              </Link>
              <Link to="/register" className="border-2 border-white text-white px-6 py-3 rounded-full font-semibold hover:bg-white/10 transition">
                Join the Community
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl font-bold text-postal-blue mb-2">Featured Stamps</h2>
          <p className="text-gray-500">Handpicked stamps from our collection</p>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {featured.map((stamp) => (
              <StampCard key={stamp._id} stamp={stamp} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-postal-cream/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-postal-blue mb-2">Explore Categories</h2>
            <p className="text-gray-500">Find stamps that match your interests</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat) => (
              <Link key={cat.name} to={`/explore?category=${encodeURIComponent(cat.name)}`} className="block">
                <CategoryCard {...cat} count={counts[cat.name] || 0} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold text-postal-blue mb-2">Why National Philately?</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <span className="text-5xl block mb-4">🔍</span>
            <h3 className="font-display font-bold text-xl text-postal-blue mb-2">Discover</h3>
            <p className="text-gray-500">Explore thousands of stories from stamps around the world</p>
          </div>
          <div className="text-center p-6">
            <span className="text-5xl block mb-4">📚</span>
            <h3 className="font-display font-bold text-xl text-postal-blue mb-2">Collect</h3>
            <p className="text-gray-500">Build your digital collection and track your progress</p>
          </div>
          <div className="text-center p-6">
            <span className="text-5xl block mb-4">🤝</span>
            <h3 className="font-display font-bold text-xl text-postal-blue mb-2">Connect</h3>
            <p className="text-gray-500">Meet fellow collectors and share your passion</p>
          </div>
        </div>
      </section>
    </div>
  )
}
