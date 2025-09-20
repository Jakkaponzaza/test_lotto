const mysql = require('mysql2/promise');

/**
 * Database Error Handler Utility
 * Provides connection retry logic, transaction management, and error logging
 */
class DatabaseErrorHandler {
  constructor() {
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
    this.maxDelay = 10000; // 10 seconds
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate exponential backoff delay
   * @param {number} attempt - Current attempt number (0-based)
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt) {
    const delay = this.baseDelay * Math.pow(2, attempt);
    return Math.min(delay, this.maxDelay);
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Database error
   * @returns {boolean} True if error should be retried
   */
  isRetryableError(error) {
    const retryableCodes = [
      'ECONNRESET',
      'ECONNREFUSED', 
      'ETIMEDOUT',
      'ENOTFOUND',
      'ER_LOCK_WAIT_TIMEOUT',
      'ER_LOCK_DEADLOCK',
      'ER_CON_COUNT_ERROR',
      'ER_TOO_MANY_USER_CONNECTIONS'
    ];

    return retryableCodes.includes(error.code) || 
           retryableCodes.includes(error.errno) ||
           error.message.includes('Connection lost') ||
           error.message.includes('server has gone away');
  }

  /**
   * Log database error with context
   * @param {Error} error - Database error
   * @param {string} operation - Operation being performed
   * @param {number} attempt - Current attempt number
   * @param {Object} context - Additional context
   */
  logError(error, operation, attempt = 0, context = {}) {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      operation,
      attempt: attempt + 1,
      error: {
        code: error.code,
        errno: error.errno,
        message: error.message,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      },
      context
    };

    console.error(`[DB ERROR] ${operation}:`, JSON.stringify(errorInfo, null, 2));
  }

  /**
   * Execute database operation with retry logic
   * @param {Function} operation - Async function that returns a connection and performs the operation
   * @param {string} operationName - Name of the operation for logging
   * @param {Object} context - Additional context for logging
   * @returns {Promise} Result of the operation
   */
  async executeWithRetry(operation, operationName, context = {}) {
    let lastError;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logError(error, operationName, attempt, context);

        // If this is the last attempt or error is not retryable, throw
        if (attempt === this.maxRetries - 1 || !this.isRetryableError(error)) {
          throw this.enhanceError(error, operationName, attempt + 1);
        }

        // Wait before retrying
        const delay = this.calculateDelay(attempt);
        console.log(`[DB RETRY] Retrying ${operationName} in ${delay}ms (attempt ${attempt + 2}/${this.maxRetries})`);
        await this.sleep(delay);
      }
    }

    throw this.enhanceError(lastError, operationName, this.maxRetries);
  }

  /**
   * Execute database operation with transaction and retry logic
   * @param {Function} operation - Async function that receives connection and performs operations
   * @param {Function} getConnection - Function to get database connection
   * @param {string} operationName - Name of the operation for logging
   * @param {Object} context - Additional context for logging
   * @returns {Promise} Result of the operation
   */
  async executeTransaction(operation, getConnection, operationName, context = {}) {
    return this.executeWithRetry(async () => {
      const connection = await getConnection();
      
      try {
        await connection.beginTransaction();
        console.log(`[DB TRANSACTION] Started: ${operationName}`);
        
        const result = await operation(connection);
        
        await connection.commit();
        console.log(`[DB TRANSACTION] Committed: ${operationName}`);
        
        return result;
      } catch (error) {
        try {
          await connection.rollback();
          console.log(`[DB TRANSACTION] Rolled back: ${operationName}`);
        } catch (rollbackError) {
          console.error(`[DB TRANSACTION] Rollback failed for ${operationName}:`, rollbackError);
        }
        throw error;
      } finally {
        try {
          await connection.end();
        } catch (closeError) {
          console.error(`[DB CONNECTION] Failed to close connection for ${operationName}:`, closeError);
        }
      }
    }, operationName, context);
  }

  /**
   * Execute simple database operation with retry logic
   * @param {Function} operation - Async function that receives connection and performs operations
   * @param {Function} getConnection - Function to get database connection
   * @param {string} operationName - Name of the operation for logging
   * @param {Object} context - Additional context for logging
   * @returns {Promise} Result of the operation
   */
  async executeQuery(operation, getConnection, operationName, context = {}) {
    return this.executeWithRetry(async () => {
      const connection = await getConnection();
      
      try {
        return await operation(connection);
      } finally {
        try {
          await connection.end();
        } catch (closeError) {
          console.error(`[DB CONNECTION] Failed to close connection for ${operationName}:`, closeError);
        }
      }
    }, operationName, context);
  }

  /**
   * Enhance error with additional context
   * @param {Error} error - Original error
   * @param {string} operation - Operation name
   * @param {number} attempts - Number of attempts made
   * @returns {Error} Enhanced error
   */
  enhanceError(error, operation, attempts) {
    const enhancedError = new Error(`Database operation '${operation}' failed after ${attempts} attempts: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.operation = operation;
    enhancedError.attempts = attempts;
    enhancedError.code = error.code;
    enhancedError.errno = error.errno;
    enhancedError.sqlState = error.sqlState;
    enhancedError.sqlMessage = error.sqlMessage;
    
    return enhancedError;
  }

  /**
   * Validate connection before use
   * @param {Object} connection - Database connection
   * @returns {Promise<boolean>} True if connection is valid
   */
  async validateConnection(connection) {
    try {
      await connection.execute('SELECT 1');
      return true;
    } catch (error) {
      console.error('[DB CONNECTION] Connection validation failed:', error);
      return false;
    }
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - Database error
   * @returns {string} User-friendly error message
   */
  getUserFriendlyMessage(error) {
    const errorMappings = {
      'ER_DUP_ENTRY': 'ข้อมูลซ้ำ กรุณาตรวจสอบข้อมูลที่กรอก',
      'ER_NO_REFERENCED_ROW_2': 'ข้อมูลอ้างอิงไม่ถูกต้อง',
      'ER_ROW_IS_REFERENCED_2': 'ไม่สามารถลบข้อมูลได้ เนื่องจากมีข้อมูลอื่นที่เกี่ยวข้อง',
      'ER_DATA_TOO_LONG': 'ข้อมูลยาวเกินไป',
      'ER_BAD_NULL_ERROR': 'ข้อมูลที่จำเป็นไม่ได้ระบุ',
      'ER_LOCK_WAIT_TIMEOUT': 'ระบบกำลังประมวลผล กรุณาลองใหม่อีกครั้ง',
      'ER_LOCK_DEADLOCK': 'เกิดข้อขัดแย้งในการประมวลผล กรุณาลองใหม่อีกครั้ง',
      'ECONNREFUSED': 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้',
      'ETIMEDOUT': 'การเชื่อมต่อฐานข้อมูลหมดเวลา',
      'ER_ACCESS_DENIED_ERROR': 'ไม่มีสิทธิ์เข้าถึงฐานข้อมูล'
    };

    return errorMappings[error.code] || 
           errorMappings[error.errno] || 
           'เกิดข้อผิดพลาดในระบบฐานข้อมูล กรุณาลองใหม่อีกครั้ง';
  }
}

// Create singleton instance
const databaseErrorHandler = new DatabaseErrorHandler();

module.exports = {
  DatabaseErrorHandler,
  databaseErrorHandler
};