const express = require('express');
const UserService = require('../services/UserService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { BusinessLogicError } = require('../utils/businessLogicValidator');

const router = express.Router();

// ✅ Get current user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  // Get fresh user data from database
  const user = await UserService.findById(req.user.user_id);
  
  if (!user) {
    return sendError(res, 'USER_NOT_FOUND');
  }

  sendSuccess(res, {
    user: {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      wallet: parseFloat(user.wallet),
      isAdmin: user.role === 'owner' || user.role === 'admin'
    }
  }, 'ดึงข้อมูลผู้ใช้สำเร็จ');
}));

// ✅ Get user wallet balance
router.get('/wallet', authenticateToken, asyncHandler(async (req, res) => {
  const wallet = await UserService.getWallet(req.user.user_id);
  sendSuccess(res, { wallet: parseFloat(wallet) }, 'ดึงข้อมูลกระเป๋าเงินสำเร็จ');
}));

// ✅ Update user wallet (admin only)
router.put('/wallet/:userId', requireAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { amount, operation } = req.body; // operation: 'add' or 'set'

  // Enhanced validation for wallet operations
  if (!amount || typeof amount !== 'number' || amount < 0) {
    throw new BusinessLogicError('จำนวนเงินต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0', 'INVALID_AMOUNT_FORMAT');
  }

  if (amount > 1000000) {
    throw new BusinessLogicError('จำนวนเงินเกินขีดจำกัดที่อนุญาต (1,000,000 บาท)', 'AMOUNT_EXCEEDS_LIMIT');
  }

  // Verify user exists before updating wallet
  const user = await UserService.findById(userId);
  if (!user) {
    return sendError(res, 'USER_NOT_FOUND');
  }

  let result;
  
  if (operation === 'add') {
    result = await UserService.addToWallet(userId, parseFloat(amount));
  } else {
    // Default to 'set'
    result = await UserService.updateWallet(userId, parseFloat(amount));
    result = { success: true, newWallet: parseFloat(amount) };
  }

  if (!result.success) {
    throw new BusinessLogicError(result.error || 'ไม่สามารถอัพเดตกระเป๋าเงินได้', 'WALLET_UPDATE_FAILED');
  }

  sendSuccess(res, {
    newWallet: result.newWallet,
    operation: operation || 'set',
    amount: parseFloat(amount)
  }, 'อัพเดตกระเป๋าเงินเรียบร้อย');
}));

// ✅ Get all users (admin only)
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const { getConnection } = require('../config/database');
  const connection = await getConnection();
  
  try {
    const [users] = await connection.execute(
      'SELECT user_id, username, email, phone, role, wallet FROM User ORDER BY user_id DESC'
    );

    const formattedUsers = users.map(user => ({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      wallet: parseFloat(user.wallet),

      isAdmin: user.role === 'owner' || user.role === 'admin'
    }));

    sendSuccess(res, { users: formattedUsers }, 'ดึงรายการผู้ใช้สำเร็จ');
  } finally {
    await connection.end();
  }
}));

// ✅ Get user by ID (admin only)
router.get('/:userId', requireAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);

  // Validate user ID format
  if (isNaN(userId) || userId <= 0) {
    throw new BusinessLogicError('รหัสผู้ใช้ต้องเป็นตัวเลขที่มากกว่า 0', 'INVALID_USER_ID');
  }

  const user = await UserService.findById(userId);
  
  if (!user) {
    return sendError(res, 'USER_NOT_FOUND');
  }

  sendSuccess(res, {
    user: {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      wallet: parseFloat(user.wallet),
      isAdmin: user.role === 'owner' || user.role === 'admin'
    }
  }, 'ดึงข้อมูลผู้ใช้สำเร็จ');
}));

