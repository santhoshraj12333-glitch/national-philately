const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Stamp = require('../models/Stamp');
const Country = require('../models/Country');
const Series = require('../models/Series');
const Collection = require('../models/Collection');
const { CATEGORIES, THEMES, isValid } = require('../utils/taxonomy');
const { readPaging, setPagingHeaders } = require('../utils/pagination');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Resolve a country filter that may be an ObjectId, an ISO2/ISO3 code,
 * or a country name. Returns a Mongo filter for Stamp.country.
 */
const buildCountryFilter = async (value) => {
  if (mongoose.isValidObjectId(value)) return value;
  const country = await Country.findOne({
    $or: [
      { iso2: String(value).toUpperCase() },
      { iso3: String(value).toUpperCase() },
      { name: { $regex: `^${escapeRegex(value)}$`, $options: 'i' } },
    ],
  });
  return country ? country._id : '__no_match__';
};

const buildQuery = async (q) => {
  const query = {};

// Free-text search across name, depicted person, theme, description and country.
if (q.search) {
    const rx = new RegExp(escapeRegex(q.search.trim()), 'i');
    query.$or = [
      { name: rx },
      { person: rx },
      { theme: rx },
      { description: rx },
      { story: rx },
      { countryName: rx },
    ];
  }

  if (q.country) {
    query.country = await buildCountryFilter(q.country);
  }

  // Year handling: exact year, decade shorthand, or an inclusive range.
  const years = {};
  if (q.year !== undefined && q.year !== '') {
    const y = parseInt(q.year, 10);
    if (!Number.isNaN(y)) years.$eq = y;
  }
  if (q.decade) {
    const d = parseInt(q.decade, 10);
    if (!Number.isNaN(d)) {
      years.$gte = d;
      years.$lte = d + 9;
    }
  }
  const from = parseInt(q.fromYear, 10);
  const to = parseInt(q.toYear, 10);
  if (!Number.isNaN(from)) years.$gte = from;
  if (!Number.isNaN(to)) years.$lte = to;
  if (Object.keys(years).length) query.year = years;

  if (q.category) {
    if (!isValid(CATEGORIES, q.category)) {
      const err = new Error(`Invalid category. Allowed: ${CATEGORIES.join(', ')}`);
      err.status = 400;
      throw err;
    }
    query.category = q.category;
  }

  if (q.theme) {
    if (!isValid(THEMES, q.theme)) {
      const err = new Error(`Invalid theme. Allowed: ${THEMES.join(', ')}`);
      err.status = 400;
      throw err;
    }
    query.theme = q.theme;
  }

  if (q.series && mongoose.isValidObjectId(q.series)) {
    query.series = q.series;
  }

  return query;
};

const applySort = (sort) => {
  switch (sort) {
    case 'oldest':
      return { year: 1, createdAt: 1 };
    case 'popular':
      return { viewCount: -1, year: -1 };
    case 'az':
      return { name: 1 };
    case 'newest':
    default:
      return { year: -1, createdAt: -1 };
  }
};

