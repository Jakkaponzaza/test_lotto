const TicketService = require('../services/TicketService');
const { PurchaseService } = require('../services/PrizeService');
const { validatePurchaseInput } = require('../utils/helpers');
const AuthController = require('./authController');

/**
 * Ticket controller
 */
class TicketController {
  /**
   * Get all tickets
   * @param {Object} socket - Socket connection
   */
  static async handleGetAllTickets(socket) {
    console.log(`🎫 GET ALL TICKETS: ${socket.id}`);

    try {
      const allTickets = await TicketService.getAllTickets();

      console.log(`📤 Sending ${allTickets.length} tickets to client ${socket.id}`);
      console.log('First 3 tickets:', allTickets.slice(0, 3));
      
      socket.emit('tickets:list', allTickets);
      console.log(`✅ Tickets sent successfully to ${socket.id}`);
    } catch (error) {
      console.error('Get tickets error:', error);
      socket.emit('error', { error: 'เกิดข้อผิดพลาดในการดึงรายการลอตเตอรี่' });
    }
  }

  /**
   * Get user tickets
   * @param {Object} socket - Socket connection
   * @param {Object} data - Request data {userId}
   * @param {Object} session - User session
   */
  static async handleGetUserTickets(socket, data, session) {
    console.log(`🎫 GET USER TICKETS: ${socket.id} - User: ${data.userId}`);

    if (!AuthController.requireAuth(session, socket)) {
      return;
    }

    try {
      const userTickets = await TicketService.getUserTickets(data.userId);

      socket.emit('tickets:user-list', userTickets);
      console.log(`🎫 Sent ${userTickets.length} user tickets to user ${data.userId}`);
    } catch (error) {
      console.error('Get user tickets error:', error);
      socket.emit('error', { error: 'เกิดข้อผิดพลาดในการดึงลอตเตอรี่ของผู้ใช้' });
    }
  }

  /**
   * Select ticket
   * @param {Object} socket - Socket connection
   * @param {Object} data - Request data {ticketId}
   * @param {Object} session - User session
   */
  static handleSelectTicket(socket, data, session) {
    console.log(`🎯 SELECT TICKET: ${socket.id} - Ticket: ${data.ticketId}`);

    if (!AuthController.requireAuth(session, socket)) {
      return;
    }

    session.addSelectedTicket(data.ticketId);

    socket.emit('tickets:selected', {
      ticketId: data.ticketId,
      selectedTickets: session.selectedTickets,
      message: `เลือกลอตเตอรี่ ${data.ticketId} แล้ว`
    });
  }

  /**
   * Deselect ticket
   * @param {Object} socket - Socket connection
   * @param {Object} data - Request data {ticketId}
   * @param {Object} session - User session
   */
  static handleDeselectTicket(socket, data, session) {
    console.log(`❌ DESELECT TICKET: ${socket.id} - Ticket: ${data.ticketId}`);

    if (!AuthController.requireAuth(session, socket)) {
      return;
    }

    session.removeSelectedTicket(data.ticketId);

    socket.emit('tickets:deselected', {
      ticketId: data.ticketId,
      selectedTickets: session.selectedTickets,
      message: `ยกเลิกลอตเตอรี่ ${data.ticketId} แล้ว`
    });
  }

  /**
   * Purchase tickets
   * @param {Object} socket - Socket connection
   * @param {Object} data - Request data {ticketIds}
   * @param {Object} session - User session
   * @param {Function} io - Socket.io broadcast function
   */
  static async handlePurchaseTickets(socket, data, session, io) {
    console.log(`💰 PURCHASE TICKETS: ${socket.id} - Tickets: ${data.ticketIds}`);

    if (!AuthController.requireAuth(session, socket)) {
      return;
    }

    try {
      // Validate input
      const validation = validatePurchaseInput(data);
      if (!validation.isValid) {
        socket.emit('purchase:error', { error: validation.error });
        return;
      }

      const { ticketIds } = data;
      const userId = session.userId;

      // Get available tickets
      const tickets = await TicketService.getAvailableTickets(ticketIds);

      if (tickets.length !== ticketIds.length) {
        socket.emit('purchase:error', { error: 'บางตั๋วไม่พร้อมใช้งานหรือไม่พบ' });
        return;
      }

      // Calculate total cost
      const totalCost = tickets.reduce((sum, ticket) => sum + parseFloat(ticket.price), 0);

      if (session.wallet < totalCost) {
        socket.emit('purchase:error', {
          error: 'ยอดเงินไม่เพียงพอ',
          required: totalCost,
          available: session.wallet
        });
        return;
      }

      // Create purchase record
      const purchaseId = await PurchaseService.createPurchase(userId, totalCost);

      // Update ticket status
      await TicketService.markAsSold(ticketIds, userId, purchaseId);

      // Update user wallet
      const newWallet = session.wallet - totalCost;
      await require('../services/UserService').updateWallet(userId, newWallet);

      // Update session wallet
      session.updateWallet(newWallet);
      session.clearSelectedTickets();

      // Emit success to user
      socket.emit('purchase:success', {
        purchasedTickets: ticketIds,
        totalCost: totalCost,
        remainingWallet: newWallet,
        message: `ซื้อหวย ${ticketIds.length} ใบ เป็นเงิน ${totalCost} บาท เรียบร้อย`
      });

      // Broadcast to all clients about ticket status change
      io.emit('tickets:updated', {
        ticketIds: ticketIds,
        status: 'sold',
        owner: userId
      });
      
      // Send updated user tickets to the purchasing user
      const updatedUserTickets = await TicketService.getUserTickets(userId);
      socket.emit('tickets:user-list', updatedUserTickets);
      console.log(`🎫 Sent updated user tickets (${updatedUserTickets.length} tickets) to user ${userId}`);

      console.log(`✅ PURCHASE SUCCESS: User ${userId} bought ${ticketIds.length} tickets`);

    } catch (error) {
      console.error('Purchase error:', error);
      socket.emit('purchase:error', { error: 'เกิดข้อผิดพลาดในการซื้อลอตเตอรี่' });
    }
  }
}

module.exports = TicketController;