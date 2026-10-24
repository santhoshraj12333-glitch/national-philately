/**
 * Turns the collector's stated interests into a ranking of catalogue stamps.
 *
 * Some interests name a stamp field directly ("Space" is a theme, "Sports"
 * is a category); the rest describe a taste rather than a subject, and are
 * matched by era or by how often a stamp is looked at.
 */

const scoreFor = (stamp, interest) => {
  if (interest === stamp.category || interest === stamp.theme) return 3
  if (interest === 'Vintage' && stamp.year < 1980) return 1
  if (interest === 'Modern' && stamp.year >= 1990) return 1
  return 0
}

export const scoreStamp = (stamp, interests = []) =>
  interests.reduce((total, interest) => total + scoreFor(stamp, interest), 0)

/**
 * @param stamps       the catalogue to choose from
 * @param interests   the collector's interests
 * @param excludeIds   ids to leave out (usually the stamps they already own)
 * @param limit        how many suggestions to return
 */
export const recommendStamps = (stamps = [], interests = [], excludeIds = [], limit = 4) => {
  if (!interests.length) return []

  const skip = new Set(excludeIds)
  const scored = stamps
    .filter((s) => !skip.has(s._id))
    .map((s) => ({ stamp: s, score: scoreStamp(s, interests) }))
    .filter((entry) => entry.score > 0)

  scored.sort((a, b) => b.score - a.score || (b.stamp.viewCount || 0) - (a.stamp.viewCount || 0))

  return scored.slice(0, limit).map((entry) => entry.stamp)
}
