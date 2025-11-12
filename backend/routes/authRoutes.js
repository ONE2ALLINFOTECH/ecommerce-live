// routes/auth.js
const express = require('express');
const { register, login, forgetPassword, verifyOTPAndReset } = require('../controllers/authController');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forget', forgetPassword);
router.post('/verify-otp-reset', verifyOTPAndReset); // New route

module.exports = router;