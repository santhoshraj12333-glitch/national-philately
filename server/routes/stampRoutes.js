const express = require('express');
const {
  getStamps,
  getFacets,
  getStamp,
  createStamp,
  updateStamp,
  deleteStamp,
  trackView,
  uploadStampImage,
} = require('../controllers/stampController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', getStamps);
router.get('/facets', getFacets);
router.post('/upload', protect, adminOnly, uploadStampImage);
router.post('/', protect, adminOnly, createStamp);
router.put('/:id', protect, adminOnly, updateStamp);
router.delete('/:id', protect, adminOnly, deleteStamp);
router.post('/:id/view', trackView);
router.get('/:id', getStamp);

module.exports = router;
