const mysql = require('mysql2/promise');
const configLoader = require('./config-loader');
const { databaseErrorHandler } = require('./utils/databaseErrorHandler');

// Load configuration
const config = configLoader.loadConfig();
const dbConfig = {
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  port: config.database.port,
  charset: 'utf8mb4',
  timezone: '+00:00',
  connectTimeout: 60000,
  idleTimeout: 300000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};



// Helper function to get database connection with retry logic
async function getConnection() {
  return databaseErrorHandler.executeWithRetry(async () => {
    const connection = await mysql.createConnection(dbConfig);
    
    // Validate connection
    const isValid = await databaseErrorHandler.validateConnection(connection);
    if (!isValid) {
      await connection.end();
      throw new Error('Connection validation failed');
    }
    
    return connection;
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