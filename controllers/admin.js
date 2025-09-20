const express = require('express');
const { getConnection } = require('../dbconnect');
const DrawService = require('../services/DrawService');
const { requireAdmin, authenticateToken } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { BusinessLogicError, SystemValidator, InputValidator } = require('../utils/businessLogicValidator');

const router = express.Router();

// ✅ Get Admin Statistics
router.get('/stats', requireAdmin, asyncHandler(async (req, res) => {
  const connection = await getConnection();
  try {
    // Get member count
    const [memberCount] = await connection.execute(
      'SELECT COUNT(*) as total FROM User WHERE role = "member"'
    );

    // Get sold tickets count
    const [soldTickets] = await connection.execute(
      'SELECT COUNT(*) as total FROM Ticket WHERE status = "sold"'
    );

    // Get total tickets count
    const [totalTickets] = await connection.execute(
      'SELECT COUNT(*) as total FROM Ticket'
    );

    // Get total value
    const [totalValue] = await connection.execute(
      'SELECT SUM(price) as total FROM Ticket WHERE status = "sold"'
    );

    const stats = {
      totalMembers: memberCount[0].total,
      ticketsSold: soldTickets[0].total,
      ticketsLeft: totalTickets[0].total - soldTickets[0].total,
      totalValue: parseFloat(totalValue[0].total) || 0,
      activeConnections: 0, // Not applicable in REST API mode
      authenticatedUsers: 0 // Not applicable in REST API mode
    };

    sendSuccess(res, { stats }, 'ดึงสถิติระบบสำเร็จ');
  } finally {
    await connection.end();
  }
}));

// ✅ Complete System Reset - ลบทุกอย่าง เหลือแค่ admin (ใช้โค้ดจาก working test)
router.post('/reset', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  console.log('🔄 ADMIN RESET: Starting system reset...');
  console.log('👤 User requesting reset:', req.user?.username, 'Role:', req.user?.role);
  
  try {
    // Validate system resources before heavy operation
    console.log('1️⃣ ADMIN RESET: Validating system resources...');
    SystemValidator.validateSystemResources('system_reset');
    console.log('✅ ADMIN RESET: System resources OK');
    
    const cleanup = SystemValidator.validateConcurrentOperations('system_reset', 1);
    console.log('✅ ADMIN RESET: Concurrent operations check passed');
    
    try {
      const connection = await getConnection();
      console.log('✅ ADMIN RESET: Database connection established');
      
      try {
        console.log('\n2️⃣ ADMIN RESET: Starting reset process...');
        
        // 1. หา admin user ก่อนลบ
        console.log('   👤 ADMIN RESET: Finding admin user...');
        const [adminUser] = await connection.execute(
          "SELECT user_id, username FROM User WHERE role IN ('owner', 'admin') ORDER BY user_id LIMIT 1"
        );
        
        if (adminUser.length === 0) {
          throw new Error('No admin user found! Cannot reset system.');
        }
        
        const adminUsername = adminUser[0].username;
        console.log(`   ✅ ADMIN RESET: Found admin: ${adminUsername} (ID: ${adminUser[0].user_id})`);

        // 2. ลบข้อมูลทั้งหมดตามลำดับ (เพื่อหลีกเลี่ยง foreign key constraints)
        console.log('\n   🗑️ ADMIN RESET: Deleting Purchase records...');
        const [deletedPurchases] = await connection.execute('DELETE FROM Purchase');
        console.log(`   ✅ ADMIN RESET: Deleted ${deletedPurchases.affectedRows} purchases`);

        console.log('   🗑️ ADMIN RESET: Deleting Prize records...');
        const [deletedPrizes] = await connection.execute('DELETE FROM Prize');
        console.log(`   ✅ ADMIN RESET: Deleted ${deletedPrizes.affectedRows} prizes`);

        console.log('   🗑️ ADMIN RESET: Deleting Ticket records...');
        const [deletedTickets] = await connection.execute('DELETE FROM Ticket');
        console.log(`   ✅ ADMIN RESET: Deleted ${deletedTickets.affectedRows} tickets`);
        
        console.log('   🗑️ ADMIN RESET: Deleting non-admin users...');
        const [deletedUsers] = await connection.execute(
          "DELETE FROM User WHERE role NOT IN ('admin', 'owner')"
        );
        console.log(`   ✅ ADMIN RESET: Deleted ${deletedUsers.affectedRows} member users`);

        console.log('\n3️⃣ ADMIN RESET: Verifying reset results...');
        const [finalTickets] = await connection.execute('SELECT COUNT(*) as total FROM Ticket');
        const [finalUsers] = await connection.execute('SELECT COUNT(*) as total FROM User');
        const [finalPurchases] = await connection.execute('SELECT COUNT(*) as total FROM Purchase');
        const [finalPrizes] = await connection.execute('SELECT COUNT(*) as total FROM Prize');
        
        console.log(`   📊 ADMIN RESET: Final counts:`);
        console.log(`   - Tickets: ${finalTickets[0].total} (should be 0)`);
        console.log(`   - Users: ${finalUsers[0].total} (should be 1 - admin only)`);
        console.log(`   - Purchases: ${finalPurchases[0].total} (should be 0)`);
        console.log(`   - Prizes: ${finalPrizes[0].total} (should be 0)`);

        console.log('\n🎉 ADMIN RESET: Reset completed successfully!');
        console.log(`   📊 ADMIN RESET: Summary:`);
        console.log(`   - Deleted ${deletedPurchases.affectedRows} purchases`);
        console.log(`   - Deleted ${deletedPrizes.affectedRows} prizes`);
        console.log(`   - Deleted ${deletedTickets.affectedRows} tickets`);
        console.log(`   - Deleted ${deletedUsers.affectedRows} member users`);
        console.log(`   - Preserved admin: ${adminUsername}`);

        sendSuccess(res, {
          deletedPurchases: deletedPurchases.affectedRows,
          deletedPrizes: deletedPrizes.affectedRows,
          deletedTickets: deletedTickets.affectedRows,
          deletedUsers: deletedUsers.affectedRows,
          adminPreserved: adminUsername
        }, `รีเซ็ทระบบเรียบร้อย ลบข้อมูลทั้งหมด เหลือเฉพาะ admin: ${adminUsername}`);

      } finally {
        await connection.end();
        console.log('✅ ADMIN RESET: Database connection closed');
      }
    } finally {
      cleanup(); // Clean up concurrent operation counter
      console.log('✅ ADMIN RESET: Concurrent operation cleanup completed');
    }
    
  } catch (error) {
    console.error('\n❌ ADMIN RESET: Reset function failed:', error.message);
    console.error('❌ ADMIN RESET: Error details:', {
      name: error.name,
      code: error.code,
      errno: error.errno
    });
    
    if (error.stack) {
      console.error('❌ ADMIN RESET: Stack trace:', error.stack);
    }
    
    throw error;
  }
}));

