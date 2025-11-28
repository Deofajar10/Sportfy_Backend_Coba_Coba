const bcrypt = require('bcrypt');
const prisma = require('../config/db');
const generateToken = require('../utils/generateToken');

const sanitizeUser = (user) => {
  const { password, ...rest } = user;
  return rest;
};

exports.register = async (req, res, next) => {
  const { fullName, name: nameInput, email, phone, password } = req.body;
  try {
    const existingUser = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email/HP sudah terdaftar', data: null });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const name = fullName || nameInput;

    const user = await prisma.user.create({
      data: { name, email, phone, password: hashedPassword }
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      data: { token, user: sanitizeUser(user) }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: 'Login gagal', data: null });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Login gagal', data: null });

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login berhasil',
      data: { token, user: sanitizeUser(user) }
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Tidak ada pengguna dalam token', data: null });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan', data: null });
    }

    return res.json({
      success: true,
      message: 'Profile berhasil diambil',
      data: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
};
