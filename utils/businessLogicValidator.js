/**
 * Business Logic Validation Utility
 * Provides validation functions for business rules and edge cases
 */

/**
 * Custom business logic error class
 */
class BusinessLogicError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'BusinessLogicError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Wallet validation utilities
 */
class WalletValidator {
  /**
   * Validate wallet amount before purchase
   * @param {number} currentWallet - Current wallet amount
   * @param {number} requiredAmount - Required amount for purchase
   * @param {number} userId - User ID for logging
   * @throws {BusinessLogicError} If wallet validation fails
   */
  static validateSufficientFunds(currentWallet, requiredAmount, userId) {
    if (typeof currentWallet !== 'number' || currentWallet < 0) {
      throw new BusinessLogicError(
        'ข้อมูลยอดเงินไม่ถูกต้อง',
        'INVALID_WALLET_AMOUNT',
        { currentWallet, userId }
      );
    }

    if (typeof requiredAmount !== 'number' || requiredAmount <= 0) {
      throw new BusinessLogicError(
        'จำนวนเงินที่ต้องการไม่ถูกต้อง',
        'INVALID_REQUIRED_AMOUNT',
        { requiredAmount, userId }
      );
    }

    if (currentWallet < requiredAmount) {
      throw new BusinessLogicError(
        `ยอดเงินไม่เพียงพอ ต้องการ ${requiredAmount.toFixed(2)} บาท มีอยู่ ${currentWallet.toFixed(2)} บาท`,
        'INSUFFICIENT_FUNDS',
        { 
          currentWallet, 
          requiredAmount, 
          shortfall: requiredAmount - currentWallet,
          userId 
        }
      );
    }
  }

  /**
   * Validate wallet amount for updates
   * @param {number} amount - Amount to validate
   * @param {string} operation - Operation type (add/deduct)
   * @throws {BusinessLogicError} If amount validation fails
   */
  static validateWalletAmount(amount, operation = 'update') {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new BusinessLogicError(
        'จำนวนเงินต้องเป็นตัวเลข',
        'INVALID_AMOUNT_FORMAT',
        { amount, operation }
      );
    }

    if (amount < 0) {
      throw new BusinessLogicError(
        'จำนวนเงินต้องมากกว่าหรือเท่ากับ 0',
        'NEGATIVE_AMOUNT',
        { amount, operation }
      );
    }

    if (amount > 1000000) {
      throw new BusinessLogicError(
        'จำนวนเงินเกินขีดจำกัดที่อนุญาต (1,000,000 บาท)',
        'AMOUNT_EXCEEDS_LIMIT',
        { amount, operation, limit: 1000000 }
      );
    }
  }
}

/**
 * Ticket validation utilities
 */
class TicketValidator {
  /**
   * Validate ticket availability with race condition handling
   * @param {Array} requestedTicketIds - Array of requested ticket IDs
   * @param {Array} availableTickets - Array of available tickets from database
   * @param {number} userId - User ID for logging
   * @throws {BusinessLogicError} If ticket validation fails
   */
  static validateTicketAvailability(requestedTicketIds, availableTickets, userId) {
    if (!Array.isArray(requestedTicketIds) || requestedTicketIds.length === 0) {
      throw new BusinessLogicError(
        'กรุณาเลือกลอตเตอรี่ที่ต้องการซื้อ',
        'NO_TICKETS_SELECTED',
        { userId }
      );
    }

    if (requestedTicketIds.length > 50) {
      throw new BusinessLogicError(
        'ไม่สามารถซื้อลอตเตอรี่เกิน 50 ใบในครั้งเดียว',
        'TOO_MANY_TICKETS',
        { requestedCount: requestedTicketIds.length, maxAllowed: 50, userId }
      );
    }

    // Check for duplicate ticket IDs in request
    const uniqueIds = new Set(requestedTicketIds);
    if (uniqueIds.size !== requestedTicketIds.length) {
      throw new BusinessLogicError(
        'พบลอตเตอรี่ซ้ำในรายการที่เลือก',
        'DUPLICATE_TICKETS_IN_REQUEST',
        { requestedTicketIds, userId }
      );
    }

    // Check if all requested tickets are available
    const availableTicketIds = new Set(availableTickets.map(ticket => ticket.ticket_id));
    const unavailableTickets = requestedTicketIds.filter(id => !availableTicketIds.has(id));

    if (unavailableTickets.length > 0) {
      throw new BusinessLogicError(
        `ลอตเตอรี่บางใบไม่พร้อมใช้งาน (${unavailableTickets.length} ใบ)`,
        'TICKETS_NOT_AVAILABLE',
        { 
          unavailableTickets, 
          requestedCount: requestedTicketIds.length,
          availableCount: availableTickets.length,
          userId 
        }
      );
    }
  }

