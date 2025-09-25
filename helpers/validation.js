/**
 * Validation Helpers
 * ฟังก์ชันช่วยเหลือสำหรับการตรวจสอบข้อมูล
 */

const { VALIDATION } = require('../constants');

/**
 * Validate Username
 * @param {string} username - Username to validate
 * @returns {Object} - Validation result
 */
const validateUsername = (username) => {
  if (!username) {
    return { isValid: false, message: 'กรุณาระบุชื่อผู้ใช้' };
  }
  
  if (username.length < VALIDATION.USERNAME_MIN_LENGTH) {
    return { isValid: false, message: `ชื่อผู้ใช้ต้องมีอย่างน้อย ${VALIDATION.USERNAME_MIN_LENGTH} ตัวอักษร` };
  }
  
  if (username.length > VALIDATION.USERNAME_MAX_LENGTH) {
    return { isValid: false, message: `ชื่อผู้ใช้ต้องไม่เกิน ${VALIDATION.USERNAME_MAX_LENGTH} ตัวอักษร` };
  }
  
  return { isValid: true };
};

/**
 * Validate Password
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result
 */
const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: 'กรุณาระบุรหัสผ่าน' };
  }
  
  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return { isValid: false, message: `รหัสผ่านต้องมีอย่างน้อย ${VALIDATION.PASSWORD_MIN_LENGTH} ตัวอักษร` };
  }
  
  return { isValid: true };
};

/**
 * Validate Email
 * @param {string} email - Email to validate
 * @returns {Object} - Validation result
 */
const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, message: 'กรุณาระบุอีเมล' };
  }
  
  if (!VALIDATION.EMAIL_PATTERN.test(email)) {
    return { isValid: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  
  return { isValid: true };
};

/**
 * Validate Phone Number
 * @param {string} phone - Phone number to validate
 * @returns {Object} - Validation result
 */
const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: false, message: 'กรุณาระบุหมายเลขโทรศัพท์' };
  }
  
  if (!VALIDATION.PHONE_PATTERN.test(phone)) {
    return { isValid: false, message: 'หมายเลขโทรศัพท์ต้องเป็นตัวเลข 10 หลัก' };
  }
  
  return { isValid: true };
};

/**
 * Validate Ticket Number
 * @param {string} ticketNumber - Ticket number to validate
 * @returns {Object} - Validation result
 */
const validateTicketNumber = (ticketNumber) => {
  if (!ticketNumber) {
    return { isValid: false, message: 'กรุณาระบุหมายเลขตั๋ว' };
  }
  
  if (ticketNumber.length !== VALIDATION.TICKET_NUMBER_LENGTH) {
    return { isValid: false, message: `หมายเลขตั๋วต้องเป็นตัวเลข ${VALIDATION.TICKET_NUMBER_LENGTH} หลัก` };
  }
  
  if (!/^\d+$/.test(ticketNumber)) {
    return { isValid: false, message: 'หมายเลขตั๋วต้องเป็นตัวเลขเท่านั้น' };
  }
  
  return { isValid: true };
};

/**
 * Validate Registration Data
 * @param {Object} data - Registration data
 * @returns {Object} - Validation result
 */
const validateRegistrationData = (data) => {
  const errors = [];
  
  const usernameValidation = validateUsername(data.username);
  if (!usernameValidation.isValid) {
    errors.push({ field: 'username', message: usernameValidation.message });
  }
  
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    errors.push({ field: 'password', message: passwordValidation.message });
  }
  
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.push({ field: 'email', message: emailValidation.message });
  }
  
  const phoneValidation = validatePhone(data.phone);
  if (!phoneValidation.isValid) {
    errors.push({ field: 'phone', message: phoneValidation.message });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateUsername,
  validatePassword,
  validateEmail,
  validatePhone,
  validateTicketNumber,
  validateRegistrationData
};