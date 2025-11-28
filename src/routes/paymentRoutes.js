const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const paymentController = require('../controllers/paymentController');

router.post('/booking/:bookingId', auth, paymentController.createPaymentForBooking);
router.post('/midtrans-notification', paymentController.handleMidtransNotification);

module.exports = router;
