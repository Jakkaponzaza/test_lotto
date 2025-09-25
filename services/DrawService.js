const { getConnection } = require('../dbconnect');

class DrawService {
    /**
     * Get latest lottery draw result
     * @returns {Promise<Object|null>} Latest draw result or null
     */
    static async getLatestDraw() {
        const connection = await getConnection();
        try {
            // Get all prizes with winning ticket numbers using JOIN
            const [prizes] = await connection.execute(`
                SELECT p.prize_id, p.amount, p.rank, t.number as winning_number
                FROM Prize p 
                LEFT JOIN Ticket t ON t.prize_id = p.prize_id
                ORDER BY p.rank ASC
            `);

            console.log('🏆 DRAW SERVICE DEBUG: Raw prizes from database:');
            prizes.forEach(prize => {
                console.log(`   - Rank ${prize.rank}: ${prize.amount} บาท (Ticket: ${prize.winning_number || 'N/A'})`);
            });

            if (prizes.length === 0) {
                return null;
            }

            // Create prize items and winners map
            const prizeItems = [];
            const winnersMap = {};
            
            // Group prizes by rank to handle multiple winners for tail numbers
            const prizesByRank = {};
            prizes.forEach(prize => {
                if (!prizesByRank[prize.rank]) {
                    prizesByRank[prize.rank] = [];
                }
                prizesByRank[prize.rank].push(prize);
            });

            // Process prizes to create the proper structure
            for (let rank = 1; rank <= 5; rank++) {
                const rankPrizes = prizesByRank[rank] || [];
                
                if (rankPrizes.length === 0) continue;
                
                let tierName;
                let ticketId;
                let winningNumbers = [];
                
                if (rank <= 3) {
                    // รางวัลที่ 1-3 (รางวัลใหญ่)
                    tierName = `รางวัลที่ ${rank}`;
                    ticketId = rankPrizes[0]?.winning_number || '000000';
                    winningNumbers = [ticketId];
                } else if (rank === 4) {
                    // รางวัลเลขท้าย 3 ตัว
                    tierName = 'รางวัลเลขท้าย 3 ตัว';
                    winningNumbers = rankPrizes.map(p => p.winning_number).filter(n => n);
                    
                    if (winningNumbers.length > 0) {
                        // ใช้เลขท้าย 3 ตัวจากตั๋วแรก
                        const tailDigits = winningNumbers[0].slice(-3);
                        ticketId = `เลขท้าย 3 ตัว: ${tailDigits}`;
                    } else {
                        ticketId = 'เลขท้าย 3 ตัว: ---';
                    }
                } else if (rank === 5) {
                    // รางวัลเลขท้าย 2 ตัว
                    tierName = 'รางวัลเลขท้าย 2 ตัว';
                    winningNumbers = rankPrizes.map(p => p.winning_number).filter(n => n);
                    
                    if (winningNumbers.length > 0) {
                        // ใช้เลขท้าย 2 ตัวจากตั๋วแรก
                        const tailDigits = winningNumbers[0].slice(-2);
                        ticketId = `เลขท้าย 2 ตัว: ${tailDigits}`;
                    } else {
                        ticketId = 'เลขท้าย 2 ตัว: --';
                    }
                }
                
                // Create prize item for the Flutter app
                prizeItems.push({
                    tier: rank,
                    ticketId: ticketId,
                    amount: parseFloat(rankPrizes[0].amount),
                    claimed: false
                });
                
                // Add to winners map
                winnersMap[tierName] = winningNumbers.length > 0 ? winningNumbers : [ticketId];
            }

            return {
                id: `draw_${Date.now()}`,
                poolType: 'sold',
                createdAt: new Date(),
                prizes: prizeItems,
                winners: winnersMap
            };
        } finally {
            await connection.end();
        }
    }

    /**
     * Check if ticket is winner
     * @param {string} ticketNumber - Ticket number to check
     * @returns {Promise<Object|null>} Winner info or null
     */
    static async checkTicketWinner(ticketNumber) {
        const connection = await getConnection();
        try {
            // Check if the ticket number matches any prize using JOIN
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