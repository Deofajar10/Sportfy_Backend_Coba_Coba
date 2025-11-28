module.exports = function isAdmin(req, res, next) {
  const role = req.user?.role;
  if (role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Hanya admin yang boleh mengakses.' });
  }
  next();
};
