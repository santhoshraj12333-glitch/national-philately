const mongoose = require('mongoose');
const Country = require('../models/Country');
const Series = require('../models/Series');
const Stamp = require('../models/Stamp');

const getSeries = async (req, res) => {
  try {
    const { country, category, theme, search } = req.query;

    const filter = {};
    if (country) {
      if (mongoose.isValidObjectId(country)) {
        filter.country = country;
      } else {
        const c = await Country.findOne({
          $or: [{ iso2: country.toUpperCase() }, { iso3: country.toUpperCase() }],
        });
        if (!c) return res.json([]);
        filter.country = c._id;
      }
    }
    if (category) filter.category = category;
    if (theme) filter.theme = theme;
    if (search) {
      const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { description: rx }];
    }

    const series = await Series.find(filter)
      .populate('country', 'name iso2 flag')
      .sort({ issuedFrom: -1, name: 1 });

    // Attach each series' real stamp count and the categories it spans.
    const counts = await Stamp.aggregate([
      { $match: { series: { $in: series.map((s) => s._id) } } },
      { $group: { _id: '$series', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

    res.json(
      series.map((s) => ({
        ...s.toObject(),
        stampCount: countMap[String(s._id)] || 0,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSeriesById = async (req, res) => {
  try {
    const series = await Series.findById(req.params.id)
      .populate('country', 'name iso2 iso3 flag region')
      .lean();
    if (!series) return res.status(404).json({ message: 'Series not found' });

    const stamps = await Stamp.find({ series: series._id })
      .populate('country', 'name iso2 flag')
      .sort({ year: 1, seriesNumber: 1 })
      .lean();

    res.json({ ...series, stampCount: stamps.length, stamps });
  } catch (error) {
    res.status(error.name === 'CastError' ? 404 : 500).json({ message: error.message });
  }
};

const createSeries = async (req, res) => {
  try {
    const { name, country, category, theme, issuedFrom, issuedTo, description } = req.body;

    if (!name || !country) {
      return res.status(400).json({ message: 'Name and country are required.' });
    }

    let countryId = country;
    if (!mongoose.isValidObjectId(country)) {
      const c = await Country.findOne({
        $or: [{ iso2: country.toUpperCase() }, { iso3: country.toUpperCase() }],
      });
      if (!c) return res.status(400).json({ message: `Unknown country "${country}"` });
      countryId = c._id;
    }

    const series = await Series.create({
      name,
      country: countryId,
      category,
      theme,
      issuedFrom,
      issuedTo,
      description,
    });

    res.status(201).json(await series.populate('country', 'name iso2 flag'));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSeries = async (req, res) => {
  try {
    const patch = { ...req.body };

    if (patch.country && !mongoose.isValidObjectId(patch.country)) {
      const c = await Country.findOne({
        $or: [{ iso2: patch.country.toUpperCase() }, { iso3: patch.country.toUpperCase() }],
      });
      if (!c) return res.status(400).json({ message: `Unknown country "${patch.country}"` });
      patch.country = c._id;
    }

    const series = await Series.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    }).populate('country', 'name iso2 flag');

    if (!series) return res.status(404).json({ message: 'Series not found' });
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSeries = async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);
    if (!series) return res.status(404).json({ message: 'Series not found' });

    // Refuse while stamps still reference it, so no stamp is orphaned.
    const inUse = await Stamp.countDocuments({ series: series._id });
    if (inUse > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${inUse} stamp${inUse === 1 ? '' : 's'} still belong to this series.`,
      });
    }

    await series.deleteOne();
    res.json({ message: 'Series deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSeries,
  getSeriesById,
  createSeries,
  updateSeries,
  deleteSeries,
};