const prisma = require('../config/db');

// GET all courts
exports.getAllCourts = async (req, res, next) => {
  try {
    const courts = await prisma.court.findMany();
    res.json({
      success: true,
      data: courts
    });
  } catch (error) {
    next(error);
  }
};

// GET court by ID
exports.getCourtById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const court = await prisma.court.findUnique({
      where: { id: Number(id) }
    });

    if (!court) {
      return res.status(404).json({
        success: false,
        message: "Lapangan tidak ditemukan"
      });
    }

    res.json({
      success: true,
      data: court
    });
  } catch (error) {
    next(error);
  }
};

// CREATE court
exports.createCourt = async (req, res, next) => {
  try {
    const { name, location, sportType, pricePerHour, description, imageUrl, facilities } = req.body;

    if (!name || !location || !sportType || !pricePerHour) {
      return res.status(400).json({
        success: false,
        message: "Field wajib tidak boleh kosong"
      });
    }

    const newCourt = await prisma.court.create({
      data: {
        name,
        location,
        sportType,
        pricePerHour: Number(pricePerHour),
        description,
        imageUrl,
        facilities,
      }
    });

    res.status(201).json({
      success: true,
      message: "Lapangan berhasil dibuat",
      data: newCourt
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE court
exports.updateCourt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, location, sportType, pricePerHour, description, isActive, imageUrl, facilities } = req.body;

    const court = await prisma.court.findUnique({ where: { id: Number(id) } });
    if (!court) {
      return res.status(404).json({
        success: false,
        message: "Lapangan tidak ditemukan"
      });
    }

    const updatedCourt = await prisma.court.update({
      where: { id: Number(id) },
      data: {
        name: name || court.name,
        location: location || court.location,
        sportType: sportType || court.sportType,
        pricePerHour: pricePerHour ? Number(pricePerHour) : court.pricePerHour,
        description: description || court.description,
        imageUrl: imageUrl !== undefined ? imageUrl : court.imageUrl,
        facilities: facilities !== undefined ? facilities : court.facilities,
        isActive: typeof isActive === "boolean" ? isActive : court.isActive
      }
    });

    res.json({
      success: true,
      message: "Lapangan berhasil diperbarui",
      data: updatedCourt
    });
  } catch (error) {
    next(error);
  }
};

// DELETE court
exports.deleteCourt = async (req, res, next) => {
  try {
    const { id } = req.params;

    const court = await prisma.court.findUnique({ where: { id: Number(id) } });
    if (!court) {
      return res.status(404).json({
        success: false,
        message: "Lapangan tidak ditemukan"
      });
    }

    // Hapus semua booking terkait sebelum menghapus court untuk menghindari constraint
    await prisma.booking.deleteMany({ where: { courtId: Number(id) } });
    await prisma.court.delete({ where: { id: Number(id) } });

    res.json({
      success: true,
      message: "Lapangan berhasil dihapus"
    });
  } catch (error) {
    next(error);
  }
};

// RESET all courts (admin)
exports.resetCourts = async (req, res, next) => {
  try {
    // Hapus bookings dulu untuk hindari FK
    await prisma.booking.deleteMany();
    await prisma.court.deleteMany();
    res.json({ success: true, message: 'Semua lapangan berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};
