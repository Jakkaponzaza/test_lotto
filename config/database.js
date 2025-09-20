const mysql = require('mysql2/promise');
const { databaseErrorHandler } = require('../utils/databaseErrorHandler');
require('dotenv').config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  charset: 'utf8mb4',
  timezone: '+00:00',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

/**
 * Create a new database connection with retry logic
 * @returns {Promise<Connection>} Database connection
 */
async function getConnection() {
  return databaseErrorHandler.executeWithRetry(async () => {
    const connection = await mysql.createConnection(dbConfig);
    
    // Validate connection
    const isValid = await databaseErrorHandler.validateConnection(connection);
    if (!isValid) {
      await connection.end();
      throw new Error('Connection validation failed');
    }
    
    console.log('Database connection established');
    return connection;
  }, 'getConnection');
}

/**
 * Validate and fix database schema with error handling
 */
async function validateAndFixDatabase() {
  return databaseErrorHandler.executeQuery(async (connection) => {
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
    
    return { success: true, message: 'Database schema validated successfully' };
  }, getConnection, 'validateAndFixDatabase');
}

/**
 * Initialize database tables if they don't exist with error handling
 */
async function initializeDatabase() {
  return databaseErrorHandler.executeTransaction(async (connection) => {
    console.log('🗃️ Checking and creating required tables...');
    
    // Check if Prize table exists
    const [prizeTables] = await connection.execute(
      "SHOW TABLES LIKE 'Prize'"
    );
    
    if (prizeTables.length === 0) {
      await connection.execute(`
        CREATE TABLE Prize (
          prize_id INT AUTO_INCREMENT PRIMARY KEY,
          amont DECIMAL(10,2) NOT NULL,
          \`rank\` INT NOT NULL,
          UNIQUE KEY unique_rank (\`rank\`)
        )
      `);
    } else {
      // Check if Prize table has the correct structure (ตรงกับ database_me)
      const [amontColumns] = await connection.execute(
        "SHOW COLUMNS FROM Prize LIKE 'amont'"
      );
      
      if (amontColumns.length === 0) {
        // ลบตาราง Prize และสร้างใหม่ให้ตรงกับ database_me
        await connection.execute('DROP TABLE IF EXISTS Prize');
        
        await connection.execute(`
          CREATE TABLE Prize (
            prize_id INT AUTO_INCREMENT PRIMARY KEY,
            amont DECIMAL(10,2) NOT NULL,
            \`rank\` INT NOT NULL,
            UNIQUE KEY unique_rank (\`rank\`)
          )
        `);
      }
    }
    
    return { success: true, message: 'Database initialized successfully' };
  }, getConnection, 'initializeDatabase');
}

/**
 * Display database configuration info
 */
function logDatabaseInfo() {
  console.log('=== LOTTO REST API SERVER ===');
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