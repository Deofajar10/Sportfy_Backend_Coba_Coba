const prisma = require('../config/db');

// Ensure a numeric ID is provided and valid
const parseId = (value) => {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

const calculateTotalPrice = (start, end, pricePerHour) => {
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const hourlyRate = Number(pricePerHour);
  return Math.round(hours * hourlyRate);
};

exports.getAllBookings = async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        court: true,
        user: { select: { id: true, name: true, email: true, phone: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, message: 'Daftar booking berhasil diambil', data: bookings });
  } catch (error) {
    return next(error);
  }
};

exports.getBookingById = async (req, res, next) => {
  const bookingId = parseId(req.params.id);
  if (!bookingId) {
    return res.status(400).json({ success: false, message: 'bookingId tidak valid', data: null });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: true,
        user: { select: { id: true, name: true, email: true, phone: true, role: true } }
      }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking tidak ditemukan', data: null });
    }

    return res.json({ success: true, message: 'Detail booking berhasil diambil', data: booking });
  } catch (error) {
    return next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  const { userId, courtId, startTime, endTime, date, time, teamName, findOpponent } = req.body;

  const tokenUserId = parseId(req.user?.userId);
  const bodyUserId = parseId(userId);
  const parsedUserId = tokenUserId || bodyUserId;
  const parsedCourtId = parseId(courtId);

  if (!parsedUserId || !parsedCourtId) {
    return res.status(400).json({ success: false, message: 'UserId/courtId tidak valid', data: null });
  }

  let start = startTime ? new Date(startTime) : null;
  let end = endTime ? new Date(endTime) : null;

  if ((!start || !end) && date && time && time.includes('-')) {
    const [startStr, endStr] = time.split('-').map((s) => s.trim());
    start = new Date(`${date}T${startStr}:00`);
    end = new Date(`${date}T${endStr}:00`);
  }

  if (!(start instanceof Date && !Number.isNaN(start.valueOf())) || !(end instanceof Date && !Number.isNaN(end.valueOf()))) {
    return res.status(400).json({ success: false, message: 'Format waktu tidak valid', data: null });
  }

  if (end <= start) {
    return res.status(400).json({ success: false, message: 'End time harus setelah start time', data: null });
  }

  try {
    const [user, court] = await Promise.all([
      prisma.user.findUnique({ where: { id: parsedUserId } }),
      prisma.court.findUnique({ where: { id: parsedCourtId } })
    ]);

    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan', data: null });
    if (!court) return res.status(404).json({ success: false, message: 'Court tidak ditemukan', data: null });

    const overlapping = await prisma.booking.findFirst({
      where: {
        courtId: parsedCourtId,
        status: { notIn: ['CANCELED', 'CANCELLED', 'EXPIRED'] },
        AND: [
          { startTime: { lt: end } },
          { endTime: { gt: start } }
        ]
      }
    });

    if (overlapping) {
      return res.status(409).json({ success: false, message: 'Jadwal sudah terisi', data: null });
    }

    const totalPrice = calculateTotalPrice(start, end, court.pricePerHour);

    const booking = await prisma.booking.create({
      data: {
        userId: parsedUserId,
        courtId: parsedCourtId,
        startTime: start,
        endTime: end,
        totalPrice,
        status: 'PENDING',
        teamName: teamName || null,
        findOpponent: Boolean(findOpponent),
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Booking berhasil dibuat',
      data: booking
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateBooking = async (req, res, next) => {
  const bookingId = parseId(req.params.id);
  if (!bookingId) {
    return res.status(400).json({ success: false, message: 'bookingId tidak valid', data: null });
  }

  const { userId, courtId, startTime, endTime, status, teamName, findOpponent } = req.body;

  try {
    const existingBooking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!existingBooking) {
      return res.status(404).json({ success: false, message: 'Booking tidak ditemukan', data: null });
    }

    const targetUserId = userId ? parseId(userId) : existingBooking.userId;
    const targetCourtId = courtId ? parseId(courtId) : existingBooking.courtId;
    const targetStart = startTime ? new Date(startTime) : existingBooking.startTime;
    const targetEnd = endTime ? new Date(endTime) : existingBooking.endTime;

    if (!targetUserId || !targetCourtId) {
      return res.status(400).json({ success: false, message: 'UserId/courtId tidak valid', data: null });
    }

    if (!(targetStart instanceof Date && !Number.isNaN(targetStart.valueOf())) ||
        !(targetEnd instanceof Date && !Number.isNaN(targetEnd.valueOf()))) {
      return res.status(400).json({ success: false, message: 'Format waktu tidak valid', data: null });
    }

    if (targetEnd <= targetStart) {
      return res.status(400).json({ success: false, message: 'End time harus setelah start time', data: null });
    }

    const [user, court] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetUserId } }),
      prisma.court.findUnique({ where: { id: targetCourtId } })
    ]);

    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan', data: null });
    if (!court) return res.status(404).json({ success: false, message: 'Court tidak ditemukan', data: null });

    const overlapping = await prisma.booking.findFirst({
      where: {
        courtId: targetCourtId,
        status: { notIn: ['CANCELED', 'CANCELLED', 'EXPIRED'] },
        id: { not: bookingId },
        AND: [
          { startTime: { lt: targetEnd } },
          { endTime: { gt: targetStart } }
        ]
      }
    });

    if (overlapping) {
      return res.status(409).json({ success: false, message: 'Jadwal sudah terisi', data: null });
    }

    const totalPrice = calculateTotalPrice(targetStart, targetEnd, court.pricePerHour);

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        userId: targetUserId,
        courtId: targetCourtId,
        startTime: targetStart,
        endTime: targetEnd,
        totalPrice,
        status: status || existingBooking.status,
        teamName: teamName ?? existingBooking.teamName,
        findOpponent: typeof findOpponent === 'boolean' ? findOpponent : existingBooking.findOpponent
      }
    });

    return res.json({ success: true, message: 'Booking berhasil diperbarui', data: updatedBooking });
  } catch (error) {
    return next(error);
  }
};

