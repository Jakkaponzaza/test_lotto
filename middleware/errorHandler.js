const { databaseErrorHandler } = require('../utils/databaseErrorHandler');

/**
 * Enhanced error handling middleware for REST API
 */

/**
 * HTTP status codes for different error types
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Error types and their corresponding HTTP status codes
 */
const ERROR_MAPPINGS = {
  // Authentication errors
  'INVALID_CREDENTIALS': { status: HTTP_STATUS.UNAUTHORIZED, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
  'TOKEN_EXPIRED': { status: HTTP_STATUS.UNAUTHORIZED, message: 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่' },
  'INVALID_TOKEN': { status: HTTP_STATUS.UNAUTHORIZED, message: 'Token ไม่ถูกต้อง' },
  'NO_TOKEN': { status: HTTP_STATUS.UNAUTHORIZED, message: 'กรุณาเข้าสู่ระบบ' },
  'AUTH_FAILED': { status: HTTP_STATUS.UNAUTHORIZED, message: 'การยืนยันตัวตนล้มเหลว' },
  
  // Authorization errors
  'INSUFFICIENT_PERMISSIONS': { status: HTTP_STATUS.FORBIDDEN, message: 'ไม่มีสิทธิ์เข้าถึง' },
  'NO_AUTH': { status: HTTP_STATUS.UNAUTHORIZED, message: 'กรุณาเข้าสู่ระบบ' },
  
  // Validation errors
  'VALIDATION_ERROR': { status: HTTP_STATUS.BAD_REQUEST, message: 'ข้อมูลไม่ถูกต้อง' },
  'MISSING_REQUIRED_FIELD': { status: HTTP_STATUS.BAD_REQUEST, message: 'ข้อมูลที่จำเป็นไม่ครบถ้วน' },
  'INVALID_FORMAT': { status: HTTP_STATUS.BAD_REQUEST, message: 'รูปแบบข้อมูลไม่ถูกต้อง' },
  
  // Business logic errors
  'USER_NOT_FOUND': { status: HTTP_STATUS.NOT_FOUND, message: 'ไม่พบผู้ใช้' },
  'TICKET_NOT_FOUND': { status: HTTP_STATUS.NOT_FOUND, message: 'ไม่พบลอตเตอรี่' },
  'INSUFFICIENT_FUNDS': { status: HTTP_STATUS.UNPROCESSABLE_ENTITY, message: 'ยอดเงินไม่เพียงพอ' },
  'TICKET_NOT_AVAILABLE': { status: HTTP_STATUS.CONFLICT, message: 'ลอตเตอรี่ไม่พร้อมใช้งาน' },
  'ALREADY_CLAIMED': { status: HTTP_STATUS.CONFLICT, message: 'รางวัลถูกขึ้นเงินแล้ว' },
  'NOT_WINNER': { status: HTTP_STATUS.UNPROCESSABLE_ENTITY, message: 'ลอตเตอรี่นี้ไม่ถูกรางวัล' },
  'DUPLICATE_ENTRY': { status: HTTP_STATUS.CONFLICT, message: 'ข้อมูลซ้ำ' },
  
  // System errors
  'DATABASE_ERROR': { status: HTTP_STATUS.SERVICE_UNAVAILABLE, message: 'เกิดข้อผิดพลาดในระบบฐานข้อมูล' },
  'CONNECTION_ERROR': { status: HTTP_STATUS.SERVICE_UNAVAILABLE, message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้' },
  'TIMEOUT_ERROR': { status: HTTP_STATUS.SERVICE_UNAVAILABLE, message: 'การประมวลผลใช้เวลานานเกินไป' },
  'RATE_LIMIT_EXCEEDED': { status: HTTP_STATUS.TOO_MANY_REQUESTS, message: 'คำขอมากเกินไป กรุณาลองใหม่ภายหลัง' }
};

/**
 * Create standardized error response
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @param {string} requestId - Request ID for tracking
 * @returns {Object} Standardized error response
 */
function createErrorResponse(code, message, details = null, requestId = null) {
  const response = {
    success: false,
    error: message,
    code: code,
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.details = details;
  }

  if (requestId) {
    response.requestId = requestId;
  }

  return response;
}

/**
 * Get error information from error code or error object
 * @param {string|Error} error - Error code or error object
 * @returns {Object} Error information with status and message
 */
function getErrorInfo(error) {
  if (typeof error === 'string') {
    return ERROR_MAPPINGS[error] || { 
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR, 
      message: 'เกิดข้อผิดพลาดในระบบ' 
    };
  }

  if (error && error.code && ERROR_MAPPINGS[error.code]) {
    return ERROR_MAPPINGS[error.code];
  }

  // Check for database errors
  if (error && (error.code || error.errno)) {
    const userFriendlyMessage = databaseErrorHandler.getUserFriendlyMessage(error);
    return {
      status: HTTP_STATUS.SERVICE_UNAVAILABLE,
      message: userFriendlyMessage
    };
  }

  // Check for specific error messages
  if (error && error.message) {
    const message = error.message.toLowerCase();
    
    if (message.includes('ยอดเงินไม่เพียงพอ')) {
      return { status: HTTP_STATUS.UNPROCESSABLE_ENTITY, message: error.message };
    }
    
    if (message.includes('ไม่พบ')) {
      return { status: HTTP_STATUS.NOT_FOUND, message: error.message };
    }
    
    if (message.includes('ซ้ำ') || message.includes('duplicate')) {
      return { status: HTTP_STATUS.CONFLICT, message: error.message };
    }
    
    if (message.includes('ไม่ถูกต้อง') || message.includes('invalid')) {
      return { status: HTTP_STATUS.BAD_REQUEST, message: error.message };
    }
  }

  return { 
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR, 
    message: 'เกิดข้อผิดพลาดในระบบ' 
  };
}

/**
 * Log error with context information
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {string} operation - Operation being performed
 */
function logError(error, req, operation = 'unknown') {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    operation,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user ? req.user.user_id : null,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      errno: error.errno,
      stack: error.stack
    }
  };

  console.error(`[API ERROR] ${operation}:`, JSON.stringify(errorInfo, null, 2));
}

/**
 * Enhanced error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const errorHandler = (err, req, res, next) => {
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log the error
  logError(err, req, 'errorHandler');
  
  // Get error information
  const errorInfo = getErrorInfo(err);
  
  // Create error response
  const errorResponse = createErrorResponse(
    err.code || 'INTERNAL_ERROR',
    errorInfo.message,
    process.env.NODE_ENV === 'development' ? { 
      originalMessage: err.message,
      stack: err.stack 
    } : null,
    requestId
  );
  
  // Send error response
  res.status(errorInfo.status).json(errorResponse);
};

/**
 * Handle async errors in route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler with error handling
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle 404 errors for undefined routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`ไม่พบเส้นทาง ${req.method} ${req.originalUrl}`);
  error.code = 'ROUTE_NOT_FOUND';
  error.status = HTTP_STATUS.NOT_FOUND;
  next(error);
};

/**
 * Send success response with standardized format
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} status - HTTP status code
 */
const sendSuccess = (res, data = null, message = 'สำเร็จ', status = HTTP_STATUS.OK) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  res.status(status).json(response);
};

/**
 * Send error response with standardized format
 * @param {Object} res - Express response object
 * @param {string|Error} error - Error code or error object
 * @param {Object} details - Additional error details
 * @param {number} status - HTTP status code (optional)
 */
const sendError = (res, error, details = null, status = null) => {
  const errorInfo = getErrorInfo(error);
  const statusCode = status || errorInfo.status;
  
  const errorResponse = createErrorResponse(
    typeof error === 'string' ? error : (error.code || 'UNKNOWN_ERROR'),
    errorInfo.message,
    details
  );
  
  res.status(statusCode).json(errorResponse);
};

module.exports = {
  HTTP_STATUS,
  ERROR_MAPPINGS,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  sendSuccess,
  sendError,
  createErrorResponse,
  getErrorInfo,
  logError
};