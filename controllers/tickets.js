const express = require('express');
const TicketService = require('../services/TicketService');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { validateTicketPurchase, validateUserId } = require('../middleware/validation');

const router = express.Router();

// ✅ GET all tickets (public endpoint with optional auth)
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const tickets = await TicketService.getAllTickets();
  sendSuccess(res, { tickets }, 'ดึงรายการลอตเตอรี่สำเร็จ');
}));

// ✅ GET user tickets (authenticated)
router.get('/my-tickets', authenticateToken, asyncHandler(async (req, res) => {
  const tickets = await TicketService.getUserTickets(req.user.user_id);
  sendSuccess(res, { tickets }, 'ดึงลอตเตอรี่ของผู้ใช้สำเร็จ');
}));

// ✅ GET user tickets by ID (for admin or specific user access)
router.get('/user/:userId', validateUserId, authenticateToken, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);

  // Users can only access their own tickets unless they're admin
  if (req.user.user_id !== userId && !req.user.isAdmin) {
    return sendError(res, 'INSUFFICIENT_PERMISSIONS');
  }

  const tickets = await TicketService.getUserTickets(userId);
  sendSuccess(res, { tickets }, 'ดึงลอตเตอรี่ของผู้ใช้สำเร็จ');
}));

// ✅ Purchase tickets (authenticated)
router.post('/purchase', validateTicketPurchase, authenticateToken, asyncHandler(async (req, res) => {
  const { ticketIds } = req.body;

  const result = await TicketService.purchaseTickets(ticketIds, req.user.user_id);
  
  sendSuccess(res, {
    purchaseId: result.purchaseId,
    purchasedTickets: result.purchasedTickets.map(t => ({
      id: t.ticket_id,
      number: t.number,
      price: t.price
    })),
    totalCost: result.totalCost,
    remainingWallet: result.remainingWallet
  }, `ซื้อลอตเตอรี่ ${result.purchasedTickets.length} ใบ เป็นเงิน ${result.totalCost} บาท สำเร็จ`);
}));

module.exports = router;