const getStamps = async (req, res) => {
  try {
    const query = await buildQuery(req.query);

    // Optional total for "N stamps found" while keeping the payload small.
    if (req.query.countOnly === 'true') {
      const total = await Stamp.countDocuments(query);
      return res.json({ total });
    }

    const { wantsPaging, page, limit, skip } = readPaging(req, 24);
    const total = await Stamp.countDocuments(query);

    const stamps = await Stamp.find(query)
      .populate('country', 'name iso2 flag region')
      .populate('series', 'name totalStamps')
      .sort(applySort(req.query.sort))
      .skip(wantsPaging ? skip : 0)
      .limit(wantsPaging ? limit : 0);

    // The body stays an array; the totals a "Load more" button needs are
    // published as headers. Without ?page or ?limit the full catalogue is
    // returned, exactly as before.
    if (wantsPaging) setPagingHeaders(res, { total, page, limit });
    res.json(stamps);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const getFacets = async (req, res) => {
  try {
    const [countries, categories, themes, years] = await Promise.all([
      Country.find().sort({ name: 1 }),
      Stamp.distinct('category'),
      Stamp.distinct('theme'),
      Stamp.distinct('year'),
    ]);
    res.json({
      countries,
      categories: CATEGORIES.filter((c) => categories.includes(c)),
      themes: THEMES.filter((t) => themes.includes(t)),
      years: years.sort((a, b) => b - a),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStamp = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Stamp not found' });
    }
    const stamp = await Stamp.findById(req.params.id)
      .populate('country', 'name iso2 iso3 flag region description')
      .populate('series', 'name description totalStamps');
    if (!stamp) {
      return res.status(404).json({ message: 'Stamp not found' });
    }
    res.json(stamp);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const normaliseStampInput = async (body) => {
  const {
    name,
    category,
    theme,
    country,
    countryName,
    year,
    series,
    seriesNumber,
    denomination,
    person,
    description,
    story,
    designNote,
    image,
    source,
    sourceUrl,
    credit,
    license,
    licenseUrl,
  } = body;

  if (!name || !category || !theme || !year) {
    const err = new Error('Please provide name, category, theme and year');
    err.status = 400;
    throw err;
  }
  if (!isValid(CATEGORIES, category)) {
    const err = new Error(`Invalid category. Allowed: ${CATEGORIES.join(', ')}`);
    err.status = 400;
    throw err;
  }
  if (!isValid(THEMES, theme)) {
    const err = new Error(`Invalid theme. Allowed: ${THEMES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  let countryDoc = null;
  if (country && mongoose.isValidObjectId(country)) {
    countryDoc = await Country.findById(country);
  } else if (country) {
    countryDoc = await Country.findOne({
      $or: [
        { iso2: String(country).toUpperCase() },
        { name: { $regex: `^${escapeRegex(country)}$`, $options: 'i' } },
      ],
    });
  }
  if (!countryDoc) {
    const err = new Error('A valid country is required (ObjectId, ISO2 code or name)');
    err.status = 400;
    throw err;
  }

  return {
    name: name.trim(),
    category,
    theme,
    country: countryDoc._id,
    countryName: countryDoc.name,
    year: parseInt(year, 10),
    series: series && mongoose.isValidObjectId(series) ? series : null,
    seriesNumber: seriesNumber !== undefined && seriesNumber !== null ? parseInt(seriesNumber, 10) : null,
    denomination: denomination || '',
    person: person || '',
    description: description || '',
    story: story || '',
    designNote: designNote || '',
    image: image || '',
    source: source || '',
    sourceUrl: sourceUrl || '',
    credit: credit || '',
    license: license || '',
    licenseUrl: licenseUrl || '',
  };
};

const createStamp = async (req, res) => {
  try {
    const data = await normaliseStampInput(req.body);
    const stamp = await Stamp.create(data);
    await Stamp.populate(stamp, [
      { path: 'country', select: 'name iso2 flag region' },
      { path: 'series', select: 'name' },
    ]);
    res.status(201).json(stamp);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const updateStamp = async (req, res) => {
  try {
    const data = await normaliseStampInput({
      ...(await Stamp.findById(req.params.id).lean()),
      ...req.body,
    });
    const stamp = await Stamp.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    }).populate([
      { path: 'country', select: 'name iso2 flag region' },
      { path: 'series', select: 'name' },
    ]);
    if (!stamp) {
      return res.status(404).json({ message: 'Stamp not found' });
    }
    res.json(stamp);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

/**
 * Deletes a stamp and every row that pointed at it.
 *
 * Without the cascade the collection entries survive as orphans: they still
 * count towards "stamps owned" while no longer resolving to a real stamp,
 * which makes the collection count, the gaps view and the passport quietly
 * wrong for every collector who owned it.
 */
const deleteStamp = async (req, res) => {
  try {
    const stamp = await Stamp.findByIdAndDelete(req.params.id);
    if (!stamp) {
      return res.status(404).json({ message: 'Stamp not found' });
    }
    await Collection.deleteMany({ stamp: stamp._id });
    res.json({ message: 'Stamp deleted', id: stamp._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const trackView = async (req, res) => {
  try {
    if (mongoose.isValidObjectId(req.params.id)) {
      await Stamp.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const IMAGE_DIR = path.join(__dirname, '..', 'public', 'stamps');
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const EXT_BY_MAGIC = [
  { ext: 'png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'gif', test: (b) => b.slice(0, 3).toString('ascii') === 'GIF' },
  {
    ext: 'webp',
    test: (b) => b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP',
  },
];

/**
 * Accepts an image posted as a data URL and writes it to public/stamps so it
 * can be served by the read-only /api/stamps/files route.
 */
const uploadStampImage = async (req, res) => {
  try {
    const { image, name } = req.body || {};
    const match = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,(.+)$/.exec(String(image || ''));
    if (!match) {
      return res.status(400).json({ message: 'Please provide an image as a base64 data URL' });
    }

    const buffer = Buffer.from(match[1], 'base64');
    if (!buffer.length) {
      return res.status(400).json({ message: 'The image could not be decoded' });
    }
    if (buffer.length > MAX_IMAGE_BYTES) {
      return res.status(413).json({ message: 'Image must be 4MB or smaller' });
    }
    const kind = EXT_BY_MAGIC.find((k) => k.test(buffer));
    if (!kind) {
      return res.status(400).json({ message: 'Only PNG, JPEG, WebP and GIF images are accepted' });
    }

    const slug =
      String(name || 'stamp')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'stamp';
    const filename = `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${kind.ext}`;

    fs.mkdirSync(IMAGE_DIR, { recursive: true });
    fs.writeFileSync(path.join(IMAGE_DIR, filename), buffer);

    res.status(201).json({ image: `/api/stamps/files/${filename}`, bytes: buffer.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStamps,
  getFacets,
  getStamp,
  createStamp,
  updateStamp,
  deleteStamp,
  trackView,
  uploadStampImage,
};
