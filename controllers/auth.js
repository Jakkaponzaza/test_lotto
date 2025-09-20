const express = require('express');
const { getConnection } = require('../dbconnect');

const router = express.Router();

// ✅ Register
router.post('/register', async (req, res) => {
  const { username, password, email, phone, wallet, role } = req.body;
  
  console.log('📝 REST API Registration attempt:', { 
    username, 
    email, 
    phone, 
    hasPassword: !!password,
    wallet 
  });

  if (!username || !password || !phone) {
    return res.status(400).json({ error: "กรุณาระบุข้อมูลให้ครบถ้วน" });
  }

  // Generate email if not provided or invalid (following memory specification)
  let finalEmail = email;
  if (!email || !email.includes('@')) {
    // Use phone number to create a Gmail-like email for the constraint
    finalEmail = `${phone}@gmail.com`;
    console.log(`📝 Generated email for constraint: ${finalEmail}`);
  }

  try {
    const connection = await getConnection();
    try {
      // Check for existing users
      const [existingUsers] = await connection.execute(
        'SELECT user_id, username, email, phone FROM User WHERE username = ? OR email = ? OR phone = ?',
        [username, finalEmail, phone]
      );

      if (existingUsers.length > 0) {
        const existing = existingUsers[0];
        if (existing.username === username) {
          return res.status(400).json({ error: 'ชื่อผู้ใช้ถูกใช้แล้ว' });
        }
        if (existing.email === finalEmail) {
          return res.status(400).json({ error: 'อีเมลนี้ถูกใช้แล้ว' });
        }
        if (existing.phone === phone) {
          return res.status(400).json({ error: 'หมายเลขโทรศัพท์นี้ถูกใช้แล้ว' });
        }
      }

      const walletAmount = parseFloat(wallet) || 0;
      const userRole = role || 'member';

      // Create new user
      console.log(`📝 Inserting user with email: ${finalEmail}`);
      const [result] = await connection.execute(
        'INSERT INTO User (username, email, phone, role, password, wallet) VALUES (?, ?, ?, ?, ?, ?)',
        [username, finalEmail, phone, userRole, password, walletAmount]
      );

      res.status(201).json({
        message: "✅ User registered successfully",
        user_id: result.insertId,
        email_used: finalEmail,
        email_generated: !email || !email.includes('@')
      });

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ✅ Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "❌ Missing username or password" });
  }

  try {
    const connection = await getConnection();
    try {
      const [users] = await connection.execute(
        'SELECT user_id, username, role, wallet, email, phone, password FROM User WHERE username = ?',
        [username]
      );

      if (users.length === 0) {
        return res.status(401).json({ message: "❌ Invalid username or password" });
      }

      const user = users[0];
      if (password !== user.password) {
        return res.status(401).json({ message: "❌ Invalid username or password" });
      }

      // Send success response
      res.json({
        message: "✅ Login successful",
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          wallet: parseFloat(user.wallet),
          isAdmin: user.role === 'owner' || user.role === 'admin',
          redirectTo: user.role === 'owner' || user.role === 'admin' ? '/admin' : '/member'
        },
      });

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

module.exports = router;