// ✅ Reset Tickets Only (เก็บไว้สำหรับกรณีที่ต้องการรีเซ็ทแค่ตั๋ว)
router.post('/reset-tickets', requireAdmin, asyncHandler(async (req, res) => {
  // Validate system resources before heavy operation
  SystemValidator.validateSystemResources('ticket_reset');
  
  const cleanup = SystemValidator.validateConcurrentOperations('ticket_reset', 1);
  try {
    const connection = await getConnection();
    try {
      // Delete all existing tickets
      await connection.execute('DELETE FROM Ticket');

      // Find admin user ID
      const [adminUser] = await connection.execute(
        "SELECT user_id FROM User WHERE role IN ('owner', 'admin') ORDER BY user_id LIMIT 1"
      );
      const adminUserId = adminUser.length > 0 ? adminUser[0].user_id : 1;

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
      }

      sendSuccess(res, {
        ticketsCreated: inserted
      }, `สร้างตั๋วลอตเตอรี่ใหม่ ${inserted} ใบเรียบร้อย`);

    } finally {
      await connection.end();
    }
  } finally {
    cleanup(); // Clean up concurrent operation counter
  }
}));

// ✅ Get all users with enhanced information
router.get('/users', requireAdmin, asyncHandler(async (req, res) => {
  const connection = await getConnection();
  try {
    const [users] = await connection.execute(`
      SELECT u.user_id, u.username, u.email, u.phone, u.role, u.wallet,
             COUNT(DISTINCT p.purchase_id) as total_purchases,
             COUNT(DISTINCT t.ticket_id) as total_tickets,
             COALESCE(SUM(p.total_price), 0) as total_spent
      FROM User u
      LEFT JOIN Purchase p ON u.user_id = p.user_id
      LEFT JOIN Ticket t ON p.purchase_id = t.purchase_id
      GROUP BY u.user_id
      ORDER BY u.user_id DESC
    `);

    const formattedUsers = users.map(user => ({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      wallet: parseFloat(user.wallet),
      isAdmin: user.role === 'owner' || user.role === 'admin',
      statistics: {
        total_purchases: user.total_purchases,
        total_tickets: user.total_tickets,
        total_spent: parseFloat(user.total_spent)
      }
    }));

    sendSuccess(res, { users: formattedUsers }, 'ดึงรายการผู้ใช้สำเร็จ');
  } finally {
    await connection.end();
  }
}));

