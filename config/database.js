const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  charset: 'utf8mb4',
  timezone: '+00:00'
};

/**
 * Create a new database connection
 * @returns {Promise<Connection>} Database connection
 */
async function getConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Database connection established');
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

/**
 * Validate and fix database schema
 */
async function validateAndFixDatabase() {
  try {
    const connection = await getConnection();
    try {
      console.log('🔍 Validating database schema...');
      
      // Check Ticket table status column
      const [columns] = await connection.execute("SHOW COLUMNS FROM Ticket WHERE Field = 'status'");
      
      if (columns.length === 0) {
        console.log('❌ Status column not found in Ticket table');
        throw new Error('Database schema incomplete');
      }
      
      const statusColumn = columns[0];
      const enumValues = statusColumn.Type;
      console.log('📝 Current status ENUM:', enumValues);
      
      if (!enumValues.includes('claimed')) {
        console.log('🔧 Fixing status ENUM to include "claimed"...');
        await connection.execute(
          "ALTER TABLE Ticket MODIFY COLUMN status ENUM('available', 'sold', 'claimed') DEFAULT 'available'"
        );
        console.log('✅ Status ENUM updated successfully');
      } else {
        console.log('✅ Database schema is valid');
      }
      
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('❌ Error validating database:', error);
    throw error;
  }
}

/**
 * Initialize database tables if they don't exist
 */
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
        console.log('✅ Prize table created successfully with ticket reference');
      } else {
        // Check if Prize table has the correct structure
        const [amountColumns] = await connection.execute(
          "SHOW COLUMNS FROM Prize LIKE 'amount'"
        );
        
        if (amountColumns.length === 0) {
          console.log('🔄 Prize table exists but using old structure, recreating with 3 columns...');
          
          // ลบ foreign key constraints ก่อน
          try {
            await connection.execute('ALTER TABLE Ticket DROP FOREIGN KEY Ticket_ibfk_3');
            console.log('✅ Dropped foreign key constraint Ticket_ibfk_3');
          } catch (error) {
            console.log('⚠️ Foreign key Ticket_ibfk_3 may not exist:', error.message);
          }
          
          try {
            await connection.execute('ALTER TABLE Ticket DROP COLUMN prize_id');
            console.log('✅ Dropped prize_id column from Ticket');
          } catch (error) {
            console.log('⚠️ prize_id column may not exist:', error.message);
          }
          
          // ลบตาราง Prize
          await connection.execute('DROP TABLE IF EXISTS Prize');
          console.log('✅ Dropped Prize table');
          
          // สร้างตาราง Prize ใหม่ด้วย 3 columns เท่านั้น
          await connection.execute(`
            CREATE TABLE Prize (
              prize_id INT AUTO_INCREMENT PRIMARY KEY,
              amount DECIMAL(10,2) NOT NULL,
              \`rank\` INT NOT NULL,
              
              INDEX idx_prize_rank (\`rank\`)
            )
          `);
          console.log('✅ Prize table recreated successfully with 3 columns only');
        }
      }
      
      console.log('✅ Database initialization completed');
      
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}

/**
 * Display database configuration info
 */
function logDatabaseInfo() {
  console.log('=== LOTTO WEBSOCKET SERVER ===');
  console.log('Host:', dbConfig.host);
  console.log('User:', dbConfig.user);
  console.log('Database:', dbConfig.database);
  console.log('Port:', dbConfig.port);
}

module.exports = {
  dbConfig,
  getConnection,
  validateAndFixDatabase,
  initializeDatabase,
  logDatabaseInfo
};