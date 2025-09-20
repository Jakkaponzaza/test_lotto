const express = require('express');
const { getConnection } = require('../dbconnect');

const router = express.Router();

// ✅ GET all tickets
router.get('/', async (req, res) => {
  try {
    const connection = await getConnection();
    try {
      const [tickets] = await connection.execute(
        'SELECT ticket_id, number, price, status, created_by AS owner_id FROM Ticket ORDER BY number'
      );

      const allTickets = tickets.map(ticket => ({
        id: ticket.ticket_id,
        number: ticket.number,
        price: parseFloat(ticket.price),
        status: ticket.status,
        owner_id: ticket.owner_id
      }));

      res.json(allTickets);
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงรายการลอตเตอรี่' });
  }
});

// ✅ GET user tickets
router.get('/user/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);

  try {
    const connection = await getConnection();
    try {
      const [tickets] = await connection.execute(
        'SELECT ticket_id, number, price, status FROM Ticket WHERE created_by = ? ORDER BY ticket_id DESC',
        [userId]
      );

      const userTickets = tickets.map(ticket => ({
        id: ticket.ticket_id,
        number: ticket.number,
        price: parseFloat(ticket.price),
        status: ticket.status,
        owner_id: userId
      }));

      res.json(userTickets);
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงลอตเตอรี่ของผู้ใช้' });
  }
});

// ✅ Purchase tickets
router.post('/purchase', async (req, res) => {
  const { ticketIds, userId } = req.body;

  if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
    return res.status(400).json({ error: 'กรุณาเลือกลอตเตอรี่ที่ต้องการซื้อ' });
  }

  try {
    const connection = await getConnection();
    try {
      // Get ticket prices
      const placeholders = ticketIds.map(() => '?').join(',');
      const [tickets] = await connection.execute(
        `SELECT ticket_id, number, price FROM Ticket WHERE ticket_id IN (${placeholders}) AND status = 'available'`,
        ticketIds
      );

      if (tickets.length !== ticketIds.length) {
        return res.status(400).json({ error: 'บางตั๋วไม่พร้อมใช้งานหรือไม่พบ' });
      }

      const totalCost = tickets.reduce((sum, ticket) => sum + parseFloat(ticket.price), 0);

      // Get user wallet
      const [userResult] = await connection.execute(
        'SELECT wallet FROM User WHERE user_id = ?',
        [userId]
      );

      if (userResult.length === 0) {
        return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
      }

      const currentWallet = parseFloat(userResult[0].wallet);

      if (currentWallet < totalCost) {
        return res.status(400).json({
          error: 'ยอดเงินไม่เพียงพอ',
          required: totalCost,
          available: currentWallet
        });
      }

      // Update user wallet
      const newWallet = currentWallet - totalCost;
      await connection.execute(
        'UPDATE User SET wallet = ? WHERE user_id = ?',
        [newWallet, userId]
      );

      // Create purchase record
      const [purchaseResult] = await connection.execute(
        'INSERT INTO Purchase (user_id, date, total_price) VALUES (?, NOW(), ?)',
        [userId, totalCost]
      );

      // Update ticket status
      await connection.execute(
        `UPDATE Ticket SET status = 'sold', created_by = ?, purchase_id = ? WHERE ticket_id IN (${placeholders})`,
        [userId, purchaseResult.insertId, ...ticketIds]
      );

      res.json({
        success: true,
        message: `ซื้อหวย ${ticketIds.length} ใบ เป็นเงิน ${totalCost} บาท เรียบร้อย`,
        purchasedTickets: ticketIds,
        totalCost: totalCost,
        remainingWallet: newWallet
      });

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการซื้อลอตเตอรี่' });
  }
});

module.exports = router;