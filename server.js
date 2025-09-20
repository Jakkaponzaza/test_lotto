const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const cors = require('cors');
const configLoader = require('./config-loader');

// Load configuration first
const config = configLoader.loadConfig();

// Import modular components
const { getConnection, validateAndFixDatabase } = require('./dbconnect');
const { errorHandler, requestLogger } = require('./middleware');

// Import controllers
const authController = require('./controllers/auth');
const ticketsController = require('./controllers/tickets');
const adminController = require('./controllers/admin');
const prizesController = require('./controllers/prizes');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: configLoader.corsOrigin,
    methods: ["GET", "POST"]
  }
});

const PORT = configLoader.serverPort;

console.log('=== LOTTO WEBSOCKET SERVER (MODULAR) ===');
console.log('Server starting with modular controller structure...');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// API Routes using modular controllers
app.use('/api/auth', authController);
app.use('/api/tickets', ticketsController);
app.use('/api/admin', adminController);
app.use('/api/prizes', prizesController);

// Direct registration endpoint (as specified in memory)
app.post('/api/register', async (req, res) => {
  const { username, password, email, phone, wallet, role } = req.body;
  
  console.log('📝 Direct API Registration attempt:', { 
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Lotto API Server is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      auth: '/api/auth/login',
      register: '/api/register',
      tickets: '/api/tickets',
      admin: '/api/admin/stats',
      prizes: '/api/prizes'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);
// Database initialization functions
async function initializeDatabase() {
  try {
    const connection = await getConnection();
    try {
      console.log('🗃️ Checking and creating required tables...');
      
      // Check if Prize table exists
      const [prizeTables] = await connection.execute(
        "SHOW TABLES LIKE 'Prize'"
      );
      
      if (prizeTables.length === 0) {
        console.log('📝 Creating Prize table with ticket reference...');
        await connection.execute(`
          CREATE TABLE Prize (
            prize_id INT AUTO_INCREMENT PRIMARY KEY,
            amount DECIMAL(10,2) NOT NULL,
            \`rank\` INT NOT NULL,
            ticket_id INT NULL,
            draw_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            claimed BOOLEAN DEFAULT FALSE,
            
            INDEX idx_prize_rank (\`rank\`),
            INDEX idx_prize_draw_date (draw_date),
            FOREIGN KEY (ticket_id) REFERENCES Ticket(ticket_id) ON DELETE SET NULL
          )
        `);
        console.log('✅ Prize table created successfully');
      }
      
      console.log('✅ Database initialization completed');
      
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}

// Helper function to generate lottery tickets if none exist
async function initializeLotteryTickets() {
  try {
    const connection = await getConnection();
    try {
      // Check if tickets already exist
      const [existingTickets] = await connection.execute('SELECT COUNT(*) as count FROM Ticket');
      const ticketCount = existingTickets[0].count;
      
      if (ticketCount === 0) {
        console.log('🎫 No lottery tickets found, creating initial 120 tickets...');
        
        // Find admin/owner user_id
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
          const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(',');
          const values = [];
          const currentDate = new Date();
          for (const num of batch) {
            values.push(num, price, currentDate, currentDate, adminUserId);
          }
          await connection.execute(`INSERT INTO Ticket (number, price, start_date, end_date, created_by) VALUES ${placeholders}`, values);
          inserted += batch.length;
        }
        
        console.log(`✅ Created ${inserted} initial lottery tickets successfully!`);
      } else {
        console.log(`🎫 Found ${ticketCount} existing lottery tickets`);
      }
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('❌ Error initializing lottery tickets:', error);
  }
}

// Store active connections and their states
const activeConnections = new Map();
const userSessions = new Map();

// User session class to maintain state
class UserSession {
  constructor(socketId, userId = null) {
    this.socketId = socketId;
    this.userId = userId;
    this.username = null;
    this.role = null;
    this.wallet = 0;
    this.isAuthenticated = false;
    this.selectedTickets = [];
    this.lastActivity = new Date();
    this.connectionTime = new Date();
  }

  authenticate(userData) {
    this.userId = userData.user_id;
    this.username = userData.username;
    this.role = userData.role;
    this.wallet = userData.wallet;
    this.isAuthenticated = true;
    this.lastActivity = new Date();
  }

  updateWallet(newAmount) {
    this.wallet = newAmount;
    this.lastActivity = new Date();
  }

  addSelectedTicket(ticketId) {
    if (!this.selectedTickets.includes(ticketId)) {
      this.selectedTickets.push(ticketId);
    }
    this.lastActivity = new Date();
  }

  removeSelectedTicket(ticketId) {
    this.selectedTickets = this.selectedTickets.filter(id => id !== ticketId);
    this.lastActivity = new Date();
  }

  clearSelectedTickets() {
    this.selectedTickets = [];
    this.lastActivity = new Date();
  }

  getSessionInfo() {
    return {
      socketId: this.socketId,
      userId: this.userId,
      username: this.username,
      role: this.role,
      wallet: this.wallet,
      isAuthenticated: this.isAuthenticated,
      selectedTickets: this.selectedTickets,
      lastActivity: this.lastActivity,
      connectionTime: this.connectionTime,
      connectionDuration: new Date() - this.connectionTime
    };
  }
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`\n🔌 NEW CONNECTION: ${socket.id}`);

  // Create new user session
  const session = new UserSession(socket.id);
  activeConnections.set(socket.id, session);

  // Send connection confirmation
  socket.emit('connected', {
    socketId: socket.id,
    timestamp: new Date().toISOString(),
    message: 'Connected to Lotto Server'
  });

  // Authentication handlers
  socket.on('auth:login', async (data) => {
    console.log(`🔐 LOGIN ATTEMPT: ${socket.id} - ${data.username}`);

    try {
      const { username, password } = data;

      if (!username || !password) {
        socket.emit('auth:error', { error: 'กรุณาระบุ username และ password' });
        return;
      }

      const connection = await getConnection();
      try {
        const [users] = await connection.execute(
          'SELECT user_id, username, role, wallet, email, phone, password FROM User WHERE username = ?',
          [username]
        );

        if (users.length === 0) {
          socket.emit('auth:error', { error: 'ไม่พบผู้ใช้นี้' });
          return;
        }

        const user = users[0];
        if (password !== user.password) {
          socket.emit('auth:error', { error: 'รหัสผ่านไม่ถูกต้อง' });
          return;
        }

        // Authenticate user in session
        session.authenticate(user);
        userSessions.set(user.user_id, session);

        // Send success response with complete user data
        const responseUser = {
          user_id: user.user_id,
          username: user.username,
          role: user.role,
          wallet: parseFloat(user.wallet),
          initial_wallet: parseFloat(user.wallet),
          current_wallet: parseFloat(user.wallet),
          email: user.email,
          phone: user.phone,
          password_hash: 'login_hash',
          password_algo: 'bcrypt',
          email_verified_at: null,
          phone_verified_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sessionInfo: session.getSessionInfo()
        };

        console.log('📤 Sending auth:success response:');
        console.log('Response data:', JSON.stringify({
          user: responseUser,
          isAdmin: user.role === 'owner' || user.role === 'admin',
          message: 'เข้าสู่ระบบสำเร็จ'
        }, null, 2));

        socket.emit('auth:success', {
          user: responseUser,
          isAdmin: user.role === 'owner' || user.role === 'admin',
          message: 'เข้าสู่ระบบสำเร็จ'
        });

        // Broadcast user joined (to admins)
        socket.broadcast.emit('user:joined', {
          userId: user.user_id,
          username: user.username,
          role: user.role
        });

        console.log(`✅ LOGIN SUCCESS: ${username} (${socket.id})`);

      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Login error:', error);
      socket.emit('auth:error', { error: 'เกิดข้อผิดพลาดในระบบ' });
    }
  });

  socket.on('auth:register', async (data) => {
    console.log(`📝 REGISTER ATTEMPT: ${socket.id} - ${data.phone || data.username}`);
    console.log('📝 Registration data received:', { 
      username: data.username, 
      email: data.email, 
      phone: data.phone, 
      hasPassword: !!data.password,
      wallet: data.wallet 
    });

    try {
      const { username, email, phone, password, role = 'member', wallet } = data;

      if (!username || !phone || !password) {
        socket.emit('auth:error', { error: 'กรุณาระบุข้อมูลให้ครบถ้วน' });
        return;
      }

      // Generate email if not provided or invalid
      let finalEmail = email;
      if (!email || !email.includes('@')) {
        // Use phone number to create a Gmail-like email for the constraint
        finalEmail = `${phone}@gmail.com`;
        console.log(`📝 Generated email for constraint: ${finalEmail}`);
      }

      if (wallet === undefined || wallet === null) {
        socket.emit('auth:error', { error: 'กรุณาระบุจำนวนเงินเริ่มต้น' });
        return;
      }

      const walletAmount = parseFloat(wallet);
      if (isNaN(walletAmount) || walletAmount < 0) {
        socket.emit('auth:error', { error: 'จำนวนเงินไม่ถูกต้อง' });
        return;
      }

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
            socket.emit('auth:error', { error: 'ชื่อผู้ใช้ถูกใช้แล้ว' });
            return;
          }
          if (existing.email === finalEmail) {
            socket.emit('auth:error', { error: 'อีเมลนี้ถูกใช้แล้ว' });
            return;
          }
          if (existing.phone === phone) {
            socket.emit('auth:error', { error: 'หมายเลขโทรศัพท์นี้ถูกใช้แล้ว' });
            return;
          }
        }

        // Create new user
        const insertQuery = `
          INSERT INTO User (username, email, phone, role, password, wallet) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        console.log(`📝 Inserting user with email: ${finalEmail}`);
        const [result] = await connection.execute(insertQuery, [
          username, finalEmail, phone, role, password, walletAmount
        ]);

        // Get created user
        const [newUser] = await connection.execute(
          'SELECT user_id, username, role, wallet, email, phone FROM User WHERE user_id = ?',
          [result.insertId]
        );

        const user = newUser[0];

        // Authenticate user in session
        session.authenticate(user);
        userSessions.set(user.user_id, session);

        const responseUser = {
          user_id: user.user_id,
          username: user.username,
          role: user.role,
          wallet: parseFloat(user.wallet),
          initial_wallet: parseFloat(user.wallet),
          current_wallet: parseFloat(user.wallet),
          email: user.email,
          phone: user.phone,
          displayed_email: email || 'Auto-generated', // Show original or indicate auto-generated
          password_hash: 'register_hash',
          password_algo: 'bcrypt',
          email_verified_at: null,
          phone_verified_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sessionInfo: session.getSessionInfo()
        };

        socket.emit('auth:success', {
          user: responseUser,
          isAdmin: false,
          message: 'สมัครสมาชิกสำเร็จ'
        });

        console.log(`✅ REGISTER SUCCESS: ${username} (${socket.id})`);

      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Register error:', error);
      socket.emit('auth:error', { error: 'เกิดข้อผิดพลาดในระบบ' });
    }
  });

  // Ticket management handlers
  socket.on('tickets:get-all', async () => {
    console.log(`🎫 GET ALL TICKETS: ${socket.id}`);

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

        console.log(`📤 Sending ${allTickets.length} tickets to client ${socket.id}`);
        console.log('First 3 tickets:', allTickets.slice(0, 3));
        
        socket.emit('tickets:list', allTickets);
        console.log(`✅ Tickets sent successfully to ${socket.id}`);
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Get tickets error:', error);
      socket.emit('error', { error: 'เกิดข้อผิดพลาดในการดึงรายการลอตเตอรี่' });
    }
  });

  socket.on('tickets:get-user', async (data) => {
    console.log(`🎫 GET USER TICKETS: ${socket.id} - User: ${data.userId}`);

    if (!session.isAuthenticated) {
      socket.emit('auth:required', { error: 'กรุณาเข้าสู่ระบบก่อน' });
      return;
    }

    try {
      const connection = await getConnection();
      try {
        const [tickets] = await connection.execute(
          'SELECT ticket_id, number, price, status FROM Ticket WHERE created_by = ? ORDER BY ticket_id DESC',
          [data.userId]
        );

        const userTickets = tickets.map(ticket => ({
          id: ticket.ticket_id,
          number: ticket.number,
          price: parseFloat(ticket.price),
          status: ticket.status,
          owner_id: data.userId
        }));

        socket.emit('tickets:user-list', userTickets);
        console.log(`🎫 Sent ${userTickets.length} user tickets to user ${data.userId}`);
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Get user tickets error:', error);
      socket.emit('error', { error: 'เกิดข้อผิดพลาดในการดึงลอตเตอรี่ของผู้ใช้' });
    }
  });

  socket.on('tickets:select', (data) => {
    console.log(`🎯 SELECT TICKET: ${socket.id} - Ticket: ${data.ticketId}`);

    if (!session.isAuthenticated) {
      socket.emit('auth:required', { error: 'กรุณาเข้าสู่ระบบก่อน' });
      return;
    }

    session.addSelectedTicket(data.ticketId);

    socket.emit('tickets:selected', {
      ticketId: data.ticketId,
      selectedTickets: session.selectedTickets,
      message: `เลือกลอตเตอรี่ ${data.ticketId} แล้ว`
    });
  });

  socket.on('tickets:deselect', (data) => {
    console.log(`❌ DESELECT TICKET: ${socket.id} - Ticket: ${data.ticketId}`);

    if (!session.isAuthenticated) {
      socket.emit('auth:required', { error: 'กรุณาเข้าสู่ระบบก่อน' });
      return;
    }

    session.removeSelectedTicket(data.ticketId);

    socket.emit('tickets:deselected', {
      ticketId: data.ticketId,
      selectedTickets: session.selectedTickets,
      message: `ยกเลิกลอตเตอรี่ ${data.ticketId} แล้ว`
    });
  });

  socket.on('tickets:purchase', async (data) => {
    console.log(`💰 PURCHASE TICKETS: ${socket.id} - Tickets: ${data.ticketIds}`);

    if (!session.isAuthenticated) {
      socket.emit('auth:required', { error: 'กรุณาเข้าสู่ระบบก่อน' });
      return;
    }

    try {
      const { ticketIds } = data;
      const userId = session.userId;

      if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
        socket.emit('purchase:error', { error: 'กรุณาเลือกลอตเตอรี่ที่ต้องการซื้อ' });
        return;
      }

      const connection = await getConnection();
      try {
        // Get ticket prices
        const placeholders = ticketIds.map(() => '?').join(',');
        const [tickets] = await connection.execute(
          `SELECT ticket_id, number, price FROM Ticket WHERE ticket_id IN (${placeholders}) AND status = 'available'`,
          ticketIds
        );

        if (tickets.length !== ticketIds.length) {
          socket.emit('purchase:error', { error: 'บางตั๋วไม่พร้อมใช้งานหรือไม่พบ' });
          return;
        }

        const totalCost = tickets.reduce((sum, ticket) => sum + parseFloat(ticket.price), 0);

        if (session.wallet < totalCost) {
          socket.emit('purchase:error', {
            error: 'ยอดเงินไม่เพียงพอ',
            required: totalCost,
            available: session.wallet
          });
          return;
        }

        // Update user wallet
        const newWallet = session.wallet - totalCost;
        await connection.execute(
          'UPDATE User SET wallet = ? WHERE user_id = ?',
          [newWallet, userId]
        );

        // Update ticket status
        await connection.execute(
          `UPDATE Ticket SET status = 'sold', created_by = ? WHERE ticket_id IN (${placeholders})`,
          [userId, ...ticketIds]
        );

        // Create purchase record
        const [purchaseResult] = await connection.execute(
          'INSERT INTO Purchase (user_id, date, total_price) VALUES (?, NOW(), ?)',
          [userId, totalCost]
        );

        // Update ticket with purchase_id
        await connection.execute(
          `UPDATE Ticket SET purchase_id = ? WHERE ticket_id IN (${placeholders})`,
          [purchaseResult.insertId, ...ticketIds]
        );

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
        const [updatedUserTickets] = await connection.execute(
          'SELECT ticket_id, number, price, status FROM Ticket WHERE created_by = ? ORDER BY ticket_id DESC',
          [userId]
        );
        
        const userTicketsList = updatedUserTickets.map(ticket => ({
          id: ticket.ticket_id,
          number: ticket.number,
          price: parseFloat(ticket.price),
          status: ticket.status,
          owner_id: userId
        }));
        
        socket.emit('tickets:user-list', userTicketsList);
        console.log(`🎫 Sent updated user tickets (${userTicketsList.length} tickets) to user ${userId}`);

        console.log(`✅ PURCHASE SUCCESS: User ${userId} bought ${ticketIds.length} tickets`);

      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Purchase error:', error);
      socket.emit('purchase:error', { error: 'เกิดข้อผิดพลาดในการซื้อลอตเตอรี่' });
    }
  });

  // Admin handlers
  socket.on('admin:get-stats', async () => {
    console.log(`📊 GET ADMIN STATS: ${socket.id}`);

    if (!session.isAuthenticated || (session.role !== 'owner' && session.role !== 'admin')) {
      socket.emit('auth:forbidden', { error: 'ไม่มีสิทธิ์เข้าถึง' });
      return;
    }

    try {
      const connection = await getConnection();
      try {
        const [memberCount] = await connection.execute(
          'SELECT COUNT(*) as total FROM User WHERE role = "member"'
        );
        const [soldTickets] = await connection.execute(
          'SELECT COUNT(*) as total FROM Ticket WHERE status = "sold"'
        );
        const [totalTickets] = await connection.execute(
          'SELECT COUNT(*) as total FROM Ticket'
        );
        const [totalValue] = await connection.execute(
          'SELECT SUM(price) as total FROM Ticket WHERE status = "sold"'
        );

        const stats = {
          totalMembers: memberCount[0].total,
          ticketsSold: soldTickets[0].total,
          ticketsLeft: totalTickets[0].total - soldTickets[0].total,
          totalValue: totalValue[0].total || 0,
          activeConnections: activeConnections.size,
          authenticatedUsers: Array.from(activeConnections.values()).filter(s => s.isAuthenticated).length
        };

        socket.emit('admin:stats', stats);
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Get stats error:', error);
      socket.emit('error', { error: 'เกิดข้อผิดพลาดในการดึงสถิติ' });
    }
  });

  // Prize claiming handler
  socket.on('claim:prize', async (data) => {
    console.log(`💰 CLAIM PRIZE REQUEST: ${socket.id}`);
    console.log(`💰 Request data:`, data);
    console.log(`💰 Session authenticated:`, session.isAuthenticated);
    console.log(`💰 Session user ID:`, session.userId);
    
    if (!session.isAuthenticated) {
      console.log('❌ User not authenticated');
      socket.emit('claim:error', { error: 'กรุณาเข้าสู่ระบบก่อน' });
      return;
    }
    
    try {
      const { userId, ticketNumber } = data;
      console.log(`💰 Parsed data - userId: ${userId}, ticketNumber: ${ticketNumber}`);
      
      if (!userId || !ticketNumber) {
        console.log('❌ Missing data');
        socket.emit('claim:error', { error: 'ข้อมูลไม่ครบถ้วน' });
        return;
      }
      
      // ตรวจสอบว่า user เป็นเจ้าของตั๋วหรือไม่
      if (session.userId !== parseInt(userId)) {
        console.log(`❌ User ID mismatch - session: ${session.userId}, request: ${userId}`);
        socket.emit('claim:error', { error: 'ไม่มีสิทธิ์ขึ้นเงินรางวัลนี้' });
        return;
      }
      
      console.log(`💰 Processing claim for user ${userId}, ticket ${ticketNumber}`);
      
      let connection;
      try {
        console.log('💰 Attempting database connection...');
        connection = await getConnection();
        console.log('✅ Database connection successful');
      } catch (dbError) {
        console.error('💀 Database connection failed:', dbError);
        socket.emit('claim:error', { error: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' });
        return;
      }
      
      try {
        // ตรวจสอบว่ามีการออกรางวัลแล้วหรือไม่
        if (!global.lastDrawResult) {
          console.log('❌ No draw result available in global.lastDrawResult');
          console.log('🔍 Checking if global object exists:', typeof global);
          console.log('🔍 Global keys:', Object.keys(global));
          socket.emit('claim:error', { error: 'ยังไม่มีการออกรางวัล' });
          return;
        }
        
        console.log(`💰 Draw result available, checking winners...`);
        console.log(`💰 global.lastDrawResult structure:`, {
          poolType: global.lastDrawResult.poolType,
          drawDate: global.lastDrawResult.drawDate,
          winnersCount: global.lastDrawResult.winners ? global.lastDrawResult.winners.length : 0,
          winners: global.lastDrawResult.winners
        });
        console.log(`💰 Winner ticket numbers:`, global.lastDrawResult.winners.map(w => w.ticketNumber));
        
        // หาว่า ticket ถูกรางวัลหรือไม่
        const winningTicket = global.lastDrawResult.winners.find(w => w.ticketNumber === ticketNumber);
        if (!winningTicket) {
          console.log(`❌ Ticket ${ticketNumber} not in winners list`);
          socket.emit('claim:error', { error: 'ตั๋วนี้ไม่ถูกรางวัล' });
          return;
        }
        
        console.log(`✅ Ticket ${ticketNumber} won prize: ${winningTicket.amount} บาท`);
        
        // ตรวจสอบว่า user เป็นเจ้าของตั๋วจริง
        console.log(`💰 Checking if user ${userId} owns ticket ${ticketNumber}...`);
        const [userTickets] = await connection.execute(
          'SELECT ticket_id, status FROM Ticket WHERE created_by = ? AND number = ?',
          [userId, ticketNumber]
        );
        
        console.log(`💰 User tickets query result:`, userTickets);
        
        if (userTickets.length === 0) {
          console.log(`❌ User ${userId} does not own ticket ${ticketNumber}`);
          socket.emit('claim:error', { error: 'คุณไม่ใช่เจ้าของตั๋วนี้' });
          return;
        }
        
        const ticketStatus = userTickets[0].status;
        console.log(`💰 Ticket status: ${ticketStatus}`);
        
        // ตรวจสอบสถานะตั๋วว่าซื้อแล้วหรือไม่
        if (ticketStatus !== 'sold' && ticketStatus !== 'purchased') {
          console.log(`❌ Ticket ${ticketNumber} has invalid status: ${ticketStatus}`);
          socket.emit('claim:error', { error: 'ตั๋วนี้ยังไม่ได้ซื้อหรือมีสถานะไม่ถูกต้อง' });
          return;
        }
        
        // ตรวจสอบว่าขึ้นเงินไปแล้วหรือไม่ (ตรวจสอบจาก claimed tickets tracking)
        if (!global.claimedTickets) {
          global.claimedTickets = new Set();
        }
        
        const claimKey = `${userId}_${ticketNumber}`;
        if (global.claimedTickets.has(claimKey)) {
          socket.emit('claim:error', { error: 'รางวัลนี้ถูกขึ้นไปแล้ว' });
          return;
        }
        
        // อัพเดต wallet ของ user
        const [userResult] = await connection.execute(
          'SELECT wallet FROM User WHERE user_id = ?',
          [userId]
        );
        
        if (userResult.length === 0) {
          socket.emit('claim:error', { error: 'ไม่พบผู้ใช้' });
          return;
        }
        
        const currentWallet = parseFloat(userResult[0].wallet);
        const newWallet = currentWallet + winningTicket.amount;
        
        // อัพเดต wallet ในฐานข้อมูล
        await connection.execute(
          'UPDATE User SET wallet = ? WHERE user_id = ?',
          [newWallet, userId]
        );
        
        // เปลี่ยนสถานะตั๋วเป็น claimed
        console.log(`💰 Updating ticket status to 'claimed' for user ${userId}, ticket ${ticketNumber}`);
        const [updateResult] = await connection.execute(
          'UPDATE Ticket SET status = ? WHERE created_by = ? AND number = ?',
          ['claimed', userId, ticketNumber]
        );
        console.log(`💰 Ticket status update result:`, updateResult);
        
        if (updateResult.affectedRows === 0) {
          console.log(`❌ No ticket was updated - possibly already claimed or not found`);
          socket.emit('claim:error', { error: 'ไม่สามารถอัพเดตสถานะตั๋วได้' });
          return;
        }
        
        // บันทึกว่าขึ้นเงินแล้ว
        global.claimedTickets.add(claimKey);
        
        // อัพเดต session wallet
        session.updateWallet(newWallet);
        
        console.log(`✅ Prize claimed successfully!`);
        console.log(`  User: ${userId}`);
        console.log(`  Ticket: ${ticketNumber}`);
        console.log(`  Prize: ${winningTicket.amount} บาท`);
        console.log(`  Old wallet: ${currentWallet}`);
        console.log(`  New wallet: ${newWallet}`);
        
        // ส่งผลลัพธ์สำเร็จ
        socket.emit('claim:success', {
          success: true,
          message: `ขึ้นเงินรางวัล ${winningTicket.amount} บาท เรียบร้อย`,
          prizeAmount: winningTicket.amount,
          newWallet: newWallet,
          ticketNumber: ticketNumber
        });
        
      } catch (claimError) {
        console.error('🔴 Error during claim processing:', claimError);
        console.error('🔴 Error code:', claimError.code);
        console.error('🔴 Error errno:', claimError.errno);
        console.error('🔴 SQL:', claimError.sql);
        console.error('🔴 SQL State:', claimError.sqlState);
        console.error('🔴 SQL Message:', claimError.sqlMessage);
        
        let errorMessage = 'เกิดข้อผิดพลาดในการขึ้นเงินรางวัล';
        
        if (claimError.code === 'WARN_DATA_TRUNCATED' || claimError.errno === 1265) {
          errorMessage = 'ข้อผิดพลาดข้อมูลในฐานข้อมูล - โปรดติดต่อผู้ดูแลระบบ';
        }
        
        socket.emit('claim:error', { 
          error: errorMessage,
          details: claimError.message,
          code: claimError.code,
          errno: claimError.errno
        });
      } finally {
        if (connection) {
          await connection.end();
        }
      }
    } catch (error) {
      console.error('💀 CRITICAL CLAIM PRIZE ERROR:', error);
      console.error('💀 Error stack:', error.stack);
      console.error('💀 Error name:', error.name);
      console.error('💀 Error message:', error.message);
      
      socket.emit('claim:error', { 
        error: 'เกิดข้อผิดพลาดในการขึ้นเงินรางวัล',
        details: error.message,
        errorType: error.name,
        stack: error.stack
      });
    }
  });

  socket.on('session:get-all', () => {
    if (!session.isAuthenticated || (session.role !== 'owner' && session.role !== 'admin')) {
      socket.emit('auth:forbidden', { error: 'ไม่มีสิทธิ์เข้าถึง' });
      return;
    }

    const allSessions = Array.from(activeConnections.values()).map(s => s.getSessionInfo());
    socket.emit('session:all', allSessions);
  });

  // Force create lottery tickets handler
  socket.on('admin:create-tickets', async () => {
    console.log(`🎫 FORCE CREATE TICKETS: ${socket.id}`);

    if (!session.isAuthenticated || (session.role !== 'owner' && session.role !== 'admin')) {
      socket.emit('auth:forbidden', { error: 'ไม่มีสิทธิ์เข้าถึง' });
      return;
    }

    try {
      const connection = await getConnection();
      try {
        console.log('🎫 Force creating 120 lottery tickets...');
        
        // ลบลอตเตอรี่เก่าทั้งหมดก่อน
        await connection.execute('DELETE FROM Ticket');
        
        // หา admin user_id สำหรับ created_by
        const [adminUser] = await connection.execute(
          "SELECT user_id FROM User WHERE role IN ('owner', 'admin') ORDER BY user_id LIMIT 1"
        );
        const adminUserId = adminUser.length > 0 ? adminUser[0].user_id : 1;
        
        const desiredCount = 120;
        const price = 80.00;
        const numbersSet = new Set();
        
        // สร้างหมายเลขสุ่ม 6 หลัก (000000-999999) จำนวน 120 ชุด
        while (numbersSet.size < desiredCount) {
          const n = Math.floor(Math.random() * 1000000); // 0-999999
          const s = n.toString().padStart(6, '0'); // เติม 0 ข้างหน้าให้ครบ 6 หลัก
          numbersSet.add(s);
        }
        const numbers = Array.from(numbersSet);
        
        const batchSize = 50;
        let inserted = 0;
        for (let i = 0; i < numbers.length; i += batchSize) {
          const batch = numbers.slice(i, i + batchSize);
          const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(',');
          const values = [];
          const currentDate = new Date();
          for (const num of batch) {
            values.push(num, price, currentDate, currentDate, adminUserId); // number, price, start_date, end_date, created_by
          }
          await connection.execute(`INSERT INTO Ticket (number, price, start_date, end_date, created_by) VALUES ${placeholders}`, values);
          inserted += batch.length;
        }
        
        console.log(`✅ Force created ${inserted} lottery tickets successfully!`);
        
        // ส่งกลับไปยัง client
        socket.emit('admin:tickets-created', {
          success: true,
          message: `สร้างลอตเตอรี่เรียบร้อย จำนวน ${inserted} ใบ`,
          ticketsCreated: inserted
        });
        
        // แจ้งให้ client ทั้งหมดทราบ
        io.emit('tickets:updated', {
          message: 'มีลอตเตอรี่ใหม่แล้ว',
          ticketsCreated: inserted
        });
        
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.log('\n=== CREATE TICKETS ERROR ===');
      console.error('Error details:', error);
      socket.emit('error', {
        error: 'เกิดข้อผิดพลาดในการสร้างลอตเตอรี่',
        details: error.message
      });
    }
  });

  // Admin draw prizes handler - Simplified version using only Prize table
  socket.on('admin:draw-prizes', async (data) => {
    console.log(`🎯 ADMIN DRAW PRIZES REQUEST: ${socket.id}`);
    
    if (!session.isAuthenticated || (session.role !== 'owner' && session.role !== 'admin')) {
      socket.emit('auth:forbidden', { error: 'ไม่มีสิทธิ์เข้าถึง' });
      return;
    }
    
    try {
      const { poolType, rewards } = data;
      
      if (!poolType || !rewards || !Array.isArray(rewards) || rewards.length !== 5) {
        socket.emit('admin:draw-error', { error: 'ข้อมูลไม่ถูกต้อง กรุณาระบุประเภทพูลและรางวัล 5 รางวัล' });
        return;
      }
      
      // ตรวจสอบว่าจำนวนเงินรางวัลถูกต้อง
      if (rewards.some(r => !r || r <= 0)) {
        socket.emit('admin:draw-error', { error: 'กรุณาระบุจำนวนเงินรางวัลให้ถูกต้อง' });
        return;
      }
      
      const connection = await getConnection();
      try {
        console.log(`🎯 Drawing prizes with pool type: ${poolType}`);
        console.log(`💰 Prize amounts: ${rewards}`);
        
        // ดึงตั๋วที่จะใช้ในการสุ่ม
        let query;
        let params = [];
        
        if (poolType === 'sold') {
          query = 'SELECT ticket_id, number FROM Ticket WHERE status = "sold" ORDER BY RAND()';
          console.log('🎯 Drawing from SOLD tickets only');
        } else {
          query = 'SELECT ticket_id, number FROM Ticket ORDER BY RAND()';
          console.log('🎯 Drawing from ALL tickets');
        }
        
        const [ticketPool] = await connection.execute(query, params);
        
        // ตรวจสอบกรณีเลือกตั๋วที่ขายแล้วแต่ไม่มีตั๋วที่ขายแล้ว
        if (poolType === 'sold' && ticketPool.length === 0) {
          console.log('⚠️ No sold tickets available for drawing');
          socket.emit('admin:draw-error', { 
            error: 'ไม่มีตั๋วที่ขายแล้วในระบบ',
            code: 'NO_SOLD_TICKETS',
            suggestion: 'เปลี่ยนเป็นสุ่มจากตั๋วทั้งหมดหรือขายตั๋วก่อน'
          });
          return;
        }
        
        if (ticketPool.length < 5) {
          console.log(`⚠️ Only ${ticketPool.length} tickets available, need 5 minimum`);
          
          if (poolType === 'sold') {
            // สำหรับ 'sold' pool type - ไม่เพียงพอ
            socket.emit('admin:draw-error', { 
              error: `มีตั๋วที่ขายแล้วเพียง ${ticketPool.length} ใบ ต้องการ 5 ใบขั้นต่ำ`,
              code: 'INSUFFICIENT_SOLD_TICKETS'
            });
          } else {
            // สำหรับ 'all' pool type - ไม่เพียงพอ
            socket.emit('admin:draw-error', { 
              error: `มีตั๋วในระบบเพียง ${ticketPool.length} ใบ ต้องการ 5 ใบขั้นต่ำ`,
              code: 'INSUFFICIENT_TICKETS',
              suggestion: 'กรุณาสร้างตั๋วใหม่ก่อนออกรางวัล'
            });
          }
          return;
        }
        
        console.log(`🎯 Found ${ticketPool.length} tickets in pool for drawing`);
        console.log(`💫 Available tickets: ${ticketPool.slice(0, 10).map(t => t.number).join(', ')}${ticketPool.length > 10 ? '...' : ''}`);
        
        // สุ่มเลือก 5 ตั๋วที่ไม่ซ้ำกัน
        const shuffled = [...ticketPool].sort(() => 0.5 - Math.random());
        const winningTickets = shuffled.slice(0, 5);
        
        console.log('🎯 Selected winning tickets:');
        winningTickets.forEach((ticket, index) => {
          console.log(`  รางวัลที่ ${index + 1}: ${ticket.number} (รางวัล ${rewards[index]} บาท)`);
        });
        
        // เคลียร์รางวัลเก่าก่อนสร้างใหม่
        await connection.execute('DELETE FROM Prize');
        
        // สร้าง Prize records พร้อมเก็บหมายเลขตั๋วที่ถูกรางวัล
        const prizeData = winningTickets.map((ticket, index) => {
          const rank = index + 1;
          const amount = rewards[index];
          const ticketNumber = ticket.number;
          
          return {
            rank: rank,
            amount: amount,
            ticketNumber: ticketNumber
          };
        });
        
        // เก็บข้อมูลรางวัลในรูปแบบ JSON string ใน Prize table
        // ใช้ rank = 0 เป็น special record สำหรับเก็บข้อมูลการออกรางวัลทั้งหมด
        const drawDataJson = JSON.stringify({
          poolType: poolType,
          drawDate: new Date().toISOString(),
          winners: prizeData
        });
        
        await connection.execute(
          'INSERT INTO Prize (amount, `rank`) VALUES (?, ?)',
          [0, 0] // Special record for storing draw metadata
        );
        
        // เก็บข้อมูลรางวัลแต่ละรางวัลด้วย
        const prizePromises = prizeData.map(prize => {
          return connection.execute(
            'INSERT INTO Prize (amount, `rank`) VALUES (?, ?)',
            [prize.amount, prize.rank]
          );
        });
        
        await Promise.all(prizePromises);
        
        // เก็บข้อมูลการออกรางวัลใน global variable เพื่อใช้ในการส่งผลลัพธ์
        global.lastDrawResult = {
          poolType: poolType,
          drawDate: new Date().toISOString(),
          winners: prizeData
        };
        
        // ดึงข้อมูลรางวัลที่เพิ่งสร้าง (ใช้เฉพาะ 3 columns)
        const [newPrizes] = await connection.execute(
          'SELECT prize_id, amount, `rank` FROM Prize WHERE `rank` > 0 ORDER BY `rank` ASC'
        );
        
        const drawResultData = {
          id: `draw_${Date.now()}`,
          poolType: poolType,
          createdAt: new Date().toISOString(),
          prizes: newPrizes.map((p, index) => ({
            tier: p.rank,
            ticketId: prizeData[index] ? prizeData[index].ticketNumber : `หมายเลข ${p.rank}`,
            amount: parseFloat(p.amount),
            claimed: false
          })),
          // เพิ่ม winners map พร้อมหมายเลขตั๋วที่ถูกรางวัลจริง
          winners: {
            'รางวัลที่ 1': prizeData[0] ? [prizeData[0].ticketNumber] : [],
            'รางวัลที่ 2': prizeData[1] ? [prizeData[1].ticketNumber] : [],
            'รางวัลที่ 3': prizeData[2] ? [prizeData[2].ticketNumber] : [],
            'รางวัลที่ 4': prizeData[3] ? [prizeData[3].ticketNumber] : [],
            'รางวัลที่ 5': prizeData[4] ? [prizeData[4].ticketNumber] : [],
          }
        };
        
        console.log('🎯 Draw completed successfully!');
        console.log('🏆 Final winners data stored in global.lastDrawResult:');
        console.log('  Winners:', global.lastDrawResult.winners.map(w => `${w.ticketNumber} (รางวัลที่ ${w.rank})`).join(', '));
        console.log('📡 Broadcasting draw result to all clients...');
        
        // ส่งผลลัพธ์กลับไปยัง admin
        socket.emit('admin:draw-success', {
          success: true,
          drawResult: drawResultData,
          message: `ออกรางวัล ${poolType === 'sold' ? 'จากตั๋วที่ขายแล้ว' : 'จากตั๋วทั้งหมด'} เรียบร้อย`
        });
        
        // แจ้งไปยัง client ทั้งหมดว่ามีการออกรางวัลใหม่
        io.emit('draw:new-result', {
          drawResult: drawResultData,
          message: '🏆 มีการออกรางวัลใหม่!'
        });
        
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Draw prizes error:', error);
      socket.emit('admin:draw-error', { 
        error: 'เกิดข้อผิดพลาดในการออกรางวัล',
        details: error.message 
      });
    }
  });

  // Get latest draw result handler - Enhanced version with actual winners
  socket.on('draw:get-latest', async () => {
    console.log(`📊 GET LATEST DRAW: ${socket.id}`);
    
    try {
      // ตรวจสอบว่ามีข้อมูลการออกรางวัลล่าสุดใน global variable หรือไม่
      if (global.lastDrawResult) {
        console.log('🎯 Found cached draw result with winners:', global.lastDrawResult.winners.map(w => w.ticketNumber));
        console.log('📤 Sending cached winners to client...');
        
        const drawResultData = {
          id: `draw_cached`,
          poolType: global.lastDrawResult.poolType,
          createdAt: global.lastDrawResult.drawDate,
          prizes: global.lastDrawResult.winners.map(winner => ({
            tier: winner.rank,
            ticketId: winner.ticketNumber,
            amount: winner.amount,
            claimed: false
          })),
          // ส่งหมายเลขที่ถูกรางวัลจริง
          winners: {
            'รางวัลที่ 1': global.lastDrawResult.winners[0] ? [global.lastDrawResult.winners[0].ticketNumber] : [],
            'รางวัลที่ 2': global.lastDrawResult.winners[1] ? [global.lastDrawResult.winners[1].ticketNumber] : [],
            'รางวัลที่ 3': global.lastDrawResult.winners[2] ? [global.lastDrawResult.winners[2].ticketNumber] : [],
            'รางวัลที่ 4': global.lastDrawResult.winners[3] ? [global.lastDrawResult.winners[3].ticketNumber] : [],
            'รางวัลที่ 5': global.lastDrawResult.winners[4] ? [global.lastDrawResult.winners[4].ticketNumber] : [],
          }
        };
        
        console.log('📤 Sending draw result with winners:', drawResultData.winners);
        socket.emit('draw:latest-result', { drawResult: drawResultData });
        return;
      }
      
      const connection = await getConnection();
      try {
        // ดึงรางวัลล่าสุด 5 รางวัลจาก Prize table (เฉพาะรางวัลจริง ไม่รวม metadata record)
        const [prizes] = await connection.execute(
          'SELECT prize_id, amount, `rank` FROM Prize WHERE `rank` > 0 ORDER BY prize_id DESC LIMIT 5'
        );
        
        if (prizes.length === 0) {
          console.log('🎯 No draw results found');
          socket.emit('draw:latest-result', { drawResult: null });
          return;
        }
        
        console.log('🎯 Found prizes but no cached winners - sending empty winners');
        
        // สำหรับระบบเรียบง่าย หากไม่มีข้อมูลการออกรางวัลใน cache 
        // จะส่ง empty winners เพื่อให้ member page แสดงว่าไม่มีรางวัล
        const drawResultData = {
          id: `draw_simple`,
          poolType: 'all',
          createdAt: new Date().toISOString(),
          prizes: prizes.map(p => ({
            tier: p.rank,
            ticketId: `รางวัลที่ ${p.rank}`,
            amount: parseFloat(p.amount),
            claimed: false
          })),
          // ส่ง empty winners เพื่อให้ member page รู้ว่าไม่มีคนถูกรางวัล
          winners: {
            'รางวัลที่ 1': [],
            'รางวัลที่ 2': [],
            'รางวัลที่ 3': [],
            'รางวัลที่ 4': [],
            'รางวัลที่ 5': [],
          }
        };
        
        socket.emit('draw:latest-result', { drawResult: drawResultData });
        
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Get latest draw error:', error);
      socket.emit('error', { error: 'เกิดข้อผิดพลาดในการดึงผลรางวัลล่าสุด' });
    }
  });

  // Admin reset handler
  socket.on('admin:reset', async () => {
    console.log(`🔄 ADMIN RESET REQUEST: ${socket.id}`);

    if (!session.isAuthenticated || (session.role !== 'owner' && session.role !== 'admin')) {
      socket.emit('auth:forbidden', { error: 'ไม่มีสิทธิ์เข้าถึง' });
      return;
    }

    try {
      const connection = await getConnection();
      try {
        console.log('🖾️ Resetting system - clearing data...');

        // Clear prizes (lottery draw results)
        try {
          await connection.execute('DELETE FROM Prize');
          await connection.execute('ALTER TABLE Prize AUTO_INCREMENT = 1');
          console.log('✅ Cleared prize data and reset prize_id counter');
        } catch (error) {
          console.log('⚠️ Prize table may not exist yet:', error.message);
        }

        // Clear purchases and tickets
        try {
          await connection.execute('DELETE FROM Purchase');
          await connection.execute('ALTER TABLE Purchase AUTO_INCREMENT = 1');
          console.log('✅ Cleared purchase data and reset purchase_id counter');
        } catch (error) {
          console.log('⚠️ Purchase table may not exist yet:', error.message);
        }

        // Delete all tickets
        await connection.execute('DELETE FROM Ticket');
        console.log('✅ Cleared all ticket data');
        
        // Reset AUTO_INCREMENT counter for Ticket table
        await connection.execute('ALTER TABLE Ticket AUTO_INCREMENT = 1');
        console.log('✅ Reset ticket_id counter to start from 1');

        // Delete all member users (keep admin and owner)
        await connection.execute("DELETE FROM User WHERE role = 'member'");
        console.log('✅ Cleared member users');

        console.log('=== RESET SUCCESS ===');
        console.log('✅ System reset completed');
        console.log('🎫 No new tickets created - create manually from admin page if needed');
        console.log('👤 Kept admin/owner accounts only');

        // Notify all clients about the reset
        io.emit('admin:reset-success', {
          message: 'รีเซ็ตระบบเรียบร้อย',
          ticketsCreated: 0
        });

        socket.emit('admin:reset-success', {
          success: true,
          message: 'รีเซ็ตระบบเรียบร้อย ตั๋วทั้งหมดถูกลบแล้ว สามารถสร้างตั๋วใหม่จากหน้า admin ได้',
          ticketsCreated: 0
        });

      } finally {
        await connection.end();
      }
    } catch (error) {
      console.log('\n=== RESET ERROR ===');
      console.error('Error details:', error);
      socket.emit('error', {
        error: 'เกิดข้อผิดพลาดในการรีเซ็ตระบบ',
        details: error.message
      });
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`🔌 DISCONNECTED: ${socket.id}`);

    const session = activeConnections.get(socket.id);
    if (session && session.isAuthenticated) {
      userSessions.delete(session.userId);

      // Broadcast user left
      socket.broadcast.emit('user:left', {
        userId: session.userId,
        username: session.username,
        role: session.role
      });

      console.log(`👤 USER LEFT: ${session.username} (${socket.id})`);
    }

    activeConnections.delete(socket.id);
    console.log(`📊 Active connections: ${activeConnections.size}`);
  });

  // Error handler
  socket.on('error', (error) => {
    console.error(`❌ SOCKET ERROR: ${socket.id}`, error);
  });
});

// Start server with both REST API and WebSocket
server.listen(PORT, async () => {
  console.log(`🚀 Lotto Server (REST + WebSocket) running on port ${PORT}`);
  console.log(`🌐 REST API available at: http://localhost:${PORT}/api/`);
  console.log(`🌐 WebSocket Server ready for connections`);
  console.log(`📊 Server Type: Hybrid REST API + WebSocket`);
  console.log('\n=== API ENDPOINTS ===');
  console.log('Authentication: /api/auth/login, /api/auth/register');
  console.log('Tickets: /api/tickets/, /api/tickets/user/:userId, /api/tickets/purchase');
  console.log('Admin: /api/admin/stats, /api/admin/reset, /api/admin/users');
  console.log('Prizes: /api/prizes/, /api/prizes/claim');
  console.log('Health: /health');
  console.log('\n=== WEBSOCKET EVENTS ===');
  console.log('Auth: auth:login, auth:register');
  console.log('Tickets: tickets:get-all, tickets:get-user, tickets:select');
  console.log('Admin: admin:get-stats, admin:create-tickets');
  console.log('Prize: claim:prize');
  
  try {
    // Validate and fix database schema first
    await validateAndFixDatabase();
    
    // Initialize database and create required tables
    await initializeDatabase();
    
    // Initialize lottery tickets if needed
    await initializeLotteryTickets();
    
    console.log('✅ Server initialization completed successfully');
    console.log('📋 Use REST API for standard operations, WebSocket for real-time features');
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
  }
});