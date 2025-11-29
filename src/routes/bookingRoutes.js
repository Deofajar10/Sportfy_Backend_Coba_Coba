const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const bookingController = require('../controllers/bookingController');

router.get('/schedule', bookingController.getSchedule);
router.get('/check', bookingController.checkBooking);
router.get('/user/:userId', bookingController.getUserHistory);

router.get('/', bookingController.getAllBookings);
router.get('/:id', bookingController.getBookingById);
router.post('/', auth, bookingController.createBooking);
router.put('/:id', auth, bookingController.updateBooking);
router.delete('/:id', auth, bookingController.deleteBooking);

module.exports = router;
