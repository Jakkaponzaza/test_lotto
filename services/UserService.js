const { getConnection } = require('../config/database');
const { databaseErrorHandler } = require('../utils/databaseErrorHandler');
const {
  WalletValidator,
  UserValidator,
  RateLimitValidator
} = require('../utils/businessLogicValidator');
const bcrypt = require('bcrypt');

/**
 * User database service operations with business logic
 */
class UserService {
  /**
   * Find user by username
   * @param {string} username - Username to search for
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findByUsername(username) {
    return databaseErrorHandler.executeQuery(async (connection) => {
      const [users] = await connection.execute(
        'SELECT user_id, username, role, wallet, email, phone, password FROM User WHERE username = ?',
        [username]
      );
      return users.length > 0 ? users[0] : null;
    }, getConnection, 'findByUsername', { username });
  }

  /**
   * Find user by ID
   * @param {number} userId - User ID to search for
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findById(userId) {
    return databaseErrorHandler.executeQuery(async (connection) => {
      const [users] = await connection.execute(
        'SELECT user_id, username, role, wallet, email, phone FROM User WHERE user_id = ?',
        [userId]
      );
      return users.length > 0 ? users[0] : null;
    }, getConnection, 'findById', { userId });
  }

  /**
   * Check if user exists by username, email, or phone
   * @param {string} username - Username to check
   * @param {string} email - Email to check
   * @param {string} phone - Phone to check
   * @returns {Promise<Object|null>} Existing user or null
   */
  static async findExisting(username, email, phone) {
    const connection = await getConnection();
    try {
      const [users] = await connection.execute(
        'SELECT user_id, username, email, phone FROM User WHERE username = ? OR email = ? OR phone = ?',
        [username, email, phone]
      );
      return users.length > 0 ? users[0] : null;
    } finally {
      await connection.end();
    }
  }

