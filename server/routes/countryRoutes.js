const express = require('express');
const {
  getCountries,
  getRegions,
  getCountry,
  createCountry,
  updateCountry,
  deleteCountry,
} = require('../controllers/countryController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/regions', getRegions);
router.get('/', getCountries);
router.post('/', protect, adminOnly, createCountry);
router.put('/:id', protect, adminOnly, updateCountry);
router.delete('/:id', protect, adminOnly, deleteCountry);
router.get('/:idOrCode', getCountry);

module.exports = router;