// ✅ Get all purchases
router.get('/purchases', requireAdmin, asyncHandler(async (req, res) => {
  const connection = await getConnection();
  try {
    const [purchases] = await connection.execute(`
      SELECT p.purchase_id, p.user_id, u.username, p.date, p.total_price, 
             COUNT(t.ticket_id) as ticket_count
      FROM Purchase p 
      JOIN User u ON p.user_id = u.user_id 
      LEFT JOIN Ticket t ON p.purchase_id = t.purchase_id 
      GROUP BY p.purchase_id 
      ORDER BY p.date DESC
    `);

    sendSuccess(res, { purchases }, 'ดึงรายการซื้อสำเร็จ');
  } finally {
    await connection.end();
  }
}));

// ✅ Get all tickets with detailed information (Admin only)
router.get('/tickets', requireAdmin, asyncHandler(async (req, res) => {
  const connection = await getConnection();
  try {
    const [tickets] = await connection.execute(`
      SELECT t.ticket_id, t.number, t.price, t.status,
             u.username as owner_username, u.user_id as owner_id,
             p.purchase_id, p.date as purchase_date
      FROM Ticket t
      LEFT JOIN Purchase p ON t.purchase_id = p.purchase_id
      LEFT JOIN User u ON p.user_id = u.user_id
      ORDER BY t.ticket_id DESC
    `);

    const formattedTickets = tickets.map(ticket => ({
      ticket_id: ticket.ticket_id,
      number: ticket.number,
      price: parseFloat(ticket.price),
      status: ticket.status,
      owner: ticket.owner_username ? {
        user_id: ticket.owner_id,
        username: ticket.owner_username
      } : null,
      purchase_id: ticket.purchase_id,
      purchase_date: ticket.purchase_date
    }));

    sendSuccess(res, { tickets: formattedTickets }, 'ดึงรายการตั๋วทั้งหมดสำเร็จ');
  } finally {
    await connection.end();
  }
}));

