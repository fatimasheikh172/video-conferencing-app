const User = require('../models/User');
const crypto = require('crypto');
const { sendTokenResponse, verifyRefreshToken, generateTokenPair, clearAuthCookies } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/email');
const { validatePassword } = require('../utils/passwordValidator');
const { logAuthEvent } = require('../utils/auditLogger');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, avatar } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await logAuthEvent('auth.register.failed', req, null, {
        email,
        reason: 'Email already exists',
        status: 'failure'
      });
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      avatar: avatar || '',
      isEmailVerified: true
    });

    // Get device info
    const deviceInfo = req.headers['user-agent'] || 'Unknown device';

    // Add refresh token to user
    const { refreshToken } = generateTokenPair(user._id, user.email);
    user.addRefreshToken(refreshToken, deviceInfo);
    await user.save({ validateBeforeSave: false });

    // Log successful registration
    await logAuthEvent('auth.register', req, user._id, {
      userName: user.name,
      userEmail: user.email,
      status: 'success'
    });

    // Send token response
    sendTokenResponse(user, 201, res, false);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      await logAuthEvent('auth.login.failed', req, null, {
        email,
        reason: 'User not found',
        status: 'failure'
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      await logAuthEvent('auth.login.failed', req, user._id, {
        email,
        reason: 'Account locked',
        status: 'failure'
      });
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      // Increment login attempts
      await user.incLoginAttempts();

      await logAuthEvent('auth.login.failed', req, user._id, {
        email,
        reason: 'Invalid password',
        loginAttempts: user.loginAttempts + 1,
        status: 'failure'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();

    // Clean expired tokens
    user.cleanExpiredTokens();

    // Get device info
    const deviceInfo = req.headers['user-agent'] || 'Unknown device';

    // Add refresh token to user
    const { refreshToken } = generateTokenPair(user._id, user.email);
    user.addRefreshToken(refreshToken, deviceInfo);
    await user.save({ validateBeforeSave: false });

    // Log successful login
    await logAuthEvent('auth.login', req, user._id, {
      userName: user.name,
      userEmail: user.email,
      rememberMe: rememberMe || false,
      status: 'success'
    });

    // Send token response
    sendTokenResponse(user, 200, res, rememberMe);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      // Remove refresh token from user
      const user = await User.findById(req.user.id);
      if (user) {
        user.removeRefreshToken(refreshToken);
        user.isOnline = false;
        user.lastSeen = new Date();
        await user.save({ validateBeforeSave: false });
      }
    }

    // Clear cookies
    clearAuthCookies(res);

    // Log logout
    await logAuthEvent('auth.logout', req, req.user.id, {
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    console.log('Refresh token request received');

    if (!refreshToken) {
      console.log('No refresh token provided');
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
      console.log('Token decoded successfully for user:', decoded.id);
    } catch (error) {
      console.log('Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Find user and check if refresh token exists
    const user = await User.findById(decoded.id);

    if (!user) {
      console.log('User not found:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(
      rt => rt.token === refreshToken && rt.expiresAt > Date.now()
    );

    if (!tokenExists) {
      console.log('Refresh token not found in user tokens or expired');
      // Token might be valid but not in database - add it and continue
      // This handles cases where the token was cleared from DB but is still valid
      const deviceInfo = req.headers['user-agent'] || 'Unknown device';
      user.addRefreshToken(refreshToken, deviceInfo);
      await user.save({ validateBeforeSave: false });
      console.log('Added missing refresh token to user');
    }

    // Generate new token pair
    const tokens = generateTokenPair(user._id, user.email);

    // Remove old refresh token and add new one
    user.removeRefreshToken(refreshToken);
    const deviceInfo = req.headers['user-agent'] || 'Unknown device';
    user.addRefreshToken(tokens.refreshToken, deviceInfo);
    await user.save({ validateBeforeSave: false });

    console.log('Token refresh successful for user:', user.email);

    // Send new tokens
    const accessTokenOptions = {
      expires: new Date(Date.now() + 15 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    const refreshTokenOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh'
    };

    res
      .status(200)
      .cookie('accessToken', tokens.accessToken, accessTokenOptions)
      .cookie('refreshToken', tokens.refreshToken, refreshTokenOptions)
      .json({
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
  } catch (error) {
    console.error('Refresh token error:', error);
    next(error);
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Update user
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Send welcome email
    try {
      await sendWelcomeEmail(user);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Private
const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification email
    await sendVerificationEmail(user, verificationToken);

    res.status(200).json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send reset email
    try {
      await sendPasswordResetEmail(user, resetToken);

      res.status(200).json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (error) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // Clear all refresh tokens (logout from all devices)
    user.refreshTokens = [];

    await user.save();

    // Log password reset
    await logAuthEvent('auth.password.reset', req, user._id, {
      userEmail: user.email,
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'New password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log password change
    await logAuthEvent('auth.password.change', req, user._id, {
      userEmail: user.email,
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