// ✅ Update user role (owner only)
router.put('/:userId/role', authenticateToken, asyncHandler(async (req, res) => {
  // Check if user is owner
  if (req.user.role !== 'owner') {
    return sendError(res, 'INSUFFICIENT_PERMISSIONS');
  }

  const userId = parseInt(req.params.userId);
  const { role } = req.body;

  // Enhanced validation for role update
  if (isNaN(userId) || userId <= 0) {
    throw new BusinessLogicError('รหัสผู้ใช้ต้องเป็นตัวเลขที่มากกว่า 0', 'INVALID_USER_ID');
  }

  if (!role || !['member', 'admin', 'owner'].includes(role)) {
    throw new BusinessLogicError('บทบาทต้องเป็น member, admin หรือ owner', 'INVALID_ROLE');
  }

  // Prevent self-demotion
  if (userId === req.user.user_id && role !== 'owner') {
    throw new BusinessLogicError('ไม่สามารถลดบทบาทของตนเองได้', 'CANNOT_DEMOTE_SELF');
  }

  // Verify target user exists
  const targetUser = await UserService.findById(userId);
  if (!targetUser) {
    return sendError(res, 'USER_NOT_FOUND');
  }

  const { getConnection } = require('../config/database');
  const connection = await getConnection();
  
  try {
    const [result] = await connection.execute(
      'UPDATE User SET role = ? WHERE user_id = ?',
      [role, userId]
    );

    if (result.affectedRows === 0) {
      throw new BusinessLogicError('ไม่สามารถอัพเดตบทบาทผู้ใช้ได้', 'ROLE_UPDATE_FAILED');
    }

    sendSuccess(res, {
      userId: userId,
      newRole: role,
      previousRole: targetUser.role
    }, 'อัพเดตบทบาทผู้ใช้เรียบร้อย');
  } finally {
    await connection.end();
  }
}));

// ✅ Get user's purchase history
router.get('/purchases', authenticateToken, asyncHandler(async (req, res) => {
  const { getConnection } = require('../config/database');
  const connection = await getConnection();
  
  try {
    const [purchases] = await connection.execute(`
      SELECT p.purchase_id, p.date, p.total_price,
             COUNT(t.ticket_id) as ticket_count,
             GROUP_CONCAT(t.number ORDER BY t.number) as ticket_numbers
      FROM Purchase p
      LEFT JOIN Ticket t ON p.purchase_id = t.purchase_id
      WHERE p.user_id = ?
      GROUP BY p.purchase_id
      ORDER BY p.date DESC
    `, [req.user.user_id]);

    const formattedPurchases = purchases.map(p => ({
      purchase_id: p.purchase_id,
      date: p.date,
      total_price: parseFloat(p.total_price),
      ticket_count: p.ticket_count,
      ticket_numbers: p.ticket_numbers ? p.ticket_numbers.split(',') : []
    }));

    sendSuccess(res, { 
      purchases: formattedPurchases,
      total_purchases: purchases.length,
      total_spent: purchases.reduce((sum, p) => sum + parseFloat(p.total_price), 0)
    }, 'ดึงประวัติการซื้อสำเร็จ');
  } finally {
    await connection.end();
  }
}));

// ✅ Get user's winning history
router.get('/winnings', authenticateToken, asyncHandler(async (req, res) => {
  const { getConnection } = require('../config/database');
  const connection = await getConnection();
  
  try {
    const [winnings] = await connection.execute(`
      SELECT pr.prize_id, pr.amount, pr.rank, pr.claimed, pr.draw_date,
             t.number as winning_number, t.ticket_id
      FROM Prize pr
      JOIN Ticket t ON pr.ticket_id = t.ticket_id
      JOIN Purchase p ON t.purchase_id = p.purchase_id
      WHERE p.user_id = ?
      ORDER BY pr.draw_date DESC
    `, [req.user.user_id]);

    const formattedWinnings = winnings.map(w => ({
      prize_id: w.prize_id,
      amount: parseFloat(w.amount),
      rank: w.rank,
      claimed: w.claimed,
      draw_date: w.draw_date,
      winning_number: w.winning_number,
      ticket_id: w.ticket_id
    }));

    const totalWinnings = winnings.reduce((sum, w) => sum + parseFloat(w.amount), 0);
    const claimedWinnings = winnings.filter(w => w.claimed).reduce((sum, w) => sum + parseFloat(w.amount), 0);
    const unclaimedWinnings = winnings.filter(w => !w.claimed).reduce((sum, w) => sum + parseFloat(w.amount), 0);

    sendSuccess(res, { 
      winnings: formattedWinnings,
      summary: {
        total_winnings: totalWinnings,
        claimed_winnings: claimedWinnings,
        unclaimed_winnings: unclaimedWinnings,
        total_winning_tickets: winnings.length
      }
    }, 'ดึงประวัติการชนะรางวัลสำเร็จ');
  } finally {
    await connection.end();
  }
}));

module.exports = router;