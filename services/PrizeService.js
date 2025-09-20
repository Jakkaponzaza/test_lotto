const { getConnection } = require('../config/database');

/**
 * Prize database service operations
 */
class PrizeService {
  /**
   * Clear all prizes
   * @returns {Promise<number>} Number of deleted prizes
   */
  static async clearAllPrizes() {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute('DELETE FROM Prize');
      await connection.execute('ALTER TABLE Prize AUTO_INCREMENT = 1');
      return result.affectedRows;
    } finally {
      await connection.end();
    }
  }

  /**
   * Create prize records
   * @param {Array} prizeData - Array of prize data {rank, amount}
   * @returns {Promise<boolean>} True if created successfully
   */
  static async createPrizes(prizeData) {
    const connection = await getConnection();
    try {
      // Insert special metadata record (rank = 0)
      await connection.execute(
        'INSERT INTO Prize (amount, `rank`) VALUES (?, ?)',
        [0, 0]
      );

      // Insert individual prize records
      const prizePromises = prizeData.map(prize => {
        return connection.execute(
          'INSERT INTO Prize (amount, `rank`) VALUES (?, ?)',
          [prize.amount, prize.rank]
        );
      });

      await Promise.all(prizePromises);
      return true;
    } finally {
      await connection.end();
    }
  }

  /**
   * Get latest prizes (excluding metadata record)
   * @returns {Promise<Array>} Array of prize objects
   */
  static async getLatestPrizes() {
    const connection = await getConnection();
    try {
      const [prizes] = await connection.execute(
        'SELECT prize_id, amount, `rank` FROM Prize WHERE `rank` > 0 ORDER BY prize_id DESC LIMIT 5'
      );
      return prizes;
    } finally {
      await connection.end();
    }
  }

  /**
   * Get prizes ordered by rank
   * @returns {Promise<Array>} Array of prize objects ordered by rank
   */
  static async getPrizesByRank() {
    const connection = await getConnection();
    try {
      const [prizes] = await connection.execute(
        'SELECT prize_id, amount, `rank` FROM Prize WHERE `rank` > 0 ORDER BY `rank` ASC'
      );
      return prizes;
    } finally {
      await connection.end();
    }
  }
}

/**
 * Purchase database service operations
 */
class PurchaseService {
  /**
   * Create purchase record
   * @param {number} userId - User ID
   * @param {number} totalPrice - Total purchase price
   * @returns {Promise<number>} Purchase ID
   */
  static async createPurchase(userId, totalPrice) {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute(
        'INSERT INTO Purchase (user_id, date, total_price) VALUES (?, NOW(), ?)',
        [userId, totalPrice]
      );
      return result.insertId;
    } finally {
      await connection.end();
    }
  }

  /**
   * Delete all purchases
   * @returns {Promise<number>} Number of deleted purchases
   */
  static async deleteAllPurchases() {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute('DELETE FROM Purchase');
      await connection.execute('ALTER TABLE Purchase AUTO_INCREMENT = 1');
      return result.affectedRows;
    } finally {
      await connection.end();
    }
  }
}

module.exports = {
  PrizeService,
  PurchaseService
};