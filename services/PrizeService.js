const { getConnection } = require('../config/database');
const { databaseErrorHandler } = require('../utils/databaseErrorHandler');

/**
 * Prize service - ใช้เฉพาะ table ที่มีใน database_me
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
   * Create prize records (ตรงกับ database_me schema)
   * @param {Array} prizeData - Array of prize data {rank, amount}
   * @returns {Promise<boolean>} True if created successfully
   */
  static async createPrizes(prizeData) {
    const connection = await getConnection();
    try {
      const prizePromises = prizeData.map(prize => {
        return connection.execute(
          'INSERT INTO Prize (amont, `rank`) VALUES (?, ?)',
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
   * Get latest prizes
   * @returns {Promise<Array>} Array of prizes
   */
  static async getLatestPrizes() {
    const connection = await getConnection();
    try {
      const [prizes] = await connection.execute(
        'SELECT prize_id, amont as amount, `rank` FROM Prize WHERE `rank` > 0 ORDER BY prize_id DESC LIMIT 5'
      );
      return prizes;
    } finally {
      await connection.end();
    }
  }

  /**
   * Get prizes by rank
   * @returns {Promise<Array>} Array of prizes ordered by rank
   */
  static async getPrizesByRank() {
    const connection = await getConnection();
    try {
      const [prizes] = await connection.execute(
        'SELECT prize_id, amont as amount, `rank` FROM Prize WHERE `rank` > 0 ORDER BY `rank` ASC'
      );
      return prizes;
    } finally {
      await connection.end();
    }
  }

  /**
   * Claim prize - ไม่รองรับใน database_me เพราะไม่มี ticket reference
   * @param {number} userId - User ID
   * @param {string} ticketNumber - Ticket number
   * @returns {Promise<Object>} Claim result
   */
  static async claimPrize(userId, ticketNumber) {
    // database_me ไม่มี ticket_id reference ใน Prize table
    // ดังนั้นไม่สามารถเช็คได้ว่าตั๋วใดถูกรางวัล
    throw new Error('Prize claiming not supported - database schema does not include ticket references in Prize table');
  }
}

module.exports = { PrizeService };