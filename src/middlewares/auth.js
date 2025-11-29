// Backend/src/middlewares/auth.js
const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Tidak ada token. Akses ditolak.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET belum dikonfigurasi');

    const decoded = jwt.verify(token, secret);
    req.user = decoded; // nanti dipakai di controller (getMe, dsb.)
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid atau sudah kadaluarsa.',
    });
  }
};
