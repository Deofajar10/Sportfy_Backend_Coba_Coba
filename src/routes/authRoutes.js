const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const auth = require('../middlewares/auth'); // middleware JWT

// Register user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Get logged in user (cek token)
router.get('/me', auth, authController.getMe);

module.exports = router;
