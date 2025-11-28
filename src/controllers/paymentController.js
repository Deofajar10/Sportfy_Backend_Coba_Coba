const snap = require('../config/midtrans');
const prisma = require('../config/db');

const parseId = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const calculateGrossAmount = (booking, court) => {
  if (booking.totalPrice) {
    return booking.totalPrice;
  }
  const hours = (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60);
  const hourlyRate = Number(court.pricePerHour);
  return Math.round(hours * hourlyRate);
};

exports.createPaymentForBooking = async (req, res, next) => {
  try {
    const bookingId = parseId(req.params.bookingId);
    const requesterId = parseId(req.user?.userId);
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId tidak valid' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { court: true, user: true },
    });

    if (!booking || !requesterId || booking.userId !== requesterId) {
      return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    }

    if (booking.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Booking sudah diproses atau dibatalkan' });
    }

    const grossAmount = calculateGrossAmount(booking, booking.court);

    if (!booking.totalPrice || booking.totalPrice !== grossAmount) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { totalPrice: grossAmount },
      });
    }

    const midtransOrderId = `SPORTFY-${booking.id}-${Date.now()}`;

    const payment = await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        midtransOrderId,
        grossAmount,
        transactionStatus: 'PENDING',
      },
      create: {
        bookingId: booking.id,
        midtransOrderId,
        grossAmount,
        transactionStatus: 'PENDING',
      },
    });

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: booking.user?.name,
        email: booking.user?.email || req.user?.email,
        phone: booking.user?.phone || undefined,
      },
    });

    return res.json({
      success: true,
      message: 'Payment created',
      data: {
        redirectUrl: transaction?.redirect_url,
        token: transaction?.token,
        bookingId: booking.id,
        paymentId: payment.id,
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.handleMidtransNotification = async (req, res, next) => {
  try {
    const {
      order_id: orderId,
      transaction_status: transactionStatus,
      payment_type: paymentType,
      fraud_status: fraudStatus,
      transaction_time: transactionTime,
    } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'order_id tidak valid' });
    }

    const payment = await prisma.payment.findUnique({
      where: { midtransOrderId: orderId },
      include: { booking: true },
    });

    if (!payment) {
      return res.status(200).json({ success: false, message: 'payment not found' });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        transactionStatus: transactionStatus || payment.transactionStatus,
        paymentType: paymentType || payment.paymentType,
        fraudStatus: fraudStatus || payment.fraudStatus,
        transactionTime: transactionTime ? new Date(transactionTime) : payment.transactionTime,
      },
    });

    const nextStatus = (() => {
      if (transactionStatus === 'capture' || transactionStatus === 'settlement') return 'PAID';
      if (transactionStatus === 'expire') return 'EXPIRED';
      if (transactionStatus === 'cancel' || transactionStatus === 'deny') return 'CANCELLED';
      return payment.booking.status;
    })();

    if (nextStatus && nextStatus !== payment.booking.status) {
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: nextStatus },
      });
    }

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
};
