const express = require('express');
const router = express.Router();

const courtController = require('../controllers/courtController');
const auth = require('../middlewares/auth'); // sesuaikan path kalau beda

// GET semua court
router.get('/', courtController.getAllCourts);

// GET court by ID
router.get('/:id', courtController.getCourtById);

// CREATE court (butuh login)
router.post('/', auth, courtController.createCourt);

// UPDATE court (butuh login)
router.put('/:id', auth, courtController.updateCourt);

// DELETE court (butuh login)
router.delete('/:id', auth, courtController.deleteCourt);

module.exports = router;
