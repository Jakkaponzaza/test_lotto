// Load environment variables first
if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: '.env.production' });
}

const express = require('express');
const cors = require('cors');
const configLoader = require('./config-loader');

// Load configuration first
const config = configLoader.loadConfig();

// Import modular components
const { getConnection, validateAndFixDatabase } = require('./dbconnect');
const { errorHandler, requestLogger, notFoundHandler, rateLimit } = require('./middleware');

// Import controllers
const authController = require('./controllers/auth');
const ticketsController = require('./controllers/tickets');
const adminController = require('./controllers/admin');
const prizesController = require('./controllers/prizes');
const usersController = require('./controllers/users');

// Create Express app
const app = express();

const PORT = configLoader.serverPort;

console.log('🚀 Lotto REST API Server starting...');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Apply rate limiting to API routes - เพิ่มขีดจำกัดให้มากขึ้น
app.use('/api/', rateLimit(5 * 60 * 1000, 500)); // 500 requests per 5 minutes

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Lotto API v1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      authentication: {
        login: 'POST /api/auth/login',
        register: 'POST /api/register',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout'
      },
      users: {
        profile: 'GET /api/users/profile',
        wallet: 'GET /api/users/wallet',
        purchases: 'GET /api/users/purchases',
        winnings: 'GET /api/users/winnings'
      },
      tickets: {
        list: 'GET /api/tickets',
        myTickets: 'GET /api/tickets/my-tickets',
        purchase: 'POST /api/tickets/purchase'
      },
      prizes: {
        list: 'GET /api/prizes',
        claim: 'POST /api/prizes/claim',
        checkWinner: 'GET /api/prizes/check/:ticketNumber'
      },
      admin: {
        stats: 'GET /api/admin/stats',
        users: 'GET /api/admin/users',
        draws: 'GET /api/admin/draws'
      }
    }
  });
});

// API Routes using modular controllers
app.use('/api/auth', authController);
app.use('/api/tickets', ticketsController);
app.use('/api/admin', adminController);
app.use('/api/prizes', prizesController);
app.use('/api/users', usersController);

// Direct registration endpoint (legacy support)
const UserService = require('./services/UserService');
const { generateToken, generateRefreshToken } = require('./middleware/auth');

app.post('/api/register', async (req, res) => {
  const { username, password, email, phone, wallet, role } = req.body;
  


  try {
    const result = await UserService.register({
      username,
      password,
      email,
      phone,
      wallet: parseFloat(wallet) || 0,
      role: role || 'member'
    });

    // Generate tokens for the new user
    const accessToken = generateToken(result.user);
    const refreshToken = generateRefreshToken(result.user);

    res.status(201).json({
      success: true,
      message: "สมัครสมาชิกสำเร็จ",
      timestamp: new Date().toISOString(),
      data: {
        user: {
          user_id: result.user.user_id,
          username: result.user.username,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role,
          wallet: result.user.wallet,
          isAdmin: result.user.role === 'owner' || result.user.role === 'admin'
        },
        tokens: {
          accessToken,
          refreshToken
        },
        email_generated: result.emailGenerated
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    console.error('Register error stack:', error.stack);
    console.error('Register error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    if (error.message.includes('ชื่อผู้ใช้') || 
        error.message.includes('อีเมล') || 
        error.message.includes('หมายเลขโทรศัพท์') ||
        error.message.includes('กรุณาระบุข้อมูล')) {
      return res.status(400).json({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'เกิดข้อผิดพลาดในระบบ',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ยินดีต้อนรับสู่ Lotto API Server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    documentation: {
      health: '/health',
      api: '/api',
      endpoints: 'ดู /health สำหรับรายการ endpoints ทั้งหมด'
    }
  });
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
      // Authentication
      auth: '/api/auth/login',
      register: '/api/register',
      refresh: '/api/auth/refresh',
      logout: '/api/auth/logout',
      
      // User endpoints
      profile: '/api/users/profile',
      wallet: '/api/users/wallet',
      purchases: '/api/users/purchases',
      winnings: '/api/users/winnings',
      
      // Ticket endpoints
      tickets: '/api/tickets',
      myTickets: '/api/tickets/my-tickets',
      purchase: '/api/tickets/purchase',
      
      // Prize endpoints
      prizes: '/api/prizes',
      claimPrize: '/api/prizes/claim',
      checkWinner: '/api/prizes/check/:ticketNumber',
      
      // Admin endpoints
      adminStats: '/api/admin/stats',
      adminOverview: '/api/admin/overview',
      adminUsers: '/api/admin/users',
      adminTickets: '/api/admin/tickets',
      adminPurchases: '/api/admin/purchases',
      adminActivity: '/api/admin/activity',
      adminUserDetails: '/api/admin/users/:userId/details',
      
      // Draw management
      draws: '/api/admin/draws',
      latestDraw: '/api/admin/draws/latest',
      createDraw: '/api/admin/draws (POST)',
      
      // System management
      reset: '/api/admin/reset',
      resetTickets: '/api/admin/reset-tickets'
    }
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Database initialization functions
async function initializeDatabase() {
  try {
    const connection = await getConnection();
    try {
      // Check if Prize table exists
      const [prizeTables] = await connection.execute(
        "SHOW TABLES LIKE 'Prize'"
      );
      
      if (prizeTables.length === 0) {
        await connection.execute(`
          CREATE TABLE Prize (
            prize_id INT AUTO_INCREMENT PRIMARY KEY,
            amount DECIMAL(10,2) NOT NULL,
            \`rank\` INT NOT NULL,
            UNIQUE KEY unique_rank (\`rank\`)
          )
        `);
      }
    
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
          const placeholders = batch.map(() => '(?, ?, ?)').join(',');
          const values = [];
          for (const num of batch) {
            values.push(num, price, adminUserId);
          }
          await connection.execute(`INSERT INTO Ticket (number, price, created_by) VALUES ${placeholders}`, values);
          inserted += batch.length;
        }
        console.log(`✅ Initialized ${inserted} lottery tickets`);
      }
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('❌ Error initializing lottery tickets:', error);
  }
}

// Start server with REST API only
app.listen(PORT, async () => {
  console.log(`🚀 Lotto REST API Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  try {
    console.log('🔄 Initializing database connection...');
    
    // Validate and fix database schema first
    await validateAndFixDatabase();
    console.log('✅ Database schema validated');
    
    // Initialize database and create required tables
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    // Initialize lottery tickets if needed
    await initializeLotteryTickets();
    console.log('✅ Lottery tickets initialized');
    
    console.log('🎉 Server initialization completed successfully!');
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    console.error('⚠️  Server will continue running but some features may not work');
  }
});