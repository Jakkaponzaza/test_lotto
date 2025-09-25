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
  
  // ส่งข้อมูล user ที่อัพเดทแล้วกลับมาด้วย
  const updatedUser = {
    user_id: req.user.user_id,
    username: req.user.username,
    email: req.user.email,
    phone: req.user.phone,
    role: req.user.role,
    wallet: result.remainingWallet, 
    isAdmin: req.user.isAdmin
  };
  
  sendSuccess(res, {
    purchaseId: result.purchaseId,
    purchasedTickets: result.purchasedTickets.map(t => ({
      id: t.ticket_id,
      number: t.number,
      price: t.price
    })),
    totalCost: result.totalCost,
    remainingWallet: result.remainingWallet,
    user: updatedUser 
  }, `ซื้อลอตเตอรี่ ${result.purchasedTickets.length} ใบ เป็นเงิน ${result.totalCost} บาท สำเร็จ`);
}));

// ✅ Create tickets (public endpoint - anyone can create tickets if none exist)
router.post('/create', asyncHandler(async (req, res) => {
  const { getConnection } = require('../dbconnect');
  
  console.log('🎫 PUBLIC CREATE TICKETS: Starting ticket creation...');
  
  const connection = await getConnection();
  try {
      // 1. ตรวจสอบว่ามีตั๋วอยู่ในระบบหรือไม่
      console.log('1️⃣ PUBLIC CREATE TICKETS: Checking existing tickets...');
      const [existingTickets] = await connection.execute('SELECT COUNT(*) as total FROM Ticket');
      const ticketCount = existingTickets[0].total;
      
      if (ticketCount > 0) {
        console.log(`❌ PUBLIC CREATE TICKETS: Found ${ticketCount} existing tickets`);
        return sendError(res, 'TICKETS_ALREADY_EXIST', {
          existingTickets: ticketCount,
          message: 'ระบบมีตั๋วอยู่แล้ว'
        }, 400);
      }
      
      console.log('✅ PUBLIC CREATE TICKETS: No existing tickets found');

      // 2. หา admin user ID (fallback to user_id = 1)
      console.log('2️⃣ PUBLIC CREATE TICKETS: Finding admin user...');
      const [adminUser] = await connection.execute(
        "SELECT user_id FROM User WHERE role IN ('owner', 'admin') ORDER BY user_id LIMIT 1"
      );
      const adminUserId = adminUser.length > 0 ? adminUser[0].user_id : 1;
      console.log(`✅ PUBLIC CREATE TICKETS: Using admin user ID: ${adminUserId}`);

      // 3. รีเซ็ท AUTO_INCREMENT ให้เริ่มจาก 1
      console.log('3️⃣ PUBLIC CREATE TICKETS: Resetting AUTO_INCREMENT to 1...');
      await connection.execute('ALTER TABLE Ticket AUTO_INCREMENT = 1');
      console.log('✅ PUBLIC CREATE TICKETS: AUTO_INCREMENT reset to 1');

      // 4. สร้างตั๋ว 120 ใบ
      console.log('4️⃣ PUBLIC CREATE TICKETS: Generating tickets...');
      const desiredCount = 120;
      const price = 80.00;
      const numbersSet = new Set();

      // Generate unique 6-digit numbers
      while (numbersSet.size < desiredCount) {
        const n = Math.floor(Math.random() * 1000000);
        const s = n.toString().padStart(6, '0');
        numbersSet.add(s);
      }

      const numbers = Array.from(numbersSet);
      console.log(`✅ PUBLIC CREATE TICKETS: Generated ${numbers.length} unique numbers`);

      // 5. Insert ตั๋วเป็น batch
      console.log('5️⃣ PUBLIC CREATE TICKETS: Inserting tickets...');
      const batchSize = 50;
      let inserted = 0;

      for (let i = 0; i < numbers.length; i += batchSize) {
        const batch = numbers.slice(i, i + batchSize);
        const placeholders = batch.map(() => '(?, ?, ?)').join(',');
        const values = [];

        for (const num of batch) {
          values.push(num, price, adminUserId);
        }

        await connection.execute(
          `INSERT INTO Ticket (number, price, created_by) VALUES ${placeholders}`,
          values
        );
        inserted += batch.length;
        console.log(`   📝 PUBLIC CREATE TICKETS: Inserted batch ${Math.ceil((i + batchSize) / batchSize)} (${inserted}/${desiredCount})`);
      }

      // 6. ตรวจสอบผลลัพธ์
      console.log('6️⃣ PUBLIC CREATE TICKETS: Verifying results...');
      const [finalCount] = await connection.execute('SELECT COUNT(*) as total FROM Ticket');
      const [firstTicket] = await connection.execute('SELECT ticket_id, number FROM Ticket ORDER BY ticket_id LIMIT 1');
      const [lastTicket] = await connection.execute('SELECT ticket_id, number FROM Ticket ORDER BY ticket_id DESC LIMIT 1');
      
      console.log(`✅ PUBLIC CREATE TICKETS: Created ${finalCount[0].total} tickets`);
      console.log(`   📊 First ticket: ID ${firstTicket[0]?.ticket_id}, Number ${firstTicket[0]?.number}`);
      console.log(`   📊 Last ticket: ID ${lastTicket[0]?.ticket_id}, Number ${lastTicket[0]?.number}`);

      sendSuccess(res, {
        ticketsCreated: inserted,
        totalTickets: finalCount[0].total,
        firstTicketId: firstTicket[0]?.ticket_id,
        lastTicketId: lastTicket[0]?.ticket_id,
        pricePerTicket: price
      }, `สร้างตั๋วลอตเตอรี่ใหม่ ${inserted} ใบเรียบร้อย`);

  } finally {
    await connection.end();
  }
}));