  /**
   * Validate ticket ownership for prize claiming
   * @param {Object} ticket - Ticket object from database
   * @param {number} userId - User ID claiming the prize
   * @param {string} ticketNumber - Ticket number being claimed
   * @throws {BusinessLogicError} If ownership validation fails
   */
  static validateTicketOwnership(ticket, userId, ticketNumber) {
    if (!ticket) {
      throw new BusinessLogicError(
        `ไม่พบลอตเตอรี่หมายเลข ${ticketNumber}`,
        'TICKET_NOT_FOUND',
        { ticketNumber, userId }
      );
    }

    if (ticket.created_by !== userId) {
      throw new BusinessLogicError(
        'คุณไม่ใช่เจ้าของลอตเตอรี่นี้',
        'NOT_TICKET_OWNER',
        { ticketNumber, userId, actualOwner: ticket.created_by }
      );
    }

    if (ticket.status !== 'sold') {
      throw new BusinessLogicError(
        'ลอตเตอรี่นี้ยังไม่ได้ซื้อหรือมีสถานะไม่ถูกต้อง',
        'INVALID_TICKET_STATUS',
        { ticketNumber, userId, status: ticket.status }
      );
    }
  }

  /**
   * Validate ticket numbers format
   * @param {Array} ticketNumbers - Array of ticket numbers
   * @throws {BusinessLogicError} If format validation fails
   */
  static validateTicketNumbersFormat(ticketNumbers) {
    if (!Array.isArray(ticketNumbers)) {
      throw new BusinessLogicError(
        'หมายเลขลอตเตอรี่ต้องเป็น array',
        'INVALID_TICKET_NUMBERS_FORMAT',
        { ticketNumbers }
      );
    }

    const invalidNumbers = ticketNumbers.filter(num => 
      typeof num !== 'string' || !/^[0-9]{6}$/.test(num)
    );

    if (invalidNumbers.length > 0) {
      throw new BusinessLogicError(
        'หมายเลขลอตเตอรี่ต้องเป็นตัวเลข 6 หลัก',
        'INVALID_TICKET_NUMBER_FORMAT',
        { invalidNumbers }
      );
    }
  }
}

/**
 * Prize validation utilities
 */
class PrizeValidator {
  /**
   * Validate prize claiming eligibility
   * @param {Object} ticket - Ticket object
   * @param {Object} prize - Prize object (if exists)
   * @param {string} ticketNumber - Ticket number
   * @param {number} userId - User ID
   * @throws {BusinessLogicError} If prize validation fails
   */
  static validatePrizeClaimEligibility(ticket, prize, ticketNumber, userId) {
    if (!prize) {
      throw new BusinessLogicError(
        `ลอตเตอรี่หมายเลข ${ticketNumber} ไม่ถูกรางวัล`,
        'NOT_WINNER',
        { ticketNumber, userId }
      );
    }

    if (prize.claimed) {
      throw new BusinessLogicError(
        'รางวัลนี้ถูกขึ้นเงินแล้ว',
        'ALREADY_CLAIMED',
        { ticketNumber, userId, prizeId: prize.prize_id }
      );
    }

    if (ticket.status === 'claimed') {
      throw new BusinessLogicError(
        'ลอตเตอรี่นี้ถูกขึ้นเงินแล้ว',
        'TICKET_ALREADY_CLAIMED',
        { ticketNumber, userId }
      );
    }
  }

