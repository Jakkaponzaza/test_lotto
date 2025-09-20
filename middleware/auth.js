const jwt = require('jsonwebtoken');
const UserService = require('../services/UserService');

// JWT Secret - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'lotto-app-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateToken(user) {
  const payload = {
    userId: user.user_id,
    username: user.username,
    role: user.role,
    isAdmin: user.role === 'owner' || user.role === 'admin'
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate refresh token
 * @param {Object} user - User object
 * @returns {string} Refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    userId: user.user_id,
    type: 'refresh'
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Middleware to authenticate JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    const decoded = verifyToken(token);
    
    // Get fresh user data from database
    const user = await UserService.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Add user context to request
    req.user = {
      ...user,
      isAdmin: user.role === 'owner' || user.role === 'admin'
    };

    next();
  } catch (error) {

    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({ 
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
}

/**
 * Middleware to require admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function requireAdmin(req, res, next) {
  console.log('🔐 ADMIN AUTH: Checking admin access...');
  console.log('👤 ADMIN AUTH: User:', req.user?.username, 'Role:', req.user?.role, 'IsAdmin:', req.user?.isAdmin);
  
  if (!req.user) {
    console.log('❌ ADMIN AUTH: No user found in request');
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_AUTH'
    });
  }

  if (!req.user.isAdmin) {
    console.log('❌ ADMIN AUTH: User is not admin');
    return res.status(403).json({ 
      error: 'Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  console.log('✅ ADMIN AUTH: Admin access granted');
  next();
}

/**
 * Middleware to require owner role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function requireOwner(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_AUTH'
    });
  }

  if (req.user.role !== 'owner') {
    return res.status(403).json({ 
      error: 'Owner access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  next();
}

/**
 * Optional authentication middleware - adds user context if token is present
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      const user = await UserService.findById(decoded.userId);
      
      if (user) {
        req.user = {
          ...user,
          isAdmin: user.role === 'owner' || user.role === 'admin'
        };
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    next();
  }
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  authenticateToken,
  requireAdmin,
  requireOwner,
  optionalAuth,
  JWT_SECRET
};