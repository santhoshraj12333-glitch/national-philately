/**
 * A stamp's country can arrive as:
 *   - a populated Country object (detail, explore, admin list)
 *   - `countryName`, the denormalised string the API always returns
 *   - a bare string, on older/partial payloads
 * Read it through here so components never break on shape.
 */
export const countryName = (stamp) => {
  if (!stamp) return ''
  if (typeof stamp.country === 'string') return stamp.country
  return stamp.countryName || stamp.country?.name || ''
}

export const countryFlag = (stamp) => stamp?.country?.flag || ''

/** "🇮🇳 India • 1947" */
export const countryYearLabel = (stamp) => {
  const c = countryName(stamp)
  return [c, stamp?.year].filter(Boolean).join(' • ')
}