// ✅ Check ticket prize (authenticated)
router.get('/check-prize/:ticketNumber', authenticateToken, asyncHandler(async (req, res) => {
  const { ticketNumber } = req.params;
  const DrawService = require('../services/DrawService');
  
  console.log(`🎯 CHECKING PRIZE for ticket: ${ticketNumber}`);
  
  try {
    // 1. ตรวจสอบว่าตั๋วนี้เป็นของผู้ใช้หรือไม่
    const userTickets = await TicketService.getUserTickets(req.user.user_id);
    const userTicket = userTickets.find(t => t.number === ticketNumber);
    
    if (!userTicket) {
      console.log(`❌ TICKET CHECK: Ticket ${ticketNumber} not found for user ${req.user.user_id}`);
      return sendError(res, 'TICKET_NOT_FOUND', null, 404);
    }
    
    // 2. ดึงผลรางวัลล่าสุด
    const latestDraw = await DrawService.getLatestDraw();
    
    if (!latestDraw) {
      console.log(`❌ TICKET CHECK: No draw results found`);
      return sendSuccess(res, {
        ticketNumber: ticketNumber,
        isWinner: false,
        prizeInfo: null,
        message: 'ยังไม่มีการออกรางวัล'
      }, 'ยังไม่มีการออกรางวัล');
    }
    
    console.log(`🎲 DRAW INFO: Found draw with ${latestDraw.prizes.length} prizes`);
    
    // 3. ตรวจสอบรางวัลใหญ่ (tier 1-3)
    for (const [prizeType, winningNumbers] of Object.entries(latestDraw.winners)) {
      if (winningNumbers.includes(ticketNumber)) {
        const prizeIndex = prizeType.includes('เลขท้าย 3 ตัว') ? 4 :
                          prizeType.includes('เลขท้าย 2 ตัว') ? 5 :
                          parseInt(prizeType.replace(/\D/g, '')) || 1;
        
        const prizeItem = latestDraw.prizes.find(p => p.tier === prizeIndex);
        
        console.log(`🏆 WINNER FOUND: ${ticketNumber} won ${prizeType} - ${prizeItem?.amount} บาท`);
        
        return sendSuccess(res, {
          ticketNumber: ticketNumber,
          isWinner: true,
          prizeInfo: {
            type: prizeType,
            amount: prizeItem?.amount || 0,
            tier: prizeIndex
          }
        }, `ยินดีด้วย! ถูกรางวัล ${prizeType}`);
      }
    }
    
    // 4. ตรวจสอบเลขท้าย 3 ตัว
    const tail3Prize = latestDraw.prizes.find(p => p.tier === 4);
    if (tail3Prize && tail3Prize.amount > 0) {
      const match = tail3Prize.ticketId.match(/เลขท้าย 3 ตัว: (\d{3})/);
      if (match) {
        const winningTail3 = match[1];
        const ticketTail3 = ticketNumber.slice(-3);
        
        console.log(`🔍 TAIL-3 CHECK: Ticket ${ticketNumber} tail: ${ticketTail3}, Winning tail: ${winningTail3}`);
        
        if (ticketTail3 === winningTail3) {
          console.log(`🏆 TAIL-3 WINNER: ${ticketNumber} won เลขท้าย 3 ตัว - ${tail3Prize.amount} บาท`);
          
          return sendSuccess(res, {
            ticketNumber: ticketNumber,
            isWinner: true,
            prizeInfo: {
              type: 'รางวัลเลขท้าย 3 ตัว',
              amount: tail3Prize.amount,
              tier: 4,
              winningDigits: winningTail3
            }
          }, `ยินดีด้วย! ถูกรางวัลเลขท้าย 3 ตัว (${winningTail3})`);
        }
      }
    }
    
    // 5. ตรวจสอบเลขท้าย 2 ตัว
    const tail2Prize = latestDraw.prizes.find(p => p.tier === 5);
    if (tail2Prize && tail2Prize.amount > 0) {
      const match = tail2Prize.ticketId.match(/เลขท้าย 2 ตัว: (\d{2})/);
      if (match) {
        const winningTail2 = match[1];
        const ticketTail2 = ticketNumber.slice(-2);
        
        console.log(`🔍 TAIL-2 CHECK: Ticket ${ticketNumber} tail: ${ticketTail2}, Winning tail: ${winningTail2}`);
        
        if (ticketTail2 === winningTail2) {
          console.log(`🏆 TAIL-2 WINNER: ${ticketNumber} won เลขท้าย 2 ตัว - ${tail2Prize.amount} บาท`);
          
          return sendSuccess(res, {
            ticketNumber: ticketNumber,
            isWinner: true,
            prizeInfo: {
              type: 'รางวัลเลขท้าย 2 ตัว',
              amount: tail2Prize.amount,
              tier: 5,
              winningDigits: winningTail2
            }
          }, `ยินดีด้วย! ถูกรางวัลเลขท้าย 2 ตัว (${winningTail2})`);
        }
      }
    }
    
    // 6. ไม่ถูกรางวัล
    console.log(`❌ NO PRIZE: ${ticketNumber} did not win any prize`);
    
    return sendSuccess(res, {
      ticketNumber: ticketNumber,
      isWinner: false,
      prizeInfo: null
    }, 'ขออภัย ไม่ถูกรางวัลในครั้งนี้');
    
  } catch (error) {
    console.error('❌ TICKET CHECK ERROR:', error);
    return sendError(res, 'INTERNAL_ERROR', { details: error.message }, 500);
  }
}));

module.exports = router;