const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
  refreshToken,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/inputValidation');
const {
  registerLimiter,
  loginLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  refreshLimiter
} = require('../middleware/rateLimiter');

// Public routes
router.post('/register', registerLimiter, validate('register'), register);
router.post('/login', loginLimiter, validate('login'), login);
router.post('/refresh', refreshLimiter, refreshToken);
// router.get('/verify-email/:token', verifyEmail); // Disabled - email verification removed
router.post('/forgot-password', passwordResetLimiter, validate('forgotPassword'), forgotPassword);
router.post('/reset-password/:token', passwordResetLimiter, validate('resetPassword'), resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
// router.post('/resend-verification', protect, emailVerificationLimiter, resendVerification); // Disabled - email verification removed
router.put('/change-password', protect, validate('changePassword'), changePassword);

module.exports = router;