  /**
   * Validate prize amount
   * @param {number} amount - Prize amount
   * @throws {BusinessLogicError} If amount validation fails
   */
  static validatePrizeAmount(amount) {
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      throw new BusinessLogicError(
        'จำนวนเงินรางวัลไม่ถูกต้อง',
        'INVALID_PRIZE_AMOUNT',
        { amount }
      );
    }

    if (amount > 10000000) {
      throw new BusinessLogicError(
        'จำนวนเงินรางวัลเกินขีดจำกัดที่อนุญาต',
        'PRIZE_AMOUNT_EXCEEDS_LIMIT',
        { amount, limit: 10000000 }
      );
    }
  }
}

/**
 * User validation utilities
 */
class UserValidator {
  /**
   * Validate user existence and status
   * @param {Object} user - User object
   * @param {number} userId - User ID
   * @throws {BusinessLogicError} If user validation fails
   */
  static validateUserExists(user, userId) {
    if (!user) {
      throw new BusinessLogicError(
        'ไม่พบผู้ใช้',
        'USER_NOT_FOUND',
        { userId }
      );
    }
  }

  /**
   * Validate user permissions for operation
   * @param {Object} user - User object
   * @param {string} requiredRole - Required role (admin, owner)
   * @param {string} operation - Operation being performed
   * @throws {BusinessLogicError} If permission validation fails
   */
  static validateUserPermissions(user, requiredRole, operation) {
    if (!user) {
      throw new BusinessLogicError(
        'ไม่พบข้อมูลผู้ใช้',
        'USER_NOT_FOUND',
        { operation }
      );
    }

    const userRoles = ['member', 'admin', 'owner'];
    const requiredRoleIndex = userRoles.indexOf(requiredRole);
    const userRoleIndex = userRoles.indexOf(user.role);

    if (userRoleIndex < requiredRoleIndex) {
      throw new BusinessLogicError(
        `ต้องมีสิทธิ์ ${requiredRole} ขึ้นไปเพื่อทำการ${operation}`,
        'INSUFFICIENT_PERMISSIONS',
        { userRole: user.role, requiredRole, operation }
      );
    }
  }
}

/**
 * Draw validation utilities
 */
class DrawValidator {
  /**
   * Validate draw parameters
   * @param {string} poolType - Pool type (sold/all)
   * @param {Array} prizeStructure - Prize structure array
   * @throws {BusinessLogicError} If draw validation fails
   */
  static validateDrawParameters(poolType, prizeStructure) {
    if (!['sold', 'all'].includes(poolType)) {
      throw new BusinessLogicError(
        'ประเภทการออกรางวัลต้องเป็น "sold" หรือ "all"',
        'INVALID_POOL_TYPE',
        { poolType }
      );
    }

    if (!Array.isArray(prizeStructure) || prizeStructure.length === 0) {
      throw new BusinessLogicError(
        'กรุณาระบุโครงสร้างรางวัล',
        'MISSING_PRIZE_STRUCTURE',
        { prizeStructure }
      );
    }

    // Validate each prize in structure
    prizeStructure.forEach((prize, index) => {
      if (!prize.rank || !prize.amount) {
        throw new BusinessLogicError(
          `โครงสร้างรางวัลไม่ถูกต้องที่ตำแหน่ง ${index + 1}`,
          'INVALID_PRIZE_STRUCTURE',
          { prize, index }
        );
      }

      if (typeof prize.rank !== 'number' || prize.rank <= 0) {
        throw new BusinessLogicError(
          `อันดับรางวัลต้องเป็นตัวเลขที่มากกว่า 0 (ตำแหน่ง ${index + 1})`,
          'INVALID_PRIZE_RANK',
          { prize, index }
        );
      }

      PrizeValidator.validatePrizeAmount(prize.amount);
    });

    // Check for duplicate ranks
    const ranks = prizeStructure.map(p => p.rank);
    const uniqueRanks = new Set(ranks);
    if (uniqueRanks.size !== ranks.length) {
      throw new BusinessLogicError(
        'พบอันดับรางวัลซ้ำในโครงสร้าง',
        'DUPLICATE_PRIZE_RANKS',
        { ranks }
      );
    }
  }
}

