const { getConnection } = require('../config/database');

/**
 * User database service operations
 */
class UserService {
  /**
   * Find user by username
   * @param {string} username - Username to search for
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findByUsername(username) {
    const connection = await getConnection();
    try {
      const [users] = await connection.execute(
        'SELECT user_id, username, role, wallet, email, phone, password FROM User WHERE username = ?',
        [username]
      );
      return users.length > 0 ? users[0] : null;
    } finally {
      await connection.end();
    }
  }

  /**
   * Find user by ID
   * @param {number} userId - User ID to search for
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findById(userId) {
    const connection = await getConnection();
    try {
      const [users] = await connection.execute(
        'SELECT user_id, username, role, wallet, email, phone FROM User WHERE user_id = ?',
        [userId]
      );
      return users.length > 0 ? users[0] : null;
    } finally {
      await connection.end();
    }
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
   * Create new user
   * @param {Object} userData - User data to insert
   * @returns {Promise<Object>} Created user object
   */
  static async create(userData) {
    const { username, email, phone, role = 'member', password, wallet } = userData;
    
    const connection = await getConnection();
    try {
      const insertQuery = `
        INSERT INTO User (username, email, phone, role, password, wallet) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(insertQuery, [
        username, email, phone, role, password, parseFloat(wallet)
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