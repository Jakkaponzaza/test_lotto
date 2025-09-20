const express = require('express');

// Helper function to check admin role (for future JWT implementation)
const requireAdmin = (req, res, next) => {
  // For now, just pass through
  // TODO: Add JWT token validation and role checking
  next();
};

// Helper function to require authentication (for future JWT implementation)
const requireAuth = (req, res, next) => {
  // For now, just pass through
  // TODO: Add JWT token validation
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.code === 'WARN_DATA_TRUNCATED' || err.errno === 1265) {
    return res.status(500).json({ 
      error: 'ข้อผิดพลาดข้อมูลในฐานข้อมูล - โปรดติดต่อผู้ดูแลระบบ',
      code: err.code
    });
  }
  
  res.status(500).json({ 
    error: 'เกิดข้อผิดพลาดในระบบ',
    message: err.message 
  });
};

// CORS middleware (if needed)
const corsMiddleware = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
};

module.exports = {
  requireAdmin,
  requireAuth,
  errorHandler,
  corsMiddleware,
  requestLogger
};