const express = require('express');
const {
  getSeries,
  getSeriesById,
  createSeries,
  updateSeries,
  deleteSeries,
} = require('../controllers/seriesController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', getSeries);
router.post('/', protect, adminOnly, createSeries);
router.put('/:id', protect, adminOnly, updateSeries);
router.delete('/:id', protect, adminOnly, deleteSeries);
router.get('/:id', getSeriesById);

module.exports = router;