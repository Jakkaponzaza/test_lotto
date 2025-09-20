const express = require('express');
const { getConnection } = require('../dbconnect');
const { PrizeService } = require('../services/PrizeService');
const DrawService = require('../services/DrawService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { BusinessLogicError, TicketValidator, PrizeValidator } = require('../utils/businessLogicValidator');

const router = express.Router();

// ✅ Get All Prizes (public)
router.get('/', asyncHandler(async (req, res) => {
  const prizes = await PrizeService.getLatestPrizes();
  sendSuccess(res, { prizes }, 'ดึงรายการรางวัลสำเร็จ');
}));

// ✅ Get Prizes by Rank
router.get('/by-rank', asyncHandler(async (req, res) => {
  const prizes = await PrizeService.getPrizesByRank();
  sendSuccess(res, { prizes }, 'ดึงรายการรางวัลตามอันดับสำเร็จ');
}));

// ✅ Claim Prize - Main functionality (authenticated)
router.post('/claim', authenticateToken, asyncHandler(async (req, res) => {
  const { ticketNumber } = req.body;



  // Enhanced input validation
  if (!ticketNumber) {
    throw new BusinessLogicError('กรุณาระบุหมายเลขลอตเตอรี่', 'MISSING_TICKET_NUMBER');
  }

  // Validate ticket number format
  if (typeof ticketNumber !== 'string' || !/^[0-9]{6}$/.test(ticketNumber)) {
    throw new BusinessLogicError('หมายเลขลอตเตอรี่ต้องเป็นตัวเลข 6 หลัก', 'INVALID_TICKET_NUMBER_FORMAT');
  }

  const result = await PrizeService.claimPrize(req.user.user_id, ticketNumber);
  


  sendSuccess(res, {
    prizeAmount: result.prizeAmount,
    prizeRank: result.prizeRank,
    newWallet: result.newWallet,
    ticketNumber: result.ticketNumber,
    drawId: result.drawId
  }, `ขึ้นเงินรางวัลที่ ${result.prizeRank} จำนวน ${result.prizeAmount} บาท เรียบร้อย`);
}));

// ✅ Check if ticket is winner (public endpoint)
router.get('/check/:ticketNumber', asyncHandler(async (req, res) => {
  const { ticketNumber } = req.params;
  
  // Enhanced validation for ticket number
  if (!ticketNumber) {
    throw new BusinessLogicError('กรุณาระบุหมายเลขลอตเตอรี่', 'MISSING_TICKET_NUMBER');
  }

  if (typeof ticketNumber !== 'string' || !/^[0-9]{6}$/.test(ticketNumber)) {
    throw new BusinessLogicError('หมายเลขลอตเตอรี่ต้องเป็นตัวเลข 6 หลัก', 'INVALID_TICKET_NUMBER_FORMAT');
  }



  // ไม่รองรับการเช็ครางวัลใน database_me
  return sendSuccess(res, {
    isWinner: false,
    ticketNumber: ticketNumber,
    message: 'Prize checking not supported with current database schema'
  }, 'ไม่รองรับการตรวจสอบรางวัลในระบบปัจจุบัน');
}));

// ✅ Get Latest Draw Results (public endpoint)
router.get('/draw/latest', asyncHandler(async (req, res) => {
  const latestDraw = await DrawService.getLatestDraw();
  
  if (!latestDraw) {
    return sendSuccess(res, { draw: null }, 'ยังไม่มีการออกรางวัล');
  }

  sendSuccess(res, { draw: latestDraw }, 'ดึงผลรางวัลล่าสุดสำเร็จ');
}));

// ✅ Create Prize (for admin)
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const { amount, rank, ticket_id, draw_date, claimed } = req.body;

  // Enhanced validation for prize creation
  if (!amount || !rank) {
    throw new BusinessLogicError('กรุณาระบุจำนวนเงินรางวัลและอันดับ', 'MISSING_REQUIRED_FIELDS');
  }

  // Validate prize amount
  PrizeValidator.validatePrizeAmount(parseFloat(amount));

  // Validate rank
  if (typeof rank !== 'number' || rank <= 0) {
    throw new BusinessLogicError('อันดับรางวัลต้องเป็นตัวเลขที่มากกว่า 0', 'INVALID_PRIZE_RANK');
  }

  // Validate ticket_id if provided
  if (ticket_id && (typeof ticket_id !== 'number' || ticket_id <= 0)) {
    throw new BusinessLogicError('รหัสลอตเตอรี่ต้องเป็นตัวเลขที่มากกว่า 0', 'INVALID_TICKET_ID');
  }

  const connection = await getConnection();
  try {
    const [result] = await connection.execute(
      'INSERT INTO Prize (amount, `rank`, ticket_id, draw_date, claimed) VALUES (?, ?, ?, ?, ?)',
      [
        parseFloat(amount),
        parseInt(rank),
        ticket_id || null,
        draw_date || new Date(),
        claimed || false
      ]
    );

    sendSuccess(res, {
      prize_id: result.insertId,
      amount: parseFloat(amount),
      rank: parseInt(rank)
    }, 'สร้างรางวัลสำเร็จ', 201);
  } finally {
    await connection.end();
  }
}));

module.exports = router;