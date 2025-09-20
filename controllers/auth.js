const express = require('express');
const { getConnection } = require('../dbconnect');
const UserService = require('../services/UserService');
const { generateToken, generateRefreshToken, verifyToken, authenticateToken } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { 
  validateRegistration, 
  validateLogin, 
  validateTokenRefresh, 
  validateTokenVerification 
} = require('../middleware/validation');

const router = express.Router();

// ✅ Register
router.post('/register', validateRegistration, asyncHandler(async (req, res) => {
  const { username, password, email, phone, wallet, role } = req.body;
  


  const result = await UserService.register({
    username,
    password,
    email,
    phone,
    wallet: parseFloat(wallet) || 0,
    role: role || 'member'
  });

  // Generate tokens for the new user
  const accessToken = generateToken(result.user);
  const refreshToken = generateRefreshToken(result.user);

  sendSuccess(res, {
    user: {
      user_id: result.user.user_id,
      username: result.user.username,
      email: result.user.email,
      phone: result.user.phone,
      role: result.user.role,
      wallet: result.user.wallet,
      isAdmin: result.user.role === 'owner' || result.user.role === 'admin'
    },
    tokens: {
      accessToken,
      refreshToken
    },
    email_generated: result.emailGenerated
  }, "ลงทะเบียนสำเร็จ", 201);
}));

// ✅ Login
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await UserService.authenticate(username, password);

  if (!user) {
    return sendError(res, 'INVALID_CREDENTIALS');
  }

  // Generate tokens
  const accessToken = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  sendSuccess(res, {
    user: {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      wallet: user.wallet,
      isAdmin: user.isAdmin,
      redirectTo: user.isAdmin ? '/admin' : '/member'
    },
    tokens: {
      accessToken,
      refreshToken
    }
  }, "เข้าสู่ระบบสำเร็จ");
}));

// ✅ Refresh Token
router.post('/refresh', validateTokenRefresh, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const decoded = verifyToken(refreshToken);
  
  if (decoded.type !== 'refresh') {
    return sendError(res, 'INVALID_TOKEN');
  }

  // Get fresh user data
  const user = await UserService.findById(decoded.userId);
  if (!user) {
    return sendError(res, 'USER_NOT_FOUND');
  }

  // Generate new tokens
  const newAccessToken = generateToken(user);
  const newRefreshToken = generateRefreshToken(user);

  sendSuccess(res, {
    tokens: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    }
  }, 'Token ถูกต่ออายุแล้ว');
}));

// ✅ Get Current User Profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  sendSuccess(res, {
    user: {
      user_id: req.user.user_id,
      username: req.user.username,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      wallet: req.user.wallet,
      isAdmin: req.user.isAdmin
    }
  }, 'ดึงข้อมูลผู้ใช้สำเร็จ');
}));

// ✅ Logout (client-side token invalidation)
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // In a more sophisticated system, you might want to blacklist the token
  // For now, we'll just return success and let the client handle token removal
  sendSuccess(res, null, 'ออกจากระบบสำเร็จ');
}));

// ✅ Verify Token (for client-side token validation)
router.post('/verify', validateTokenVerification, asyncHandler(async (req, res) => {
  const { token } = req.body;

  try {
    const decoded = verifyToken(token);
    const user = await UserService.findById(decoded.userId);
    
    if (!user) {
      return sendError(res, 'USER_NOT_FOUND');
    }

    sendSuccess(res, {
      valid: true,
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        isAdmin: user.role === 'owner' || user.role === 'admin'
      }
    }, 'Token ถูกต้อง');

  } catch (error) {
    sendError(res, 'INVALID_TOKEN');
  }
}));

module.exports = router;