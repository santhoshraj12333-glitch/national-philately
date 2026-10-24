const express = require('express');
const {
  getCollection,
  addToCollection,
  removeFromCollection,
  getCollectionGaps,
  getPassport,
} = require('../controllers/collectionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Static sub-paths must be declared before '/:stampId'.
router.get('/gaps', protect, getCollectionGaps);
router.get('/passport', protect, getPassport);

router.get('/', protect, getCollection);
router.post('/', protect, addToCollection);
router.delete('/:stampId', protect, removeFromCollection);

module.exports = router;
