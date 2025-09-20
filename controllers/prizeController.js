const TicketService = require('../services/TicketService');
const UserService = require('../services/UserService');
const { PrizeService } = require('../services/PrizeService');
const { validateDrawInput, validateClaimInput, formatDrawResult } = require('../utils/helpers');
const AuthController = require('./authController');

/**
 * Prize and draw controller
 */
class PrizeController {
  /**
   * Draw prizes
   * @param {Object} socket - Socket connection
   * @param {Object} data - Draw data {poolType, rewards}
   * @param {Object} session - User session
   * @param {Function} io - Socket.io broadcast function
   */
  static async handleDrawPrizes(socket, data, session, io) {
    console.log(`🎯 ADMIN DRAW PRIZES REQUEST: ${socket.id}`);
    
    if (!AuthController.requireAdmin(session, socket)) {
      return;
    }
    
    try {
      // Validate input
      const validation = validateDrawInput(data);
      if (!validation.isValid) {
        socket.emit('admin:draw-error', { error: validation.error });
        return;
      }

      const { poolType, rewards } = data;
      
      console.log(`🎯 Drawing prizes with pool type: ${poolType}`);
      console.log(`💰 Prize amounts: ${rewards}`);
      
      // Get tickets for drawing
      const ticketPool = await TicketService.getTicketsForDraw(poolType);
      
      // Validate ticket pool
      if (poolType === 'sold' && ticketPool.length === 0) {
        console.log('⚠️ No sold tickets available for drawing');
        socket.emit('admin:draw-error', { 
          error: 'ไม่มีตั๋วที่ขายแล้วในระบบ',
          code: 'NO_SOLD_TICKETS',
          suggestion: 'เปลี่ยนเป็นสุ่มจากตั๋วทั้งหมดหรือขายตั๋วก่อน'
        });
        return;
      }
      
      if (ticketPool.length < 5) {
        console.log(`⚠️ Only ${ticketPool.length} tickets available, need 5 minimum`);
        
        const errorMessage = poolType === 'sold' 
          ? `มีตั๋วที่ขายแล้วเพียง ${ticketPool.length} ใบ ต้องการ 5 ใบขั้นต่ำ`
          : `มีตั๋วในระบบเพียง ${ticketPool.length} ใบ ต้องการ 5 ใบขั้นต่ำ`;

        socket.emit('admin:draw-error', { 
          error: errorMessage,
          code: poolType === 'sold' ? 'INSUFFICIENT_SOLD_TICKETS' : 'INSUFFICIENT_TICKETS',
          suggestion: poolType === 'sold' ? null : 'กรุณาสร้างตั๋วใหม่ก่อนออกรางวัล'
        });
        return;
      }
      
      console.log(`🎯 Found ${ticketPool.length} tickets in pool for drawing`);
      console.log(`💫 Available tickets: ${ticketPool.slice(0, 10).map(t => t.number).join(', ')}${ticketPool.length > 10 ? '...' : ''}`);
      
      // Select 5 unique winning tickets
      const shuffled = [...ticketPool].sort(() => 0.5 - Math.random());
      const winningTickets = shuffled.slice(0, 5);
      
      console.log('🎯 Selected winning tickets:');
      winningTickets.forEach((ticket, index) => {
        console.log(`  รางวัลที่ ${index + 1}: ${ticket.number} (รางวัล ${rewards[index]} บาท)`);
      });
      
      // Clear old prizes
      await PrizeService.clearAllPrizes();
      
      // Create prize data
      const prizeData = winningTickets.map((ticket, index) => ({
        rank: index + 1,
        amount: rewards[index],
        ticketNumber: ticket.number
      }));
      
      // Save prizes to database
      await PrizeService.createPrizes(prizeData);
      
      // Store draw result in global variable
      global.lastDrawResult = {
        poolType: poolType,
        drawDate: new Date().toISOString(),
        winners: prizeData
      };
      
      // Get saved prizes from database
      const newPrizes = await PrizeService.getPrizesByRank();
      
      // Format draw result
      const drawResultData = formatDrawResult(global.lastDrawResult, newPrizes);
      
      console.log('🎯 Draw completed successfully!');
      console.log('🏆 Final winners data stored in global.lastDrawResult:');
      console.log('  Winners:', global.lastDrawResult.winners.map(w => `${w.ticketNumber} (รางวัลที่ ${w.rank})`).join(', '));
      console.log('📡 Broadcasting draw result to all clients...');
      
      // Send success response to admin
      socket.emit('admin:draw-success', {
        success: true,
        drawResult: drawResultData,
        message: `ออกรางวัล ${poolType === 'sold' ? 'จากตั๋วที่ขายแล้ว' : 'จากตั๋วทั้งหมด'} เรียบร้อย`
      });
      
      // Broadcast to all clients
      io.emit('draw:new-result', {
        drawResult: drawResultData,
        message: '🏆 มีการออกรางวัลใหม่!'
      });
      
    } catch (error) {
      console.error('Draw prizes error:', error);
      socket.emit('admin:draw-error', { 
        error: 'เกิดข้อผิดพลาดในการออกรางวัล',
        details: error.message 
      });
    }
  }

