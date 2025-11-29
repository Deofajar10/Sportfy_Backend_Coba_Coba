const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.get('/open', bookingController.getOpenMatches);

module.exports = router;