exports.deleteBooking = async (req, res, next) => {
  const bookingId = parseId(req.params.id);
  if (!bookingId) {
    return res.status(400).json({ success: false, message: 'bookingId tidak valid', data: null });
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking tidak ditemukan', data: null });
    }

    await prisma.booking.delete({ where: { id: bookingId } });
    return res.json({ success: true, message: 'Booking berhasil dihapus', data: null });
  } catch (error) {
    return next(error);
  }
};

exports.getSchedule = async (req, res, next) => {
  const { courtId, date } = req.query;
  const parsedCourtId = parseId(courtId);
  const targetDate = new Date(date);

  if (!parsedCourtId) return res.status(400).json({ success: false, message: 'courtId tidak valid', data: null });
  if (!(targetDate instanceof Date && !Number.isNaN(targetDate.valueOf()))) {
    return res.status(400).json({ success: false, message: 'Tanggal tidak valid', data: null });
  }

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        courtId: parsedCourtId,
        status: { notIn: ['CANCELED', 'CANCELLED', 'EXPIRED'] },
        startTime: { gte: startOfDay, lt: endOfDay }
      },
      select: { id: true, startTime: true, endTime: true, status: true }
    });
    return res.json({ success: true, message: 'Jadwal berhasil diambil', data: bookings });
  } catch (error) {
    return next(error);
  }
};

exports.getOpenMatches = async (req, res, next) => {
  try {
    const now = new Date();
    const matches = await prisma.booking.findMany({
      where: {
        status: { in: ['PAID', 'PENDING'] }, // tampilkan juga yang masih menunggu pembayaran agar slot terlihat
        findOpponent: true,
        startTime: { gt: now }
      },
      include: {
        court: true,
        user: { select: { id: true, name: true, phone: true, email: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    const formatted = matches.map((m) => ({
      id: m.id,
      court: {
        id: m.court.id,
        name: m.court.name,
        location: m.court.location,
        sportType: m.court.sportType,
        pricePerHour: Number(m.court.pricePerHour),
        imageUrl: m.court.imageUrl,
        facilities: m.court.facilities,
      },
      startTime: m.startTime,
      endTime: m.endTime,
      teamName: m.teamName,
      findOpponent: m.findOpponent,
      user: m.user ? { id: m.user.id, name: m.user.name, phone: m.user.phone, email: m.user.email } : null,
    }));

    return res.json({ success: true, message: 'Open match berhasil diambil', data: formatted });
  } catch (error) {
    return next(error);
  }
};

exports.checkBooking = async (req, res, next) => {
  const { bookingId, phone } = req.query;
  const parsedBookingId = parseId(bookingId);

  if (!parsedBookingId && !phone) {
    return res.status(400).json({ success: false, message: 'bookingId atau phone wajib diisi', data: null });
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          parsedBookingId ? { id: parsedBookingId } : undefined,
          phone ? { user: { phone } } : undefined
        ].filter(Boolean)
      },
      include: {
        court: true,
        user: { select: { id: true, name: true, email: true, phone: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan', data: null });

    const formatted = {
      id: booking.id,
      court: booking.court.name,
      sportType: booking.court.sportType,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalPrice: Number(booking.totalPrice),
      name: booking.user.name,
      phone: booking.user.phone,
      status: booking.status
    };
    return res.json({ success: true, message: 'Booking ditemukan', data: formatted });
  } catch (error) {
    return next(error);
  }
};

exports.getUserHistory = async (req, res, next) => {
  const { userId } = req.params;
  const parsedUserId = parseId(userId);
  if (!parsedUserId) return res.status(400).json({ success: false, message: 'userId tidak valid', data: null });

  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: parsedUserId },
      include: { court: true },
      orderBy: { createdAt: 'desc' }
    });
    const formatted = bookings.map((b) => ({
      id: b.id,
      courtName: b.court.name,
      sportType: b.court.sportType,
      startTime: b.startTime,
      endTime: b.endTime,
      totalPrice: Number(b.totalPrice),
      status: b.status
    }));
    return res.json({ success: true, message: 'Riwayat berhasil diambil', data: formatted });
  } catch (error) {
    return next(error);
  }
};
