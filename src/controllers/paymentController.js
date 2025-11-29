const snap = require('../config/midtrans');
const prisma = require('../config/db');

const parseId = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveGrossAmount = (booking, court) => {
  const totalPrice = booking?.totalPrice ? Number(booking.totalPrice) : null;
  if (totalPrice && totalPrice > 0) return totalPrice;

  try {
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const hourlyRate = Number(court?.pricePerHour);
    const calculated = Math.round(hours * hourlyRate);
    if (calculated > 0) return calculated;
  } catch (err) {
    // fallback to default below
  }

  return 100000; // fallback amount for latihan
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

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    }

    if (!requesterId || booking.userId !== requesterId) {
      return res.status(403).json({ success: false, message: 'Tidak diizinkan' });
    }

    const grossAmount = resolveGrossAmount(booking, booking.court);

    if (!booking.totalPrice || Number(booking.totalPrice) !== grossAmount) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { totalPrice: grossAmount },
      });
    }

    const midtransOrderId = `SPORTFY-${booking.id}-${Date.now()}`;

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        midtransOrderId,
        paymentStatus: 'PENDING',
        status: 'PENDING',
      },
    });

    const frontendBase = process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: booking.user?.name || 'User Sportfy',
        email: booking.user?.email || 'test@example.com',
        phone: booking.user?.phone || '08123456789',
      },
      item_details: [
        {
          id: String(booking.courtId),
          price: grossAmount,
          quantity: 1,
          name: booking.court?.name || 'Booking Lapangan',
        },
      ],
      callbacks: {
        finish: `${frontendBase}/payment-result?bookingId=${booking.id}`,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    return res.json({
      success: true,
      message: 'Midtrans Snap transaction created (sandbox)',
      data: {
        redirectUrl: transaction?.redirect_url,
        token: transaction?.token,
        bookingId: booking.id,
        orderId: midtransOrderId,
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.handleMidtransNotification = async (req, res) => {
  try {
    const { order_id, transaction_status, fraud_status, payment_type } = req.body || {};

    // Log payload masuk untuk debug notif yang nyangkut
    console.log('Midtrans notif received:', {
      order_id,
      transaction_status,
      fraud_status,
      payment_type,
      raw: req.body,
    });
    if (!order_id) {
      return res.status(200).json({ success: true, message: 'missing order_id' });
    }

    const booking = await prisma.booking.findFirst({
      where: { midtransOrderId: order_id },
    });

    if (!booking) {
      return res.status(200).json({ success: true, message: 'booking not found' });
    }

    let paymentStatus = 'PENDING';
    const status = (transaction_status || '').toLowerCase();
    if (status === 'capture' || status === 'settlement') {
      paymentStatus = 'PAID';
    } else if (status === 'pending') {
      // Sandbox helper: untuk latihan, treat pending sebagai PAID agar UI tidak mentok.
      paymentStatus = 'PAID';
    } else if (status === 'expire') {
      paymentStatus = 'EXPIRED';
    } else if (status === 'cancel' || status === 'deny') {
      paymentStatus = 'CANCELLED';
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus,
        status: paymentStatus,
      },
    });

    return res.status(200).json({ success: true, message: 'notification processed' });
  } catch (error) {
    console.error('Midtrans Notification Error:', error);
    return res.status(200).json({ success: false, message: 'error processed, ignored' });
  }
};
