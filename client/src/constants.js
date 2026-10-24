// Mirror of server/utils/taxonomy.js — keep both in sync.

// Category = philatelic class (what KIND of issue it is)
export const CATEGORIES = [
  { icon: '🏛️', name: 'Historical', blurb: 'Events and eras that shaped a nation' },
  { icon: '🎖️', name: 'Commemorative', blurb: 'Marking a person, place or milestone' },
  { icon: '📮', name: 'Definitive', blurb: 'Everyday stamps used for postage' },
  { icon: '🎭', name: 'Cultural', blurb: 'Art, music and living traditions' },
  { icon: '🏅', name: 'Sports', blurb: 'Games, athletes and competitions' },
  { icon: '🔬', name: 'Science', blurb: 'Space, technology and discovery' },
  { icon: '🐅', name: 'Wildlife', blurb: 'Animals and conservation' },
]

// Theme = subject matter (WHAT the stamp is about)
export const THEMES = [
  { icon: '🇮🇳', name: 'Independence' },
  { icon: '🚀', name: 'Space' },
  { icon: '🐅', name: 'Wildlife' },
  { icon: '🎨', name: 'Art' },
  { icon: '🏛️', name: 'Architecture' },
  { icon: '👤', name: 'Personalities' },
  { icon: '🏅', name: 'Sports' },
  { icon: '🎭', name: 'Culture' },
]

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name)
export const THEME_NAMES = THEMES.map((t) => t.name)

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'az', label: 'A – Z' },
]

/** Collector interests selectable in Settings. */
export const INTERESTS = [
  'Historical',
  'Commemorative',
  'Definitive',
  'Cultural',
  'Sports',
  'Science',
  'Wildlife',
  'Space',
  'Art',
  'Architecture',
  'Personalities',
  'Culture',
  'Independence',
  'First Day Covers',
  'Vintage',
  'Modern',
  'Rare Stamps',
  'Thematic Collecting',
]

/** Build a decade list from the catalogue's actual year range. */
export const buildDecades = (years = []) => {
  if (!years.length) return []
  const min = Math.min(...years)
  const max = Math.max(...years)
  const start = Math.floor(min / 10) * 10
  const out = []
  for (let d = start; d <= max; d += 10) out.push(d)
  return out.reverse()
}
