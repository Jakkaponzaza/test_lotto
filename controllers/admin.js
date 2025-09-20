const express = require('express');
const { getConnection } = require('../dbconnect');

const router = express.Router();

// ✅ Get Admin Statistics
router.get('/stats', async (req, res) => {
  try {
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
        totalValue: totalValue[0].total || 0,
        activeConnections: 0, // Will be updated from WebSocket
        authenticatedUsers: 0 // Will be updated from WebSocket
      };

      res.json(stats);
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงสถิติ' });
  }
});

// ✅ Complete System Reset - ลบทุกอย่าง เหลือแค่ admin
router.post('/reset', async (req, res) => {
  try {
    const connection = await getConnection();
    try {
      console.log('🔄 COMPLETE SYSTEM RESET: Starting...');

      // 1. ลบข้อมูลทั้งหมดตามลำดับ (เพื่อหลีกเลี่ยง foreign key constraints)
      console.log('🔄 Deleting all purchases...');
      await connection.execute('DELETE FROM Purchase');
      
      console.log('🔄 Deleting all prizes...');
      await connection.execute('DELETE FROM Prize');
      
      console.log('🔄 Deleting all tickets...');
      await connection.execute('DELETE FROM Ticket');
      
      // 2. ลบ users ทั้งหมด ยกเว้น admin
      console.log('🔄 Deleting all users except admin...');
      const [deletedUsers] = await connection.execute(
        "DELETE FROM User WHERE role NOT IN ('admin', 'owner')"
      );
      console.log(`🔄 Deleted ${deletedUsers.affectedRows} member users`);

      // 3. หา admin user ID
      const [adminUser] = await connection.execute(
        "SELECT user_id, username FROM User WHERE role IN ('owner', 'admin') ORDER BY user_id LIMIT 1"
      );
      
      if (adminUser.length === 0) {
        throw new Error('No admin user found! Cannot reset system.');
      }
      
      const adminUserId = adminUser[0].user_id;
      const adminUsername = adminUser[0].username;
      console.log(`🔄 Admin user preserved: ${adminUsername} (ID: ${adminUserId})`);

      // 4. สร้างตั๋วใหม่ 120 ใบ
      console.log('🔄 Creating 120 new lottery tickets...');
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
        const placeholders = batch.map(() => '(?, ?, NOW(), NOW(), ?)').join(',');
        const values = [];

        for (const num of batch) {
          values.push(num, price, adminUserId);
        }

        await connection.execute(
          `INSERT INTO Ticket (number, price, created_at, updated_at, created_by) VALUES ${placeholders}`,
          values
        );
        inserted += batch.length;
      }

      console.log('✅ SYSTEM RESET COMPLETE!');
      console.log(`   - Users remaining: 1 (${adminUsername})`);
      console.log(`   - Tickets created: ${inserted}`);
      console.log(`   - All purchases deleted`);
      console.log(`   - All prizes deleted`);

      res.json({
        success: true,
        message: `รีเซ็ทระบบเรียบร้อย เหลือแค่ admin และตั๋วใหม่ ${inserted} ใบ`,
        ticketsCreated: inserted,
        usersRemaining: 1,
        adminPreserved: adminUsername
      });

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('❌ System reset error:', error);
    res.status(500).json({ 
      error: 'เกิดข้อผิดพลาดในการรีเซ็ทระบบ',
      details: error.message 
    });
  }
});

// ✅ Reset Tickets Only (เก็บไว้สำหรับกรณีที่ต้องการรีเซ็ทแค่ตั๋ว)
router.post('/reset-tickets', async (req, res) => {
  try {
    const connection = await getConnection();
    try {
      console.log('🎫 Resetting lottery tickets only...');

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
        const placeholders = batch.map(() => '(?, ?, NOW(), NOW(), ?)').join(',');
        const values = [];

        for (const num of batch) {
          values.push(num, price, adminUserId);
        }

        await connection.execute(
          `INSERT INTO Ticket (number, price, created_at, updated_at, created_by) VALUES ${placeholders}`,
          values
        );
        inserted += batch.length;
      }

      console.log(`✅ Created ${inserted} new lottery tickets!`);

      res.json({
        success: true,
        message: `สร้างตั๋วลอตเตอรี่ใหม่ ${inserted} ใบเรียบร้อย`,
        ticketsCreated: inserted
      });

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Reset tickets error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างตั๋วใหม่' });
  }
});

// ✅ Get all users
router.get('/users', async (req, res) => {
  try {
    const connection = await getConnection();
    try {
      const [users] = await connection.execute(
        'SELECT user_id, username, email, phone, role, wallet, created_at FROM User ORDER BY created_at DESC'
      );

      res.json(users);
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงรายชื่อผู้ใช้' });
  }
});

// ✅ Get all purchases
router.get('/purchases', async (req, res) => {
  try {
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

      res.json(purchases);
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงรายการซื้อ' });
  }
});

module.exports = router;