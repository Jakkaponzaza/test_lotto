const TicketService = require('../services/TicketService');
const UserService = require('../services/UserService');
const { PrizeService, PurchaseService } = require('../services/PrizeService');
const { generateLotteryNumbers } = require('../utils/helpers');
const AuthController = require('./authController');

/**
 * Admin controller
 */
class AdminController {
  /**
   * Get admin statistics
   * @param {Object} socket - Socket connection
   * @param {Object} session - User session
   * @param {Map} activeConnections - Active connections map
   */
  static async handleGetStats(socket, session, activeConnections) {
    console.log(`📊 GET ADMIN STATS: ${socket.id}`);

    if (!AuthController.requireAdmin(session, socket)) {
      return;
    }

    try {
      const memberCount = await UserService.getMemberCount();
      const soldTickets = await TicketService.getSoldTicketsCount();
      const totalTickets = await TicketService.getTotalTicketsCount();
      const totalValue = await TicketService.getTotalSoldValue();

      const stats = {
        totalMembers: memberCount,
        ticketsSold: soldTickets,
        ticketsLeft: totalTickets - soldTickets,
        totalValue: totalValue,
        activeConnections: activeConnections.size,
        authenticatedUsers: Array.from(activeConnections.values()).filter(s => s.isAuthenticated).length
      };

      socket.emit('admin:stats', stats);
    } catch (error) {
      console.error('Get stats error:', error);
      socket.emit('error', { error: 'เกิดข้อผิดพลาดในการดึงสถิติ' });
    }
  }

  /**
   * Create lottery tickets
   * @param {Object} socket - Socket connection
   * @param {Object} session - User session
   * @param {Function} io - Socket.io broadcast function
   */
  static async handleCreateTickets(socket, session, io) {
    console.log(`🎫 FORCE CREATE TICKETS: ${socket.id}`);

    if (!AuthController.requireAdmin(session, socket)) {
      return;
    }

    try {
      console.log('🎫 Force creating 120 lottery tickets...');
      
      // Delete all existing tickets
      await TicketService.deleteAllTickets();
      
      // Get admin user ID
      const adminUser = await UserService.getAdminUser();
      const adminUserId = adminUser ? adminUser.user_id : 1;
      
      const desiredCount = 120;
      const price = 80.00;
      
      // Generate unique lottery numbers
      const numbers = generateLotteryNumbers(desiredCount);
      
      // Prepare ticket data
      const ticketData = numbers.map(number => ({
        number,
        price,
        adminUserId
      }));
      
      // Create tickets in database
      const inserted = await TicketService.createLotteryTickets(ticketData);
      
      console.log(`✅ Force created ${inserted} lottery tickets successfully!`);
      
      // Send success response to admin
      socket.emit('admin:tickets-created', {
        success: true,
        message: `สร้างลอตเตอรี่เรียบร้อย จำนวน ${inserted} ใบ`,
        ticketsCreated: inserted
      });
      
      // Broadcast to all clients
      io.emit('tickets:updated', {
        message: 'มีลอตเตอรี่ใหม่แล้ว',
        ticketsCreated: inserted
      });
      
    } catch (error) {
      console.log('\n=== CREATE TICKETS ERROR ===');
      console.error('Error details:', error);
      socket.emit('error', {
        error: 'เกิดข้อผิดพลาดในการสร้างลอตเตอรี่',
        details: error.message
      });
    }
  }

  /**
   * Reset system
   * @param {Object} socket - Socket connection
   * @param {Object} session - User session
   * @param {Function} io - Socket.io broadcast function
   */
  static async handleReset(socket, session, io) {
    console.log(`🔄 ADMIN RESET REQUEST: ${socket.id}`);

    if (!AuthController.requireAdmin(session, socket)) {
      return;
    }

    try {
      console.log('🗑️ Resetting system - clearing data...');

      // Clear prizes
      await PrizeService.clearAllPrizes();
      console.log('✅ Cleared prize data and reset prize_id counter');

      // Clear purchases
      await PurchaseService.deleteAllPurchases();
      console.log('✅ Cleared purchase data and reset purchase_id counter');

      // Delete all tickets
      await TicketService.deleteAllTickets();
      console.log('✅ Cleared all ticket data');

      // Delete all member users
      await UserService.deleteMemberUsers();
      console.log('✅ Cleared member users');

      console.log('=== RESET SUCCESS ===');
      console.log('✅ System reset completed');
      console.log('🎫 No new tickets created - create manually from admin page if needed');
      console.log('👤 Kept admin/owner accounts only');

      // Clear global variables
      global.lastDrawResult = null;
      global.claimedTickets = new Set();

      // Notify all clients about the reset
      io.emit('admin:reset-success', {
        message: 'รีเซ็ตระบบเรียบร้อย',
        ticketsCreated: 0
      });

      socket.emit('admin:reset-success', {
        success: true,
        message: 'รีเซ็ตระบบเรียบร้อย ตั๋วทั้งหมดถูกลบแล้ว สามารถสร้างตั๋วใหม่จากหน้า admin ได้',
        ticketsCreated: 0
      });

    } catch (error) {
      console.log('\n=== RESET ERROR ===');
      console.error('Error details:', error);
      socket.emit('error', {
        error: 'เกิดข้อผิดพลาดในการรีเซ็ตระบบ',
        details: error.message
      });
    }
  }

  /**
   * Get all sessions
   * @param {Object} socket - Socket connection
   * @param {Object} session - User session
   * @param {Map} activeConnections - Active connections map
   */
  static handleGetAllSessions(socket, session, activeConnections) {
    if (!AuthController.requireAdmin(session, socket)) {
      return;
    }

    const allSessions = Array.from(activeConnections.values()).map(s => s.getSessionInfo());
    socket.emit('session:all', allSessions);
  }
}

module.exports = AdminController;