// ✅ Get system overview (Admin dashboard data)
router.get('/overview', requireAdmin, asyncHandler(async (req, res) => {
  const connection = await getConnection();
  try {
    // Get comprehensive system statistics
    const [memberCount] = await connection.execute(
      'SELECT COUNT(*) as total FROM User WHERE role = "member"'
    );

    const [adminCount] = await connection.execute(
      'SELECT COUNT(*) as total FROM User WHERE role IN ("admin", "owner")'
    );

    const [ticketStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold_tickets,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_tickets,
        SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) as claimed_tickets
      FROM Ticket
    `);

    const [revenueStats] = await connection.execute(`
      SELECT 
        SUM(CASE WHEN status = 'sold' THEN price ELSE 0 END) as total_revenue,
        AVG(price) as avg_ticket_price
      FROM Ticket
    `);

    const [prizeStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_prizes,
        SUM(amount) as total_prize_amount,
        SUM(CASE WHEN claimed = 1 THEN amount ELSE 0 END) as claimed_prize_amount
      FROM Prize
    `);

    const [recentPurchases] = await connection.execute(`
      SELECT COUNT(*) as recent_purchases
      FROM Purchase 
      WHERE date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    const overview = {
      users: {
        total_members: memberCount[0].total,
        total_admins: adminCount[0].total,
        total_users: memberCount[0].total + adminCount[0].total
      },
      tickets: {
        total: ticketStats[0].total_tickets,
        sold: ticketStats[0].sold_tickets,
        available: ticketStats[0].available_tickets,
        claimed: ticketStats[0].claimed_tickets,
        sold_percentage: ticketStats[0].total_tickets > 0 
          ? ((ticketStats[0].sold_tickets / ticketStats[0].total_tickets) * 100).toFixed(2)
          : 0
      },
      revenue: {
        total_revenue: parseFloat(revenueStats[0].total_revenue) || 0,
        average_ticket_price: parseFloat(revenueStats[0].avg_ticket_price) || 0
      },
      prizes: {
        total_prizes: prizeStats[0].total_prizes,
        total_prize_amount: parseFloat(prizeStats[0].total_prize_amount) || 0,
        claimed_prize_amount: parseFloat(prizeStats[0].claimed_prize_amount) || 0,
        unclaimed_prize_amount: parseFloat(prizeStats[0].total_prize_amount - prizeStats[0].claimed_prize_amount) || 0
      },
      activity: {
        recent_purchases_24h: recentPurchases[0].recent_purchases
      }
    };

    sendSuccess(res, { overview }, 'ดึงภาพรวมระบบสำเร็จ');
  } finally {
    await connection.end();
  }
}));

// ✅ Create New Draw (Admin only)
router.post('/draws', requireAdmin, asyncHandler(async (req, res) => {
  const { 
    poolType = 'sold', 
    prizeStructure = [
      { rank: 1, amount: 6000000, count: 1 },
      { rank: 2, amount: 200000, count: 5 },
      { rank: 3, amount: 80000, count: 10 }
    ]
  } = req.body;

  // Enhanced validation for draw creation
  if (!['sold', 'all'].includes(poolType)) {
    throw new BusinessLogicError('ประเภทการออกรางวัลต้องเป็น "sold" หรือ "all"', 'INVALID_POOL_TYPE');
  }

  if (!Array.isArray(prizeStructure) || prizeStructure.length === 0) {
    throw new BusinessLogicError('กรุณาระบุโครงสร้างรางวัล', 'MISSING_PRIZE_STRUCTURE');
  }

  // Validate each prize in structure
  prizeStructure.forEach((prize, index) => {
    if (!prize.rank || !prize.amount || !prize.count) {
      throw new BusinessLogicError(
        `โครงสร้างรางวัลไม่ถูกต้องที่ตำแหน่ง ${index + 1}`,
        'INVALID_PRIZE_STRUCTURE'
      );
    }

    InputValidator.validateNumber(prize.rank, 'อันดับรางวัล', { required: true, min: 1, integer: true });
    InputValidator.validateNumber(prize.amount, 'จำนวนเงินรางวัล', { required: true, min: 0 });
    InputValidator.validateNumber(prize.count, 'จำนวนรางวัล', { required: true, min: 1, integer: true });
  });

  // Validate system resources before heavy operation
  SystemValidator.validateSystemResources('draw_creation');
  
  const cleanup = SystemValidator.validateConcurrentOperations('draw_creation', 1);

  try {
    const drawResult = await DrawService.createDraw({
      poolType,
      prizeStructure
    });

    sendSuccess(res, {
      draw: drawResult
    }, `สร้างการออกรางวัลเรียบร้อย มีผู้ชนะ ${drawResult.totalWinners} คน`, 201);
  } finally {
    cleanup(); // Clean up concurrent operation counter
  }
}));

// ✅ Get Latest Draw Results
router.get('/draws/latest', async (req, res) => {
  try {
    const latestDraw = await DrawService.getLatestDraw();
    
    if (!latestDraw) {
      return res.json({
        message: 'ยังไม่มีการออกรางวัล',
        draw: null
      });
    }

    res.json({
      success: true,
      draw: latestDraw
    });

  } catch (error) {
    console.error('Get latest draw error:', error);
    res.status(500).json({ 
      error: 'เกิดข้อผิดพลาดในการดึงผลรางวัลล่าสุด',
      details: error.message 
    });
  }
});

// ✅ Get All Draws with Pagination
router.get('/draws', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await DrawService.getAllDraws(page, limit);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Get all draws error:', error);
    res.status(500).json({ 
      error: 'เกิดข้อผิดพลาดในการดึงรายการการออกรางวัล',
      details: error.message 
    });
  }
});

// ✅ Get Draw by ID
router.get('/draws/:drawId', requireAdmin, asyncHandler(async (req, res) => {
  const drawId = InputValidator.validateNumber(req.params.drawId, 'รหัสการออกรางวัล', { 
    required: true, 
    min: 1, 
    integer: true 
  });

  const draw = await DrawService.getDrawById(drawId);
  
  if (!draw) {
    return sendError(res, 'NOT_FOUND', null, 404);
  }

  sendSuccess(res, { draw }, 'ดึงผลรางวัลสำเร็จ');
}));

// ✅ Clear All Draws (Admin only)
router.delete('/draws', requireAdmin, async (req, res) => {
  try {
    const deletedCount = await DrawService.clearAllDraws();

    res.json({
      success: true,
      message: `ลบการออกรางวัลทั้งหมด ${deletedCount} รายการเรียบร้อย`,
      deletedCount: deletedCount
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'เกิดข้อผิดพลาดในการลบการออกรางวัล',
      details: error.message 
    });
  }
});

// ✅ Get detailed user information with purchase history (Admin only)
router.get('/users/:userId/details', requireAdmin, asyncHandler(async (req, res) => {
  const userId = InputValidator.validateNumber(req.params.userId, 'รหัสผู้ใช้', { 
    required: true, 
    min: 1, 
    integer: true 
  });

  const connection = await getConnection();
  try {
    // Get user basic information
    const [userInfo] = await connection.execute(
      'SELECT user_id, username, email, phone, role, wallet FROM User WHERE user_id = ?',
      [userId]
    );

    if (userInfo.length === 0) {
      return sendError(res, 'USER_NOT_FOUND');
    }

    const user = userInfo[0];

    // Get user's purchase history
    const [purchases] = await connection.execute(`
      SELECT p.purchase_id, p.date, p.total_price,
             COUNT(t.ticket_id) as ticket_count,
             GROUP_CONCAT(t.number ORDER BY t.number) as ticket_numbers
      FROM Purchase p
      LEFT JOIN Ticket t ON p.purchase_id = t.purchase_id
      WHERE p.user_id = ?
      GROUP BY p.purchase_id
      ORDER BY p.date DESC
    `, [userId]);

    // Get user's winning tickets
    const [winnings] = await connection.execute(`
      SELECT pr.prize_id, pr.amount, pr.rank, pr.claimed, pr.draw_date,
             t.number as winning_number
      FROM Prize pr
      JOIN Ticket t ON pr.ticket_id = t.ticket_id
      JOIN Purchase p ON t.purchase_id = p.purchase_id
      WHERE p.user_id = ?
      ORDER BY pr.draw_date DESC
    `, [userId]);

    const userDetails = {
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        wallet: parseFloat(user.wallet),
        isAdmin: user.role === 'owner' || user.role === 'admin'
      },
      statistics: {
        total_purchases: purchases.length,
        total_spent: purchases.reduce((sum, p) => sum + parseFloat(p.total_price), 0),
        total_tickets: purchases.reduce((sum, p) => sum + p.ticket_count, 0),
        total_winnings: winnings.reduce((sum, w) => sum + parseFloat(w.amount), 0),
        claimed_winnings: winnings.filter(w => w.claimed).reduce((sum, w) => sum + parseFloat(w.amount), 0),
        unclaimed_winnings: winnings.filter(w => !w.claimed).reduce((sum, w) => sum + parseFloat(w.amount), 0)
      },
      purchase_history: purchases.map(p => ({
        purchase_id: p.purchase_id,
        date: p.date,
        total_price: parseFloat(p.total_price),
        ticket_count: p.ticket_count,
        ticket_numbers: p.ticket_numbers ? p.ticket_numbers.split(',') : []
      })),
      winnings: winnings.map(w => ({
        prize_id: w.prize_id,
        amount: parseFloat(w.amount),
        rank: w.rank,
        claimed: w.claimed,
        draw_date: w.draw_date,
        winning_number: w.winning_number
      }))
    };

    sendSuccess(res, userDetails, 'ดึงข้อมูลผู้ใช้รายละเอียดสำเร็จ');
  } finally {
    await connection.end();
  }
}));

// ✅ Get system activity log (Admin only)
router.get('/activity', requireAdmin, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  const connection = await getConnection();
  try {
    // Get recent purchases
    const [recentPurchases] = await connection.execute(`
      SELECT 'purchase' as activity_type, p.date as activity_date, 
             u.username, p.total_price as amount, 
             CONCAT('ซื้อลอตเตอรี่ ', COUNT(t.ticket_id), ' ใบ') as description
      FROM Purchase p
      JOIN User u ON p.user_id = u.user_id
      LEFT JOIN Ticket t ON p.purchase_id = t.purchase_id
      GROUP BY p.purchase_id
      ORDER BY p.date DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Get recent prize claims
    const [recentClaims] = await connection.execute(`
      SELECT 'claim' as activity_type, pr.draw_date as activity_date,
             u.username, pr.amount, 
             CONCAT('ขึ้นเงินรางวัลอันดับ ', pr.rank) as description
      FROM Prize pr
      JOIN Ticket t ON pr.ticket_id = t.ticket_id
      JOIN Purchase p ON t.purchase_id = p.purchase_id
      JOIN User u ON p.user_id = u.user_id
      WHERE pr.claimed = 1
      ORDER BY pr.draw_date DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Combine and sort activities
    const activities = [...recentPurchases, ...recentClaims]
      .sort((a, b) => new Date(b.activity_date) - new Date(a.activity_date))
      .slice(0, limit);

    sendSuccess(res, { 
      activities: activities.map(a => ({
        type: a.activity_type,
        date: a.activity_date,
        username: a.username,
        amount: parseFloat(a.amount),
        description: a.description
      })),
      total: activities.length
    }, 'ดึงกิจกรรมระบบสำเร็จ');
  } finally {
    await connection.end();
  }
}));

module.exports = router;