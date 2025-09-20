const { getConnection } = require('../config/database');

/**
 * Draw service - ใช้เฉพาะ table ที่มีใน database_me
 */
class DrawService {
    /**
     * Create a simple lottery draw (ใช้ Prize table เท่านั้น)
     * @param {Object} drawData - Draw configuration
     * @returns {Promise<Object>} Created draw result
     */
    static async createDraw(drawData) {
        const {
            prizeStructure = [
                { rank: 1, amount: 6000000, count: 1 },
                { rank: 2, amount: 200000, count: 1 },
                { rank: 3, amount: 80000, count: 1 }
            ]
        } = drawData;

        const connection = await getConnection();
        try {
            await connection.beginTransaction();

            // Clear existing prizes
            await connection.execute('DELETE FROM Prize');

            // Create new prizes
            let totalWinners = 0;
            for (const prize of prizeStructure) {
                for (let i = 0; i < prize.count; i++) {
                    await connection.execute(
                        'INSERT INTO Prize (amont, `rank`) VALUES (?, ?)',
                        [prize.amount, prize.rank]
                    );
                    totalWinners++;
                }
            }

            await connection.commit();

            return {
                drawId: Date.now(),
                totalWinners,
                prizes: prizeStructure,
                drawDate: new Date(),
                poolType: 'sold',
                status: 'completed'
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            await connection.end();
        }
    }

    /**
     * Get latest lottery draw result
     * @returns {Promise<Object|null>} Latest draw result or null
     */
    static async getLatestDraw() {
        const connection = await getConnection();
        try {
            const [prizes] = await connection.execute(`
        SELECT p.prize_id, p.amont as amount, p.rank
        FROM Prize p 
        ORDER BY p.rank ASC
      `);

            if (prizes.length === 0) {
                return null;
            }

            return {
                drawId: Date.now(),
                drawDate: new Date(),
                poolType: 'sold',
                status: 'completed',
                prizes: prizes.map(p => ({
                    rank: p.rank,
                    amount: parseFloat(p.amount),
                    ticketNumber: null
                }))
            };
        } finally {
            await connection.end();
        }
    }

    /**
     * Check if ticket is winner (simplified - ไม่ใช้ DrawResult)
     * @param {string} ticketNumber - Ticket number to check
     * @returns {Promise<Object|null>} Winner info or null
     */
    static async checkTicketWinner(ticketNumber) {
        // ใน database_me ไม่มี ticket_id reference ใน Prize
        // ดังนั้นไม่สามารถเช็คได้ - return null
        return null;
    }

    /**
     * Get all draws (simplified)
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @returns {Promise<Object>} Paginated draws
     */
    static async getAllDraws(page = 1, limit = 10) {
        // ไม่มี DrawResult table ใน database_me
        return {
            draws: [],
            pagination: {
                page,
                limit,
                total: 0,
                totalPages: 0
            }
        };
    }

    /**
     * Get draw by ID (simplified)
     * @param {number} drawId - Draw ID
     * @returns {Promise<Object|null>} Draw or null
     */
    static async getDrawById(drawId) {
        // ไม่มี DrawResult table ใน database_me
        return null;
    }

    /**
     * Clear all draws (simplified - ลบ Prize เท่านั้น)
     * @returns {Promise<number>} Number of deleted records
     */
    static async clearAllDraws() {
        const connection = await getConnection();
        try {
            const [result] = await connection.execute('DELETE FROM Prize');
            await connection.execute('ALTER TABLE Prize AUTO_INCREMENT = 1');

            return result.affectedRows;
        } finally {
            await connection.end();
        }
    }
}

module.exports = DrawService;