  /**
   * Get latest draw result
   * @param {Object} socket - Socket connection
   */
  static async handleGetLatestDraw(socket) {
    console.log(`📊 GET LATEST DRAW: ${socket.id}`);
    
    try {
      // Check if there's cached draw result
      if (global.lastDrawResult) {
        console.log('🎯 Found cached draw result with winners:', global.lastDrawResult.winners.map(w => w.ticketNumber));
        console.log('📤 Sending cached winners to client...');
        
        const drawResultData = formatDrawResult(global.lastDrawResult, global.lastDrawResult.winners);
        
        console.log('📤 Sending draw result with winners:', drawResultData.winners);
        socket.emit('draw:latest-result', { drawResult: drawResultData });
        return;
      }
      
      // Get prizes from database
      const prizes = await PrizeService.getLatestPrizes();
      
      if (prizes.length === 0) {
        console.log('🎯 No draw results found');
        socket.emit('draw:latest-result', { drawResult: null });
        return;
      }
      
      console.log('🎯 Found prizes but no cached winners - sending empty winners');
      
      // Create simple draw result without winners (for display only)
      const drawResultData = {
        id: `draw_simple`,
        poolType: 'all',
        createdAt: new Date().toISOString(),
        prizes: prizes.map(p => ({
          tier: p.rank,
          ticketId: `รางวัลที่ ${p.rank}`,
          amount: parseFloat(p.amount),
          claimed: false
        })),
        winners: {
          'รางวัลที่ 1': [],
          'รางวัลที่ 2': [],
          'รางวัลที่ 3': [],
          'รางวัลที่ 4': [],
          'รางวัลที่ 5': [],
        }
      };
      
      socket.emit('draw:latest-result', { drawResult: drawResultData });
      
    } catch (error) {
      console.error('Get latest draw error:', error);
      socket.emit('error', { error: 'เกิดข้อผิดพลาดในการดึงผลรางวัลล่าสุด' });
    }
  }

