// Backend/index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const courtRoutes = require('./src/routes/courtRoutes');
const matchRoutes = require('./src/routes/matchRoutes'); // kalau belum dipakai boleh dikomentari
const adminCourtRoutes = require('./src/routes/adminCourtRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const openMatchRoutes = require('./src/routes/openMatchRoutes');

const errorHandler = require('./src/middlewares/errorHandler');

const app = express();

// middleware global
app.use(cors({
  origin: '*',          // nanti bisa kamu ganti ke URL frontend
  credentials: true,
}));
app.use(express.json());

// routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/matches', matchRoutes); // kalau belum dipakai, komentar dulu saja
app.use('/api/admin/courts', adminCourtRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/open-matches', openMatchRoutes);

// error handler di paling akhir
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend berjalan di port ${PORT}`);
});
