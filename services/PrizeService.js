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
   * Get latest prizes
   * @returns {Promise<Array>} Array of prizes
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
   * Get prizes by rank
   * @returns {Promise<Array>} Array of prizes ordered by rank
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

  /**
   * Claim prize - ใช้ prize_id foreign key
   * @param {number} userId - User ID
   * @param {string} ticketNumber - Ticket number
   * @returns {Promise<Object>} Claim result
   */
  static async claimPrize(userId, ticketNumber) {
    const connection = await getConnection();
    try {
      // Check if the ticket is a winner using JOIN
      const [winningTickets] = await connection.execute(`
        SELECT t.ticket_id, t.status, p.prize_id, p.amount, p.rank, pur.user_id
        FROM Ticket t 
        JOIN Prize p ON t.prize_id = p.prize_id
        JOIN Purchase pur ON t.purchase_id = pur.purchase_id
        WHERE t.number = ? AND t.status = "sold"
      `, [ticketNumber]);

      if (winningTickets.length === 0) {
        throw new Error(`Ticket ${ticketNumber} is not a winner or not found`);
      }

      const winningTicket = winningTickets[0];
      
      // Check if the user owns this ticket
      if (winningTicket.user_id !== userId) {
        throw new Error(`User does not own ticket ${ticketNumber}`);
      }

      // Update ticket status to claimed
      await connection.execute(
        'UPDATE Ticket SET status = "claimed" WHERE ticket_id = ?',
        [winningTicket.ticket_id]
      );

      // Get user's current wallet balance
      const [users] = await connection.execute(
        'SELECT wallet FROM User WHERE user_id = ?',
        [userId]
      );
      
      const currentUser = users[0];
      const prizeAmount = parseFloat(winningTicket.amount);
      const currentWallet = parseFloat(currentUser.wallet);
      const newWallet = currentWallet + prizeAmount;

      console.log(`🎉 CLAIM PRIZE DEBUG:`);
      console.log(`   - Ticket: ${ticketNumber}`);
      console.log(`   - Prize Rank: ${winningTicket.rank}`);
      console.log(`   - Prize Amount: ${prizeAmount} บาท`);
      console.log(`   - Current Wallet: ${currentWallet} บาท`);
      console.log(`   - New Wallet: ${newWallet} บาท`);

      // Update user's wallet
      await connection.execute(
        'UPDATE User SET wallet = ? WHERE user_id = ?',
        [newWallet, userId]
      );

      return {
        prizeAmount: prizeAmount,
        prizeRank: winningTicket.rank,
        newWallet: newWallet,
        ticketNumber: ticketNumber,
        drawId: Date.now()
      };
    } finally {
      await connection.end();
    }
  }
  
  /**
   * Check if a ticket is a winner using JOIN
   * @param {string} ticketNumber - Ticket number to check
   * @returns {Promise<Object|null>} Prize info if winner, null otherwise
   */
  static async checkTicketWinner(ticketNumber) {
    const connection = await getConnection();
    try {
      const [prizes] = await connection.execute(`
        SELECT p.prize_id, p.amount, p.rank 
        FROM Prize p 
        JOIN Ticket t ON t.prize_id = p.prize_id 
        WHERE t.number = ?
      `, [ticketNumber]);

      if (prizes.length > 0) {
        return {
          prize_id: prizes[0].prize_id,
          amount: parseFloat(prizes[0].amount),
          rank: prizes[0].rank
        };
      }
      
      return null;
    } finally {
      await connection.end();
    }
  }
}

module.exports = { PrizeService };