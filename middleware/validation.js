const { body, param, query, validationResult } = require('express-validator');

/**
 * Input validation middleware for REST API endpoints
 */

/**
 * Handle validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      error: 'ข้อมูลที่ส่งมาไม่ถูกต้อง',
      code: 'VALIDATION_ERROR',
      details: errorMessages
    });
  }
  next();
};

/**
 * Validation rules for user registration
 */
const validateRegistration = [
  body('username')
    .notEmpty()
    .withMessage('กรุณาระบุชื่อผู้ใช้')
    .isLength({ min: 3, max: 50 })
    .withMessage('ชื่อผู้ใช้ต้องมีความยาว 3-50 ตัวอักษร')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร ตัวเลข และ _ เท่านั้น'),
  
  body('password')
    .notEmpty()
    .withMessage('กรุณาระบุรหัสผ่าน')
    .isLength({ min: 6 })
    .withMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('รูปแบบอีเมลไม่ถูกต้อง')
    .normalizeEmail(),
  
  body('phone')
    .notEmpty()
    .withMessage('กรุณาระบุหมายเลขโทรศัพท์')
    .matches(/^[0-9]{10}$/)
    .withMessage('หมายเลขโทรศัพท์ต้องเป็นตัวเลข 10 หลัก'),
  
  body('wallet')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('จำนวนเงินต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0'),
  
  body('role')
    .optional()
    .isIn(['member', 'admin', 'owner'])
    .withMessage('บทบาทต้องเป็น member, admin หรือ owner'),
  
  handleValidationErrors
];

/**
 * Validation rules for user login
 */
const validateLogin = [
  body('username')
    .notEmpty()
    .withMessage('กรุณาระบุชื่อผู้ใช้'),
  
  body('password')
    .notEmpty()
    .withMessage('กรุณาระบุรหัสผ่าน'),
  
  handleValidationErrors
];

/**
 * Validation rules for ticket purchase
 */
const validateTicketPurchase = [
  body('ticketIds')
    .isArray({ min: 1 })
    .withMessage('กรุณาเลือกลอตเตอรี่อย่างน้อย 1 ใบ'),
  
  body('ticketIds.*')
    .isInt({ min: 1 })
    .withMessage('รหัสลอตเตอรี่ต้องเป็นตัวเลขที่มากกว่า 0'),
  
  handleValidationErrors
];

/**
 * Validation rules for prize claiming
 */
const validatePrizeClaim = [
  body('ticketNumber')
    .notEmpty()
    .withMessage('กรุณาระบุหมายเลขลอตเตอรี่')
    .matches(/^[0-9]{6}$/)
    .withMessage('หมายเลขลอตเตอรี่ต้องเป็นตัวเลข 6 หลัก'),
  
  handleValidationErrors
];

/**
 * Validation rules for draw creation
 */
const validateDrawCreation = [
  body('poolType')
    .isIn(['sold', 'all'])
    .withMessage('ประเภทการออกรางวัลต้องเป็น sold หรือ all'),
  
  body('prizeStructure')
    .isArray({ min: 1 })
    .withMessage('กรุณาระบุโครงสร้างรางวัล'),
  
  body('prizeStructure.*.rank')
    .isInt({ min: 1 })
    .withMessage('อันดับรางวัลต้องเป็นตัวเลขที่มากกว่า 0'),
  
  body('prizeStructure.*.amount')
    .isFloat({ min: 0 })
    .withMessage('จำนวนเงินรางวัลต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0'),
  
  handleValidationErrors
];

/**
 * Validation rules for wallet operations
 */
const validateWalletUpdate = [
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('จำนวนเงินต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0'),
  
  handleValidationErrors
];

/**
 * Validation rules for ticket number parameter
 */
const validateTicketNumber = [
  param('ticketNumber')
    .matches(/^[0-9]{6}$/)
    .withMessage('หมายเลขลอตเตอรี่ต้องเป็นตัวเลข 6 หลัก'),
  
  handleValidationErrors
];

/**
 * Validation rules for user ID parameter
 */
const validateUserId = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('รหัสผู้ใช้ต้องเป็นตัวเลขที่มากกว่า 0'),
  
  handleValidationErrors
];

/**
 * Validation rules for pagination
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('หมายเลขหน้าต้องเป็นตัวเลขที่มากกว่า 0'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('จำนวนรายการต่อหน้าต้องเป็นตัวเลข 1-100'),
  
  handleValidationErrors
];

/**
 * Validation rules for token refresh
 */
const validateTokenRefresh = [
  body('refreshToken')
    .notEmpty()
    .withMessage('กรุณาระบุ refresh token'),
  
  handleValidationErrors
];

/**
 * Validation rules for token verification
 */
const validateTokenVerification = [
  body('token')
    .notEmpty()
    .withMessage('กรุณาระบุ token'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validateTicketPurchase,
  validatePrizeClaim,
  validateDrawCreation,
  validateWalletUpdate,
  validateTicketNumber,
  validateUserId,
  validatePagination,
  validateTokenRefresh,
  validateTokenVerification
};