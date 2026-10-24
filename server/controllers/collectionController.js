const Collection = require('../models/Collection');
const Stamp = require('../models/Stamp');
const Country = require('../models/Country');
const Series = require('../models/Series');
const { CATEGORIES } = require('../utils/taxonomy');
const { checkAndUnlockAchievements } = require('../utils/achievements');

const getCollection = async (req, res) => {
  try {
    const items = await Collection.find({ user: req.user._id })
      .populate('stamp')
      .sort({ addedAt: -1 });
    // Rows whose stamp no longer exists are dropped rather than returned as
    // empty entries, so the count on screen always matches the count shown.
    res.json(items.filter((item) => item.stamp));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Load the user's owned stamp ids plus the whole catalogue, once. */
const loadCatalogueState = async (userId) => {
  const [owned, stamps] = await Promise.all([
    Collection.find({ user: userId }).select('stamp'),
    Stamp.find({})
      .populate('country', 'name iso2 flag region')
      .populate('series', 'name category theme issuedFrom issuedTo')
      .lean(),
  ]);

  // Only count owned ids that still resolve to a real catalogue entry. A
  // stamp that was deleted underneath an old collection row must not inflate
  // "stamps owned" and make the percentages quietly wrong.
  const catalogueIds = new Set(stamps.map((s) => String(s._id)));
  const ownedIds = new Set(
    owned.map((o) => String(o.stamp)).filter((id) => catalogueIds.has(id))
  );

  return { ownedIds, stamps };
};

const pct = (part, total) => (total === 0 ? 0 : Math.round((part / total) * 100));

/**
 * GET /api/collection/gaps
 *
 * What the collector is missing, grouped by country and by series. This is the
 * "what should I collect next" view, so it is derived from the live catalogue
 * rather than stored, and it reports only series/countries that are incomplete.
 */
const getCollectionGaps = async (req, res) => {
  try {
    const { ownedIds, stamps } = await loadCatalogueState(req.user._id);

    const byCountry = new Map();
    const bySeries = new Map();

    for (const stamp of stamps) {
      const owned = ownedIds.has(String(stamp._id));
      const country = stamp.country;
      const series = stamp.series;

      if (country) {
        const key = String(country._id);
        if (!byCountry.has(key)) {
          byCountry.set(key, {
            country: {
              _id: country._id,
              name: country.name,
              iso2: country.iso2,
              flag: country.flag,
              region: country.region,
            },
            total: 0,
            owned: 0,
            missing: [],
          });
        }
        const c = byCountry.get(key);
        c.total += 1;
        if (owned) {
          c.owned += 1;
        } else {
          c.missing.push({
            _id: stamp._id,
            name: stamp.name,
            year: stamp.year,
            denomination: stamp.denomination,
            category: stamp.category,
            theme: stamp.theme,
            series: series ? series.name : null,
          });
        }
      }

      if (series) {
        const key = String(series._id);
        if (!bySeries.has(key)) {
          bySeries.set(key, {
            series: {
              _id: series._id,
              name: series.name,
              category: series.category,
              theme: series.theme,
              issuedFrom: series.issuedFrom,
              issuedTo: series.issuedTo,
              country: country
                ? { _id: country._id, name: country.name, iso2: country.iso2, flag: country.flag }
                : null,
            },
            total: 0,
            owned: 0,
            missing: [],
          });
        }
        const s = bySeries.get(key);
        s.total += 1;
        if (owned) {
          s.owned += 1;
        } else {
          s.missing.push({
            _id: stamp._id,
            name: stamp.name,
            year: stamp.year,
            denomination: stamp.denomination,
            category: stamp.category,
            theme: stamp.theme,
          });
        }
      }
    }

    const countries = [...byCountry.values()]
      .map((c) => ({ ...c, percent: pct(c.owned, c.total), missingCount: c.missing.length }))
      .sort((a, b) => a.percent - b.percent || b.missingCount - a.missingCount);

    const series = [...bySeries.values()]
      .map((s) => ({ ...s, percent: pct(s.owned, s.total), missingCount: s.missing.length }))
      .filter((s) => s.missingCount > 0)
      .sort((a, b) => a.percent - b.percent || b.missingCount - a.missingCount);

    res.json({
      totals: {
        catalogue: stamps.length,
        owned: ownedIds.size,
        missing: stamps.length - ownedIds.size,
        percent: pct(ownedIds.size, stamps.length),
      },
      countries,
      series,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/collection/passport
 *
 * A per-country "stamp passport": what percentage of each country in the
 * catalogue the collector holds, plus category coverage and date span.
 */
const getPassport = async (req, res) => {
  try {
    const { ownedIds, stamps } = await loadCatalogueState(req.user._id);

    const countries = await Country.find({})
      .select('name iso2 iso3 flag region currency firstIssueYear')
      .lean();
    const seriesDocs = await Series.find({}).select('name category theme').lean();
    const seriesById = new Map(seriesDocs.map((s) => [String(s._id), s]));

    const pages = countries.map((country) => {
      const own = stamps.filter(
        (s) => s.country && String(s.country._id) === String(country._id)
      );
      const ownedStamps = own.filter((s) => ownedIds.has(String(s._id)));

      const categoryCounts = Object.fromEntries(CATEGORIES.map((c) => [c.name, 0]));
      const themeCounts = {};
      const ownedByCategory = {};
      const seriesHeld = new Set();
      let earliest = null;
      let latest = null;

      for (const s of own) {
        categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
        themeCounts[s.theme] = (themeCounts[s.theme] || 0) + 1;
        if (ownedIds.has(String(s._id))) {
          ownedByCategory[s.category] = (ownedByCategory[s.category] || 0) + 1;
          if (s.series) seriesHeld.add(String(s.series._id));
          if (!earliest || s.year < earliest) earliest = s.year;
          if (!latest || s.year > latest) latest = s.year;
        }
      }

      const byCategory = CATEGORIES.map((c) => ({
        category: c.name,
        icon: c.icon,
        total: categoryCounts[c.name] || 0,
        owned: ownedByCategory[c.name] || 0,
      })).filter((c) => c.total > 0);

      const topThemes = Object.entries(themeCounts)
        .map(([theme, total]) => ({
          theme,
          total,
          owned: own.filter((s) => s.theme === theme && ownedIds.has(String(s._id))).length,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 4);

      return {
        country,
        total: own.length,
        owned: ownedStamps.length,
        missing: own.length - ownedStamps.length,
        percent: pct(ownedStamps.length, own.length),
        completed: own.length > 0 && ownedStamps.length === own.length,
        seriesTotal: seriesDocs.filter((s) => {
          const inCountry = own.filter((st) => st.series && String(st.series._id) === String(s._id));
          return inCountry.length > 0;
        }).length,
        seriesHeld: seriesHeld.size,
        byCategory,
        topThemes,
        earliest: earliest ?? country.firstIssueYear ?? null,
        latest: latest ?? country.firstIssueYear ?? null,
      };
    });

    const started = pages.filter((p) => p.total > 0);
    const countriesWithStamps = started.filter((p) => p.owned > 0);
    const completedCountries = started.filter((p) => p.completed);

    res.json({
      summary: {
        countriesInCatalogue: started.length,
        countriesStarted: countriesWithStamps.length,
        countriesCompleted: completedCountries.length,
        // Mean per-country percent would over-count small countries, so this is
        // total owned over total available across every country that has stamps.
        percent: pct(
          started.reduce((sum, p) => sum + p.owned, 0),
          started.reduce((sum, p) => sum + p.total, 0)
        ),
        stampsOwned: ownedIds.size,
        catalogueStamps: stamps.length,
      },
      // Fewest complete first: the next stamp to collect is at the top.
      pages: pages.sort((a, b) => a.percent - b.percent || b.total - a.total),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addToCollection = async (req, res) => {
  try {
    const { stampId } = req.body;
    if (!stampId) {
      return res.status(400).json({ message: 'Stamp ID is required' });
    }

    const existing = await Collection.findOne({ user: req.user._id, stamp: stampId });
    if (existing) {
      return res.status(400).json({ message: 'Stamp already in collection' });
    }

    const item = await Collection.create({ user: req.user._id, stamp: stampId });
    const populated = await item.populate('stamp');

    await checkAndUnlockAchievements(req.user._id);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeFromCollection = async (req, res) => {
  try {
    const item = await Collection.findOneAndDelete({ user: req.user._id, stamp: req.params.stampId });
    if (!item) {
      return res.status(404).json({ message: 'Stamp not in collection' });
    }
    res.json({ message: 'Removed from collection' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCollection,
  addToCollection,
  removeFromCollection,
  getCollectionGaps,
  getPassport,
};