  /**
   * Create new user with password hashing
   * @param {Object} userData - User data to insert
   * @returns {Promise<Object>} Created user object
   */
  static async create(userData) {
    const { username, email, phone, role = 'member', password, wallet = 0 } = userData;

    // Store password as plain text (no hash)
    const plainPassword = password;

    const connection = await getConnection();
    try {
      const insertQuery = `
        INSERT INTO User (username, email, phone, role, password, wallet) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(insertQuery, [
        username, email, phone, role, plainPassword, parseFloat(wallet)
      ]);

      // Get created user
      const [newUser] = await connection.execute(
        'SELECT user_id, username, role, wallet, email, phone FROM User WHERE user_id = ?',
        [result.insertId]
      );

      return newUser[0];
    } finally {
      await connection.end();
    }
  }

  /**
   * Authenticate user with username and password
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @returns {Promise<Object|null>} User object if authenticated, null otherwise
   */
  static async authenticate(username, password) {
    const connection = await getConnection();
    try {
      const [users] = await connection.execute(
        'SELECT user_id, username, role, wallet, email, phone, password FROM User WHERE username = ?',
        [username]
      );

      if (users.length === 0) {
        return null;
      }

      const user = users[0];

      // Simple plain text password comparison (no hash)
      const isValidPassword = password === user.password;

      if (!isValidPassword) {
        return null;
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        wallet: parseFloat(userWithoutPassword.wallet),
        isAdmin: user.role === 'owner' || user.role === 'admin'
      };
    } finally {
      await connection.end();
    }
  }

  /**
   * Register new user with validation
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration result
   */
  static async register(userData) {
    const { username, email, phone, password, wallet = 0, role = 'member' } = userData;

    // Validate required fields
    if (!username || !password || !phone) {
      throw new Error('กรุณาระบุข้อมูลให้ครบถ้วน');
    }

    // Generate email if not provided or invalid
    let finalEmail = email;
    if (!email || !email.includes('@')) {
      finalEmail = `${phone}@gmail.com`;
    }

    // Check for existing users
    const existingUser = await this.findExisting(username, finalEmail, phone);
    if (existingUser) {
      if (existingUser.username === username) {
        throw new Error('ชื่อผู้ใช้ถูกใช้แล้ว');
      }
      if (existingUser.email === finalEmail) {
        throw new Error('อีเมลนี้ถูกใช้แล้ว');
      }
      if (existingUser.phone === phone) {
        throw new Error('หมายเลขโทรศัพท์นี้ถูกใช้แล้ว');
      }
    }

    // Create user
    const newUser = await this.create({
      username,
      email: finalEmail,
      phone,
      password,
      wallet,
      role
    });

    return {
      user: newUser,
      emailGenerated: !email || !email.includes('@')
    };
  }

  /**
   * Update user wallet
   * @param {number} userId - User ID
   * @param {number} newWallet - New wallet amount
   * @returns {Promise<boolean>} True if updated successfully
   */
  static async updateWallet(userId, newWallet) {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute(
        'UPDATE User SET wallet = ? WHERE user_id = ?',
        [newWallet, userId]
      );
      return result.affectedRows > 0;
    } finally {
      await connection.end();
    }
  }

  /**
   * Deduct amount from user wallet with validation
   * @param {number} userId - User ID
   * @param {number} amount - Amount to deduct
   * @returns {Promise<Object>} Result with success status and new wallet amount
   */
  static async deductFromWallet(userId, amount) {
    // Validate wallet amount
    WalletValidator.validateWalletAmount(amount, 'deduct');

    // Apply rate limiting for wallet operations
    RateLimitValidator.validateRequestRate(userId, 'wallet_deduct', 10, 60000); // 10 deductions per minute

    return databaseErrorHandler.executeTransaction(async (connection) => {
      // Get current wallet with row lock
      const [userResult] = await connection.execute(
        'SELECT wallet FROM User WHERE user_id = ? FOR UPDATE',
        [userId]
      );

      if (userResult.length === 0) {
        UserValidator.validateUserExists(null, userId);
      }

      const currentWallet = parseFloat(userResult[0].wallet);

      // Validate sufficient funds
      WalletValidator.validateSufficientFunds(currentWallet, amount, userId);

      const newWallet = currentWallet - amount;

      // Update wallet
      await connection.execute(
        'UPDATE User SET wallet = ? WHERE user_id = ?',
        [newWallet, userId]
      );

      return {
        success: true,
        newWallet: newWallet,
        deducted: amount
      };
    }, getConnection, 'deductFromWallet', { userId, amount });
  }

  /**
   * Add amount to user wallet
   * @param {number} userId - User ID
   * @param {number} amount - Amount to add
   * @returns {Promise<Object>} Result with new wallet amount
   */
  static async addToWallet(userId, amount) {
    // Validate wallet amount
    WalletValidator.validateWalletAmount(amount, 'add');

    // Apply rate limiting for wallet operations
    RateLimitValidator.validateRequestRate(userId, 'wallet_add', 10, 60000); // 10 additions per minute

    return databaseErrorHandler.executeTransaction(async (connection) => {
      // Get current wallet with row lock
      const [userResult] = await connection.execute(
        'SELECT wallet FROM User WHERE user_id = ? FOR UPDATE',
        [userId]
      );

      if (userResult.length === 0) {
        UserValidator.validateUserExists(null, userId);
      }

      const currentWallet = parseFloat(userResult[0].wallet);
      const newWallet = currentWallet + amount;

      // Validate the new wallet amount doesn't exceed limits
      WalletValidator.validateWalletAmount(newWallet, 'update');

      // Update wallet
      await connection.execute(
        'UPDATE User SET wallet = ? WHERE user_id = ?',
        [newWallet, userId]
      );

      return {
        success: true,
        newWallet: newWallet,
        added: amount
      };
    }, getConnection, 'addToWallet', { userId, amount });
  }

  /**
   * Get user wallet amount
   * @param {number} userId - User ID
   * @returns {Promise<number>} Wallet amount
   */
  static async getWallet(userId) {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute(
        'SELECT wallet FROM User WHERE user_id = ?',
        [userId]
      );
      return result.length > 0 ? parseFloat(result[0].wallet) : 0;
    } finally {
      await connection.end();
    }
  }

  /**
   * Get member count
   * @returns {Promise<number>} Number of members
   */
  static async getMemberCount() {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute(
        'SELECT COUNT(*) as total FROM User WHERE role = "member"'
      );
      return result[0].total;
    } finally {
      await connection.end();
    }
  }

  /**
   * Delete all member users (keep admin and owner)
   * @returns {Promise<number>} Number of deleted users
   */
  static async deleteMemberUsers() {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute(
        "DELETE FROM User WHERE role = 'member'"
      );
      return result.affectedRows;
    } finally {
      await connection.end();
    }
  }

  /**
   * Get admin user for system operations
   * @returns {Promise<Object|null>} Admin user object
   */
  static async getAdminUser() {
    const connection = await getConnection();
    try {
      const [adminUser] = await connection.execute(
        "SELECT user_id FROM User WHERE role IN ('owner', 'admin') ORDER BY user_id LIMIT 1"
      );
      return adminUser.length > 0 ? adminUser[0] : null;
    } finally {
      await connection.end();
    }
  }
}

module.exports = UserService;