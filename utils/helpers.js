/**
 * Utility functions for validation and helpers
 */

/**
 * Validate login input
 * @param {Object} data - Login data {username, password}
 * @returns {Object} Validation result {isValid, error}
 */
function validateLoginInput(data) {
  const { username, password } = data;

  if (!username || !password) {
    return { isValid: false, error: 'กรุณาระบุ username และ password' };
  }

  return { isValid: true };
}

/**
 * Validate registration input
 * @param {Object} data - Registration data
 * @returns {Object} Validation result {isValid, error}
 */
function validateRegistrationInput(data) {
  const { username, email, phone, password, wallet } = data;

  if (!username || !email || !phone || !password) {
    return { isValid: false, error: 'กรุณาระบุข้อมูลให้ครบถ้วน' };
  }

  if (wallet === undefined || wallet === null) {
    return { isValid: false, error: 'กรุณาระบุจำนวนเงินเริ่มต้น' };
  }

  const walletAmount = parseFloat(wallet);
  if (isNaN(walletAmount) || walletAmount < 0) {
    return { isValid: false, error: 'จำนวนเงินไม่ถูกต้อง' };
  }

  return { isValid: true, walletAmount };
}

/**
 * Validate ticket purchase input
 * @param {Object} data - Purchase data {ticketIds}
 * @returns {Object} Validation result {isValid, error}
 */
function validatePurchaseInput(data) {
  const { ticketIds } = data;

  if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
    return { isValid: false, error: 'กรุณาเลือกลอตเตอรี่ที่ต้องการซื้อ' };
  }

  return { isValid: true };
}

/**
 * Validate draw prizes input
 * @param {Object} data - Draw data {poolType, rewards}
 * @returns {Object} Validation result {isValid, error}
 */
function validateDrawInput(data) {
  const { poolType, rewards } = data;

  if (!poolType || !rewards || !Array.isArray(rewards) || rewards.length !== 5) {
    return { isValid: false, error: 'ข้อมูลไม่ถูกต้อง กรุณาระบุประเภทพูลและรางวัล 5 รางวัล' };
  }

  if (rewards.some(r => !r || r <= 0)) {
    return { isValid: false, error: 'กรุณาระบุจำนวนเงินรางวัลให้ถูกต้อง' };
  }

  return { isValid: true };
}

/**
 * Validate prize claim input
 * @param {Object} data - Claim data {userId, ticketNumber}
 * @returns {Object} Validation result {isValid, error}
 */
function validateClaimInput(data) {
  const { userId, ticketNumber } = data;

  if (!userId || !ticketNumber) {
    return { isValid: false, error: 'ข้อมูลไม่ครบถ้วน' };
  }

  return { isValid: true };
}

/**
 * Generate random lottery numbers
 * @param {number} count - Number of tickets to generate
 * @returns {Array} Array of unique 6-digit numbers
 */
function generateLotteryNumbers(count) {
  const numbersSet = new Set();
  
  while (numbersSet.size < count) {
    const n = Math.floor(Math.random() * 1000000); // 0-999999
    const s = n.toString().padStart(6, '0'); // เติม 0 ข้างหน้าให้ครบ 6 หลัก
    numbersSet.add(s);
  }
  
  return Array.from(numbersSet);
}

/**
 * Create user response object
 * @param {Object} user - User object from database
 * @param {string} type - Response type ('login' or 'register')
 * @returns {Object} Formatted user response
 */
function createUserResponse(user, type = 'login') {
  return {
    user_id: user.user_id,
    username: user.username,
    role: user.role,
    wallet: parseFloat(user.wallet),
    initial_wallet: parseFloat(user.wallet),
    current_wallet: parseFloat(user.wallet),
    email: user.email,
    phone: user.phone,
    password_hash: `${type}_hash`,
    password_algo: 'bcrypt',
    email_verified_at: null,
    phone_verified_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Format draw result for client
 * @param {Object} drawData - Draw data {poolType, winners}
 * @param {Array} prizes - Prize records from database
 * @returns {Object} Formatted draw result
 */
function formatDrawResult(drawData, prizes) {
  return {
    id: `draw_${Date.now()}`,
    poolType: drawData.poolType,
    createdAt: drawData.drawDate,
    prizes: prizes.map((p, index) => ({
      tier: p.rank,
      ticketId: drawData.winners[index] ? drawData.winners[index].ticketNumber : `หมายเลข ${p.rank}`,
      amount: parseFloat(p.amount),
      claimed: false
    })),
    winners: {
      'รางวัลที่ 1': drawData.winners[0] ? [drawData.winners[0].ticketNumber] : [],
      'รางวัลที่ 2': drawData.winners[1] ? [drawData.winners[1].ticketNumber] : [],
      'รางวัลที่ 3': drawData.winners[2] ? [drawData.winners[2].ticketNumber] : [],
      'รางวัลที่ 4': drawData.winners[3] ? [drawData.winners[3].ticketNumber] : [],
      'รางวัลที่ 5': drawData.winners[4] ? [drawData.winners[4].ticketNumber] : [],
    }
  };
}

/**
 * Get existing user error message
 * @param {Object} existingUser - Existing user object
 * @param {string} username - Username being registered
 * @param {string} email - Email being registered
 * @param {string} phone - Phone being registered
 * @returns {string} Error message
 */
function getExistingUserError(existingUser, username, email, phone) {
  if (existingUser.username === username) {
    return 'ชื่อผู้ใช้ถูกใช้แล้ว';
  }
  if (existingUser.email === email) {
    return 'อีเมลนี้ถูกใช้แล้ว';
  }
  if (existingUser.phone === phone) {
    return 'หมายเลขโทรศัพท์นี้ถูกใช้แล้ว';
  }
  return 'ข้อมูลผู้ใช้ซ้ำ';
}

/**
 * Initialize global variables
 */
function initializeGlobals() {
  if (!global.lastDrawResult) {
    global.lastDrawResult = null;
  }
  if (!global.claimedTickets) {
    global.claimedTickets = new Set();
  }
}

module.exports = {
  validateLoginInput,
  validateRegistrationInput,
  validatePurchaseInput,
  validateDrawInput,
  validateClaimInput,
  generateLotteryNumbers,
  createUserResponse,
  formatDrawResult,
  getExistingUserError,
  initializeGlobals
};