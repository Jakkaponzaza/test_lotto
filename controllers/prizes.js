const express = require('express');
const { getConnection } = require('../dbconnect');

const router = express.Router();

// ✅ Get All Prizes
router.get('/', async (req, res) => {
  try {
    const connection = await getConnection();
    try {
      const [prizes] = await connection.execute('SELECT * FROM Prize');
      res.json(prizes);
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Get prizes error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงรายการรางวัล' });
  }
});

// ✅ Claim Prize - Main functionality
router.post('/claim', async (req, res) => {
  const { userId, ticketNumber } = req.body;

  console.log(`💰 CLAIM PRIZE REQUEST: userId: ${userId}, ticketNumber: ${ticketNumber}`);

  if (!userId || !ticketNumber) {
    console.log('❌ Missing data');
    return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
  }

  try {
    const connection = await getConnection();
    try {
      // Check if user owns the ticket
      console.log(`💰 Checking if user ${userId} owns ticket ${ticketNumber}...`);
      const [userTickets] = await connection.execute(
        'SELECT ticket_id, status FROM Ticket WHERE created_by = ? AND number = ?',
        [userId, ticketNumber]
      );

      console.log(`💰 User tickets query result:`, userTickets);

      if (userTickets.length === 0) {
        console.log(`❌ User ${userId} does not own ticket ${ticketNumber}`);
        return res.status(403).json({ error: 'คุณไม่ใช่เจ้าของตั๋วนี้' });
      }

      const ticketStatus = userTickets[0].status;
      console.log(`💰 Ticket status: ${ticketStatus}`);

      // Check ticket status
      if (ticketStatus !== 'sold' && ticketStatus !== 'purchased') {
        console.log(`❌ Ticket ${ticketNumber} has invalid status: ${ticketStatus}`);
        return res.status(400).json({ error: 'ตั๋วนี้ยังไม่ได้ซื้อหรือมีสถานะไม่ถูกต้อง' });
      }

      // Check if already claimed
      if (ticketStatus === 'claimed') {
        return res.status(400).json({ error: 'รางวัลนี้ถูกขึ้นไปแล้ว' });
      }

      // For now, use a mock winning system
      // In a real system, this would check against actual draw results
      const mockWinAmount = Math.random() > 0.7 ? 1000 : 0; // 30% chance to win 1000 baht
      
      if (mockWinAmount === 0) {
        return res.status(400).json({ error: 'ตั๋วนี้ไม่ถูกรางวัล' });
      }

      // Get current user wallet
      const [userResult] = await connection.execute(
        'SELECT wallet FROM User WHERE user_id = ?',
        [userId]
      );

      if (userResult.length === 0) {
        return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
      }

      const currentWallet = parseFloat(userResult[0].wallet);
      const newWallet = currentWallet + mockWinAmount;

      // Update user wallet
      await connection.execute(
        'UPDATE User SET wallet = ? WHERE user_id = ?',
        [newWallet, userId]
      );

      // Update ticket status to claimed
      console.log(`💰 Updating ticket status to 'claimed' for user ${userId}, ticket ${ticketNumber}`);
      const [updateResult] = await connection.execute(
        'UPDATE Ticket SET status = ? WHERE created_by = ? AND number = ?',
        ['claimed', userId, ticketNumber]
      );
      console.log(`💰 Ticket status update result:`, updateResult);

      if (updateResult.affectedRows === 0) {
        console.log(`❌ No ticket was updated - possibly already claimed or not found`);
        return res.status(400).json({ error: 'ไม่สามารถอัพเดตสถานะตั๋วได้' });
      }

      console.log(`✅ Prize claimed successfully!`);
      console.log(`  User: ${userId}`);
      console.log(`  Ticket: ${ticketNumber}`);
      console.log(`  Prize: ${mockWinAmount} บาท`);
      console.log(`  Old wallet: ${currentWallet}`);
      console.log(`  New wallet: ${newWallet}`);

      // Send success response
      res.json({
        success: true,
        message: `ขึ้นเงินรางวัล ${mockWinAmount} บาท เรียบร้อย`,
        prizeAmount: mockWinAmount,
        newWallet: newWallet,
        ticketNumber: ticketNumber
      });

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('🔴 CRITICAL CLAIM PRIZE ERROR:', error);
    console.error('🔴 Error stack:', error.stack);
    
    let errorMessage = 'เกิดข้อผิดพลาดในการขึ้นเงินรางวัล';
    
    if (error.code === 'WARN_DATA_TRUNCATED' || error.errno === 1265) {
      errorMessage = 'ข้อผิดพลาดข้อมูลในฐานข้อมูล - โปรดติดต่อผู้ดูแลระบบ';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message,
      code: error.code,
      errno: error.errno
    });
  }
});

// ✅ Create Prize (for admin)
router.post('/', async (req, res) => {
  const { amount, rank, ticket_id, draw_date, claimed } = req.body;

  try {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute(
        'INSERT INTO Prize (amount, `rank`, ticket_id, draw_date, claimed) VALUES (?, ?, ?, ?, ?)',
        [
          amount,
          rank,
          ticket_id || null,
          draw_date || new Date(),
          claimed || false
        ]
      );

      res.status(201).json({
        message: 'Prize created successfully',
        prize_id: result.insertId,
      });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Create prize error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างรางวัล' });
  }
});

module.exports = router;