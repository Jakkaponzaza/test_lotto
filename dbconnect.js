const mysql = require('mysql2/promise');
const { Pool } = require('pg'); // For PostgreSQL support
const configLoader = require('./config-loader');
const { databaseErrorHandler } = require('./utils/databaseErrorHandler');

// Load environment variables
if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: '.env.production' });
}

// Load configuration
const config = configLoader.loadConfig();
// Create database config with proper SSL handling
const dbConfig = {
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  port: config.database.port,
  charset: 'utf8mb4',
  timezone: '+00:00',
  connectTimeout: 60000
};

// Add SSL configuration for external database
if (process.env.DB_SSL === 'true') {
  dbConfig.ssl = {
    rejectUnauthorized: false,
    ca: undefined,
    key: undefined,
    cert: undefined
  };
}



// Helper function to get database connection with retry logic
async function getConnection() {
  return databaseErrorHandler.executeWithRetry(async () => {
    console.log('🔌 Environment variables check:', {
      NODE_ENV: process.env.NODE_ENV,
      DB_HOST: process.env.DB_HOST,
      DB_USER: process.env.DB_USER,
      DATABASE_URL: !!process.env.DATABASE_URL
    });

    console.log('🔌 Attempting database connection to:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      ssl: !!dbConfig.ssl
    });

    // Check if using Render PostgreSQL (DATABASE_URL exists)
    if (process.env.DATABASE_URL) {
      console.log('🐘 Using PostgreSQL (Render)');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      const client = await pool.connect();
      await client.query('SELECT 1');
      console.log('✅ PostgreSQL connection successful');
      return client;
    } else {
      console.log('🐬 Using MySQL (External)');
      const connection = await mysql.createConnection(dbConfig);
      await connection.execute('SELECT 1');
      console.log('✅ MySQL connection successful');
      return connection;
    }
  }, 'getConnection');
}

// Helper function to validate and fix database schema with error handling
async function validateAndFixDatabase() {
  return databaseErrorHandler.executeQuery(async (connection) => {
    // Check Ticket table status column
    const [columns] = await connection.execute("SHOW COLUMNS FROM Ticket WHERE Field = 'status'");

    if (columns.length === 0) {
      throw new Error('Database schema incomplete');
    }

    const statusColumn = columns[0];
    const enumValues = statusColumn.Type;

    if (!enumValues.includes('claimed')) {
      await connection.execute(
        "ALTER TABLE Ticket MODIFY COLUMN status ENUM('available', 'sold', 'claimed') DEFAULT 'available'"
      );
    }

    return { success: true, message: 'Database schema validated successfully' };
  }, getConnection, 'validateAndFixDatabase');
}

module.exports = {
  getConnection,
  validateAndFixDatabase,
  dbConfig
};