/**
 * Single source of truth for the catalogue's two independent axes.
 * Kept in sync with client/src/constants.js.
 */

// Philatelic class — what KIND of issue it is.
const CATEGORIES = [
  'Historical',
  'Commemorative',
  'Definitive',
  'Cultural',
  'Sports',
  'Science',
  'Wildlife',
];

// Subject matter — WHAT the stamp is about.
const THEMES = [
  'Independence',
  'Space',
  'Wildlife',
  'Art',
  'Architecture',
  'Personalities',
  'Sports',
  'Culture',
];

const REGIONS = [
  'South Asia',
  'East Asia',
  'Europe',
  'North America',
  'South America',
  'Africa',
  'Oceania',
];

const SORT_OPTIONS = ['newest', 'oldest', 'popular', 'az'];

const isValid = (list, value) => list.includes(value);

module.exports = { CATEGORIES, THEMES, REGIONS, SORT_OPTIONS, isValid };
