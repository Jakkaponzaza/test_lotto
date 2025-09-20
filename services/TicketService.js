const { getConnection } = require('../config/database');

/**
 * Ticket database service operations
 */
class TicketService {
  /**
   * Get all tickets
   * @returns {Promise<Array>} Array of tickets
   */
  static async getAllTickets() {
    const connection = await getConnection();
    try {
      const [tickets] = await connection.execute(
        'SELECT ticket_id, number, price, status, created_by AS owner_id FROM Ticket ORDER BY number'
      );
      
      return tickets.map(ticket => ({
        id: ticket.ticket_id,
        number: ticket.number,
        price: parseFloat(ticket.price),
        status: ticket.status,
        owner_id: ticket.owner_id
      }));
    } finally {
      await connection.end();
    }
  }

  /**
   * Get tickets by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of user tickets
   */
  static async getUserTickets(userId) {
    const connection = await getConnection();
    try {
      const [tickets] = await connection.execute(
        'SELECT ticket_id, number, price, status FROM Ticket WHERE created_by = ? ORDER BY ticket_id DESC',
        [userId]
      );

      return tickets.map(ticket => ({
        id: ticket.ticket_id,
        number: ticket.number,
        price: parseFloat(ticket.price),
        status: ticket.status,
        owner_id: userId
      }));
    } finally {
      await connection.end();
    }
  }

  /**
   * Get tickets by IDs for purchase validation
   * @param {Array} ticketIds - Array of ticket IDs
   * @returns {Promise<Array>} Array of available tickets
   */
  static async getAvailableTickets(ticketIds) {
    const connection = await getConnection();
    try {
      const placeholders = ticketIds.map(() => '?').join(',');
      const [tickets] = await connection.execute(
        `SELECT ticket_id, number, price FROM Ticket WHERE ticket_id IN (${placeholders}) AND status = 'available'`,
        ticketIds
      );
      return tickets;
    } finally {
      await connection.end();
    }
  }

  /**
   * Update ticket status to sold
   * @param {Array} ticketIds - Array of ticket IDs
   * @param {number} userId - User ID who purchased
   * @param {number} purchaseId - Purchase ID
   * @returns {Promise<boolean>} True if updated successfully
   */
  static async markAsSold(ticketIds, userId, purchaseId) {
    const connection = await getConnection();
    try {
      const placeholders = ticketIds.map(() => '?').join(',');
      
      // Update ticket status and owner
      await connection.execute(
        `UPDATE Ticket SET status = 'sold', created_by = ? WHERE ticket_id IN (${placeholders})`,
        [userId, ...ticketIds]
      );

      // Update with purchase_id
      const [result] = await connection.execute(
        `UPDATE Ticket SET purchase_id = ? WHERE ticket_id IN (${placeholders})`,
        [purchaseId, ...ticketIds]
      );

      return result.affectedRows > 0;
    } finally {
      await connection.end();
    }
  }

  /**
   * Update ticket status to claimed
   * @param {number} userId - User ID
   * @param {string} ticketNumber - Ticket number
   * @returns {Promise<boolean>} True if updated successfully
   */
  static async markAsClaimed(userId, ticketNumber) {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute(
        'UPDATE Ticket SET status = ? WHERE created_by = ? AND number = ?',
        ['claimed', userId, ticketNumber]
      );
      return result.affectedRows > 0;
    } finally {
      await connection.end();
    }
  }

  /**
   * Check if user owns a ticket
   * @param {number} userId - User ID
   * @param {string} ticketNumber - Ticket number
   * @returns {Promise<Object|null>} Ticket object if owned, null otherwise
   */
  static async getUserTicketByNumber(userId, ticketNumber) {
    const connection = await getConnection();
    try {
      const [tickets] = await connection.execute(
        'SELECT ticket_id, status FROM Ticket WHERE created_by = ? AND number = ?',
        [userId, ticketNumber]
      );
      return tickets.length > 0 ? tickets[0] : null;
    } finally {
      await connection.end();
    }
  }

  /**
   * Get sold tickets count
   * @returns {Promise<number>} Number of sold tickets
   */
  static async getSoldTicketsCount() {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute(
        'SELECT COUNT(*) as total FROM Ticket WHERE status = "sold"'
      );
      return result[0].total;
    } finally {
      await connection.end();
    }
  }

  /**
   * Get total tickets count
   * @returns {Promise<number>} Total number of tickets
   */
  static async getTotalTicketsCount() {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute(
        'SELECT COUNT(*) as total FROM Ticket'
      );
      return result[0].total;
    } finally {
      await connection.end();
    }
  }

  /**
   * Get total value of sold tickets
   * @returns {Promise<number>} Total value
   */
  static async getTotalSoldValue() {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute(
        'SELECT SUM(price) as total FROM Ticket WHERE status = "sold"'
      );
      return result[0].total || 0;
    } finally {
      await connection.end();
    }
  }

  /**
   * Get tickets for draw by pool type
   * @param {string} poolType - 'sold' or 'all'
   * @returns {Promise<Array>} Array of tickets for drawing
   */
  static async getTicketsForDraw(poolType) {
    const connection = await getConnection();
    try {
      let query;
      if (poolType === 'sold') {
        query = 'SELECT ticket_id, number FROM Ticket WHERE status = "sold" ORDER BY RAND()';
      } else {
        query = 'SELECT ticket_id, number FROM Ticket ORDER BY RAND()';
      }
      
      const [tickets] = await connection.execute(query);
      return tickets;
    } finally {
      await connection.end();
    }
  }

  /**
   * Create lottery tickets
   * @param {Array} ticketData - Array of ticket data {number, price, adminUserId}
   * @returns {Promise<number>} Number of tickets created
   */
  static async createLotteryTickets(ticketData) {
    const connection = await getConnection();
    try {
      const batchSize = 50;
      let inserted = 0;
      
      for (let i = 0; i < ticketData.length; i += batchSize) {
        const batch = ticketData.slice(i, i + batchSize);
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(',');
        const values = [];
        const currentDate = new Date();
        
        for (const ticket of batch) {
          values.push(ticket.number, ticket.price, currentDate, currentDate, ticket.adminUserId);
        }
        
        await connection.execute(
          `INSERT INTO Ticket (number, price, start_date, end_date, created_by) VALUES ${placeholders}`,
          values
        );
        inserted += batch.length;
      }
      
      return inserted;
    } finally {
      await connection.end();
    }
  }

  /**
   * Delete all tickets
   * @returns {Promise<number>} Number of deleted tickets
   */
  static async deleteAllTickets() {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute('DELETE FROM Ticket');
      await connection.execute('ALTER TABLE Ticket AUTO_INCREMENT = 1');
      return result.affectedRows;
    } finally {
      await connection.end();
    }
  }

  /**
   * Check if any tickets exist
   * @returns {Promise<number>} Count of existing tickets
   */
  static async getTicketCount() {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute('SELECT COUNT(*) as count FROM Ticket');
      return result[0].count;
    } finally {
      await connection.end();
    }
  }
}

module.exports = TicketService;