/**
 * Application Constants
 * ค่าคงที่ของแอปพลิเคชัน
 */

module.exports = {
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
  },

  // User Roles
  USER_ROLES: {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member'
  },

  // Ticket Status
  TICKET_STATUS: {
    AVAILABLE: 'available',
    SOLD: 'sold',
    RESERVED: 'reserved'
  },

  // Prize Ranks
  PRIZE_RANKS: {
    FIRST: 1,
    SECOND: 2,
    THIRD: 3,
    FOURTH: 4,
    FIFTH: 5
  },

  // Default Values
  DEFAULTS: {
    TICKET_PRICE: 80.00,
    INITIAL_WALLET: 0,
    TICKET_COUNT: 120,
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX: 100 // requests per window
  },

  // Error Messages (Thai)
  ERROR_MESSAGES: {
    INVALID_CREDENTIALS: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    USER_EXISTS: 'ชื่อผู้ใช้นี้มีอยู่แล้ว',
    EMAIL_EXISTS: 'อีเมลนี้มีอยู่แล้ว',
    PHONE_EXISTS: 'หมายเลขโทรศัพท์นี้มีอยู่แล้ว',
    INSUFFICIENT_FUNDS: 'เงินในกระเป๋าไม่เพียงพอ',
    TICKET_NOT_AVAILABLE: 'ตั๋วนี้ไม่สามารถซื้อได้',
    UNAUTHORIZED_ACCESS: 'ไม่มีสิทธิ์เข้าถึง',
    SYSTEM_ERROR: 'เกิดข้อผิดพลาดในระบบ',
    VALIDATION_ERROR: 'ข้อมูลไม่ถูกต้อง',
    NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ'
  },

  // Success Messages (Thai)
  SUCCESS_MESSAGES: {
    REGISTRATION_SUCCESS: 'สมัครสมาชิกสำเร็จ',
    LOGIN_SUCCESS: 'เข้าสู่ระบบสำเร็จ',
    LOGOUT_SUCCESS: 'ออกจากระบบสำเร็จ',
    PURCHASE_SUCCESS: 'ซื้อตั๋วสำเร็จ',
    PRIZE_CLAIMED: 'รับรางวัลสำเร็จ',
    UPDATE_SUCCESS: 'อัปเดตข้อมูลสำเร็จ',
    DELETE_SUCCESS: 'ลบข้อมูลสำเร็จ'
  },

  // Validation Rules
  VALIDATION: {
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 50,
    PASSWORD_MIN_LENGTH: 6,
    PHONE_PATTERN: /^[0-9]{10}$/,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    TICKET_NUMBER_LENGTH: 6
  }
};