  /**
   * Claim prize
   * @param {Object} socket - Socket connection
   * @param {Object} data - Claim data {userId, ticketNumber}
   * @param {Object} session - User session
   */
  static async handleClaimPrize(socket, data, session) {
    console.log(`💰 CLAIM PRIZE REQUEST: ${socket.id}`);
    console.log(`💰 Request data:`, data);
    console.log(`💰 Session authenticated:`, session.isAuthenticated);
    console.log(`💰 Session user ID:`, session.userId);
    
    if (!AuthController.requireAuth(session, socket)) {
      return;
    }
    
    try {
      // Validate input
      const validation = validateClaimInput(data);
      if (!validation.isValid) {
        socket.emit('claim:error', { error: validation.error });
        return;
      }

      const { userId, ticketNumber } = data;
      console.log(`💰 Parsed data - userId: ${userId}, ticketNumber: ${ticketNumber}`);
      
      // Check ownership
      if (session.userId !== parseInt(userId)) {
        console.log(`❌ User ID mismatch - session: ${session.userId}, request: ${userId}`);
        socket.emit('claim:error', { error: 'ไม่มีสิทธิ์ขึ้นเงินรางวัลนี้' });
        return;
      }
      
      console.log(`💰 Processing claim for user ${userId}, ticket ${ticketNumber}`);
      
      // Check if draw result exists
      if (!global.lastDrawResult) {
        console.log('❌ No draw result available in global.lastDrawResult');
        socket.emit('claim:error', { error: 'ยังไม่มีการออกรางวัล' });
        return;
      }
      
      console.log(`💰 Draw result available, checking winners...`);
      console.log(`💰 Winner ticket numbers:`, global.lastDrawResult.winners.map(w => w.ticketNumber));
      
      // Find winning ticket
      const winningTicket = global.lastDrawResult.winners.find(w => w.ticketNumber === ticketNumber);
      if (!winningTicket) {
        console.log(`❌ Ticket ${ticketNumber} not in winners list`);
        socket.emit('claim:error', { error: 'ตั๋วนี้ไม่ถูกรางวัล' });
        return;
      }
      
      console.log(`✅ Ticket ${ticketNumber} won prize: ${winningTicket.amount} บาท`);
      
      // Check if user owns the ticket
      const userTicket = await TicketService.getUserTicketByNumber(userId, ticketNumber);
      if (!userTicket) {
        console.log(`❌ User ${userId} does not own ticket ${ticketNumber}`);
        socket.emit('claim:error', { error: 'คุณไม่ใช่เจ้าของตั๋วนี้' });
        return;
      }
      
      const ticketStatus = userTicket.status;
      console.log(`💰 Ticket status: ${ticketStatus}`);
      
      // Check ticket status
      if (ticketStatus !== 'sold' && ticketStatus !== 'purchased') {
        console.log(`❌ Ticket ${ticketNumber} has invalid status: ${ticketStatus}`);
        socket.emit('claim:error', { error: 'ตั๋วนี้ยังไม่ได้ซื้อหรือมีสถานะไม่ถูกต้อง' });
        return;
      }
      
      // Check if already claimed
      if (!global.claimedTickets) {
        global.claimedTickets = new Set();
      }
      
      const claimKey = `${userId}_${ticketNumber}`;
      if (global.claimedTickets.has(claimKey)) {
        socket.emit('claim:error', { error: 'รางวัลนี้ถูกขึ้นไปแล้ว' });
        return;
      }
      
      // Get current wallet
      const currentWallet = await UserService.getWallet(userId);
      const newWallet = currentWallet + winningTicket.amount;
      
      // Update user wallet
      await UserService.updateWallet(userId, newWallet);
      
      // Mark ticket as claimed
      const updated = await TicketService.markAsClaimed(userId, ticketNumber);
      if (!updated) {
        console.log(`❌ No ticket was updated - possibly already claimed or not found`);
        socket.emit('claim:error', { error: 'ไม่สามารถอัพเดตสถานะตั๋วได้' });
        return;
      }
      
      // Mark as claimed
      global.claimedTickets.add(claimKey);
      
      // Update session wallet
      session.updateWallet(newWallet);
      
      console.log(`✅ Prize claimed successfully!`);
      console.log(`  User: ${userId}`);
      console.log(`  Ticket: ${ticketNumber}`);
      console.log(`  Prize: ${winningTicket.amount} บาท`);
      console.log(`  Old wallet: ${currentWallet}`);
      console.log(`  New wallet: ${newWallet}`);
      
      // Send success response
      socket.emit('claim:success', {
        success: true,
        message: `ขึ้นเงินรางวัล ${winningTicket.amount} บาท เรียบร้อย`,
        prizeAmount: winningTicket.amount,
        newWallet: newWallet,
        ticketNumber: ticketNumber
      });
      
    } catch (error) {
      console.error('💀 CRITICAL CLAIM PRIZE ERROR:', error);
      socket.emit('claim:error', { 
        error: 'เกิดข้อผิดพลาดในการขึ้นเงินรางวัล',
        details: error.message
      });
    }
  }
}

module.exports = PrizeController;