/**
 * Rate limiting validation
 */
class RateLimitValidator {
  static requestCounts = new Map();

  /**
   * Validate request rate for user operations
   * @param {number} userId - User ID
   * @param {string} operation - Operation type
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @throws {BusinessLogicError} If rate limit exceeded
   */
  static validateRequestRate(userId, operation, maxRequests = 10, windowMs = 60000) {
    const key = `${userId}_${operation}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.requestCounts.has(key)) {
      this.requestCounts.set(key, []);
    }

    const requests = this.requestCounts.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart);
    this.requestCounts.set(key, validRequests);

    if (validRequests.length >= maxRequests) {
      throw new BusinessLogicError(
        `คำขอมากเกินไป สำหรับการ${operation} กรุณาลองใหม่ภายหลัง`,
        'RATE_LIMIT_EXCEEDED',
        { 
          userId, 
          operation, 
          requestCount: validRequests.length, 
          maxRequests,
          windowMs 
        }
      );
    }

    // Add current request
    validRequests.push(now);
    this.requestCounts.set(key, validRequests);
  }

  /**
   * Clear rate limit data for a user (for testing or admin purposes)
   * @param {number} userId - User ID
   * @param {string} operation - Operation type (optional)
   */
  static clearRateLimit(userId, operation = null) {
    if (operation) {
      const key = `${userId}_${operation}`;
      this.requestCounts.delete(key);
    } else {
      // Clear all operations for the user
      const keysToDelete = [];
      for (const key of this.requestCounts.keys()) {
        if (key.startsWith(`${userId}_`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.requestCounts.delete(key));
    }
  }

  /**
   * Clean up old rate limit data periodically
   */
  static cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [key, requests] of this.requestCounts.entries()) {
      const validRequests = requests.filter(time => (now - time) < maxAge);
      if (validRequests.length === 0) {
        this.requestCounts.delete(key);
      } else {
        this.requestCounts.set(key, validRequests);
      }
    }
  }
}

/**
 * System validation utilities
 */
class SystemValidator {
  /**
   * Validate system resources before heavy operations
   * @param {string} operation - Operation being performed
   * @throws {BusinessLogicError} If system resources are insufficient
   */
  static validateSystemResources(operation) {
    // Check memory usage (simplified check)
    const memUsage = process.memoryUsage();
    const maxHeapUsed = 500 * 1024 * 1024; // 500MB limit
    
    if (memUsage.heapUsed > maxHeapUsed) {
      throw new BusinessLogicError(
        'ระบบมีการใช้งานหน่วยความจำสูง กรุณาลองใหม่ภายหลัง',
        'HIGH_MEMORY_USAGE',
        { operation, memUsage: Math.round(memUsage.heapUsed / 1024 / 1024) }
      );
    }
  }

  /**
   * Validate concurrent operations limit
   * @param {string} operation - Operation type
   * @param {number} maxConcurrent - Maximum concurrent operations
   * @throws {BusinessLogicError} If too many concurrent operations
   */
  static validateConcurrentOperations(operation, maxConcurrent = 10) {
    if (!this.concurrentOps) {
      this.concurrentOps = new Map();
    }

    const current = this.concurrentOps.get(operation) || 0;
    
    if (current >= maxConcurrent) {
      throw new BusinessLogicError(
        `มีการดำเนินการ ${operation} พร้อมกันมากเกินไป กรุณาลองใหม่ภายหลัง`,
        'TOO_MANY_CONCURRENT_OPERATIONS',
        { operation, current, maxConcurrent }
      );
    }

    // Increment counter
    this.concurrentOps.set(operation, current + 1);

    // Return cleanup function
    return () => {
      const newCount = this.concurrentOps.get(operation) - 1;
      if (newCount <= 0) {
        this.concurrentOps.delete(operation);
      } else {
        this.concurrentOps.set(operation, newCount);
      }
    };
  }
}

/**
 * Input sanitization utilities
 */
class InputValidator {
  /**
   * Sanitize and validate string input
   * @param {string} input - Input string
   * @param {string} fieldName - Field name for error messages
   * @param {Object} options - Validation options
   * @throws {BusinessLogicError} If validation fails
   */
  static validateString(input, fieldName, options = {}) {
    const { 
      required = false, 
      minLength = 0, 
      maxLength = 255, 
      pattern = null,
      allowEmpty = false 
    } = options;

    if (required && (!input || input.trim() === '')) {
      throw new BusinessLogicError(
        `กรุณาระบุ${fieldName}`,
        'REQUIRED_FIELD_MISSING',
        { fieldName }
      );
    }

    if (!allowEmpty && input && input.trim() === '') {
      throw new BusinessLogicError(
        `${fieldName}ไม่สามารถเป็นค่าว่างได้`,
        'EMPTY_FIELD_NOT_ALLOWED',
        { fieldName }
      );
    }

    if (input && typeof input !== 'string') {
      throw new BusinessLogicError(
        `${fieldName}ต้องเป็นข้อความ`,
        'INVALID_STRING_TYPE',
        { fieldName, type: typeof input }
      );
    }

    if (input && input.length < minLength) {
      throw new BusinessLogicError(
        `${fieldName}ต้องมีความยาวอย่างน้อย ${minLength} ตัวอักษร`,
        'STRING_TOO_SHORT',
        { fieldName, minLength, actualLength: input.length }
      );
    }

    if (input && input.length > maxLength) {
      throw new BusinessLogicError(
        `${fieldName}ต้องมีความยาวไม่เกิน ${maxLength} ตัวอักษร`,
        'STRING_TOO_LONG',
        { fieldName, maxLength, actualLength: input.length }
      );
    }

    if (input && pattern && !pattern.test(input)) {
      throw new BusinessLogicError(
        `รูปแบบ${fieldName}ไม่ถูกต้อง`,
        'INVALID_STRING_PATTERN',
        { fieldName }
      );
    }

    return input ? input.trim() : input;
  }

  /**
   * Validate numeric input
   * @param {any} input - Input value
   * @param {string} fieldName - Field name for error messages
   * @param {Object} options - Validation options
   * @throws {BusinessLogicError} If validation fails
   */
  static validateNumber(input, fieldName, options = {}) {
    const { 
      required = false, 
      min = null, 
      max = null, 
      integer = false 
    } = options;

    if (required && (input === null || input === undefined)) {
      throw new BusinessLogicError(
        `กรุณาระบุ${fieldName}`,
        'REQUIRED_FIELD_MISSING',
        { fieldName }
      );
    }

    if (input !== null && input !== undefined) {
      const num = parseFloat(input);
      
      if (isNaN(num)) {
        throw new BusinessLogicError(
          `${fieldName}ต้องเป็นตัวเลข`,
          'INVALID_NUMBER_TYPE',
          { fieldName, input }
        );
      }

      if (integer && !Number.isInteger(num)) {
        throw new BusinessLogicError(
          `${fieldName}ต้องเป็นจำนวนเต็ม`,
          'INVALID_INTEGER',
          { fieldName, input: num }
        );
      }

      if (min !== null && num < min) {
        throw new BusinessLogicError(
          `${fieldName}ต้องมากกว่าหรือเท่ากับ ${min}`,
          'NUMBER_TOO_SMALL',
          { fieldName, min, actual: num }
        );
      }

      if (max !== null && num > max) {
        throw new BusinessLogicError(
          `${fieldName}ต้องน้อยกว่าหรือเท่ากับ ${max}`,
          'NUMBER_TOO_LARGE',
          { fieldName, max, actual: num }
        );
      }

      return num;
    }

    return input;
  }
}

module.exports = {
  BusinessLogicError,
  WalletValidator,
  TicketValidator,
  PrizeValidator,
  UserValidator,
  DrawValidator,
  RateLimitValidator,
  SystemValidator,
  InputValidator
};