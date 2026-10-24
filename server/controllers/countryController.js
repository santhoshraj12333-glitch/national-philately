const mongoose = require('mongoose');
const Country = require('../models/Country');
const Stamp = require('../models/Stamp');
const { REGIONS } = require('../utils/taxonomy');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** GET /api/countries — every country with live catalogue counts. */
const getCountries = async (req, res) => {
  try {
    const filter = {};
    if (req.query.region) filter.region = req.query.region;
    if (req.query.search) filter.name = { $regex: escapeRegex(req.query.search), $options: 'i' };

    const countries = await Country.find(filter).sort({ name: 1 }).lean();
    const counts = await Stamp.aggregate([
      { $group: { _id: '$country', stampCount: { $sum: 1 } } },
    ]);
    const byId = new Map(counts.map((c) => [String(c._id), c.stampCount]));

    res.json(
      countries.map((c) => ({
        ...c,
        stampCount: byId.get(String(c._id)) || 0,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** GET /api/countries/regions — distinct regions, for filter dropdowns. */
const getRegions = async (req, res) => {
  try {
    const present = await Country.distinct('region');
    res.json(REGIONS.filter((r) => present.includes(r)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** GET /api/countries/:idOrCode — one country page. */
const getCountry = async (req, res) => {
  try {
    const { idOrCode } = req.params;
    const country = await Country.findOne({
      $or: [
        ...(mongoose.isValidObjectId(idOrCode) ? [{ _id: idOrCode }] : []),
        { iso2: String(idOrCode).toUpperCase() },
        { iso3: String(idOrCode).toUpperCase() },
        { name: { $regex: `^${escapeRegex(idOrCode)}$`, $options: 'i' } },
      ],
    });

    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }

    const [stampCount, themeAgg, yearAgg, stamps, earliest] = await Promise.all([
      Stamp.countDocuments({ country: country._id }),
      Stamp.aggregate([
        { $match: { country: country._id } },
        { $group: { _id: '$theme', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Stamp.aggregate([
        { $match: { country: country._id } },
        { $group: { _id: '$year', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Stamp.find({ country: country._id })
        .populate('series', 'name')
        .sort({ year: 1, seriesNumber: 1 }),
      Stamp.findOne({ country: country._id }).sort({ year: 1 }).select('year'),
    ]);

    res.json({
      ...country.toObject(),
      stampCount,
      firstIssueYear: country.firstIssueYear ?? earliest?.year ?? null,
      themes: themeAgg.map((t) => ({ theme: t._id, count: t.count })),
      timeline: yearAgg.map((y) => ({ year: y._id, count: y.count })),
      stamps,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCountry = async (req, res) => {
  try {
    const { name, iso2, iso3, flag, region, currency, firstIssueYear, description } = req.body;
    if (!name || !iso2 || !iso3 || !region) {
      return res.status(400).json({ message: 'Please provide name, iso2, iso3 and region' });
    }
    if (!REGIONS.includes(region)) {
      return res.status(400).json({ message: `Invalid region. Allowed: ${REGIONS.join(', ')}` });
    }
    const country = await Country.create({
      name,
      iso2,
      iso3,
      flag: flag || '',
      region,
      currency: currency || '',
      firstIssueYear: firstIssueYear ? parseInt(firstIssueYear, 10) : null,
      description: description || '',
    });
    res.status(201).json(country);
  } catch (error) {
    res.status(error.code === 11000 ? 400 : 500).json({ message: error.message });
  }
};

const updateCountry = async (req, res) => {
  try {
    const { name, iso2, iso3, flag, region, currency, firstIssueYear, description } = req.body;
    if (region && !REGIONS.includes(region)) {
      return res.status(400).json({ message: `Invalid region. Allowed: ${REGIONS.join(', ')}` });
    }
    const country = await Country.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(iso2 && { iso2: iso2.toUpperCase() }),
        ...(iso3 && { iso3: iso3.toUpperCase() }),
        ...(flag !== undefined && { flag }),
        ...(region && { region }),
        ...(currency !== undefined && { currency }),
        ...(firstIssueYear !== undefined && {
          firstIssueYear: firstIssueYear ? parseInt(firstIssueYear, 10) : null,
        }),
        ...(description !== undefined && { description }),
      },
      { new: true, runValidators: true }
    );
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.json(country);
  } catch (error) {
    res.status(error.code === 11000 ? 400 : 500).json({ message: error.message });
  }
};

const deleteCountry = async (req, res) => {
  try {
    const stampCount = await Stamp.countDocuments({ country: req.params.id });
    if (stampCount > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${stampCount} stamp(s) still reference this country`,
      });
    }
    const country = await Country.findByIdAndDelete(req.params.id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.json({ message: 'Country deleted', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCountries,
  getRegions,
  getCountry,
  createCountry,
  updateCountry,
  deleteCountry,
};
