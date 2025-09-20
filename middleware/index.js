const { 
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
} = require('./errorHandler');

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl;
    
    // Only log errors and important requests
    if (status >= 400 || method !== 'GET') {
      console.log(`${method} ${url} - ${status} (${duration}ms)`);
    }
  });
  
  next();
};

/**
 * Rate limiting middleware
 */
const rateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean old entries
    for (const [key, data] of requests.entries()) {
      if (now - data.resetTime > windowMs) {
        requests.delete(key);
      }
    }
    
    // Get or create client data
    let clientData = requests.get(clientId);
    if (!clientData || now - clientData.resetTime > windowMs) {
      clientData = {
        count: 0,
        resetTime: now
      };
      requests.set(clientId, clientData);
    }
    
    // Check rate limit
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'TOO_MANY_REQUESTS',
        message: 'คำขอมากเกินไป กรุณาลองใหม่ภายหลัง',
        retryAfter: Math.ceil((windowMs - (now - clientData.resetTime)) / 1000)
      });
    }
    
    // Increment counter
    clientData.count++;
    
    next();
  };
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
  logError,
  requestLogger,
  rateLimit
};