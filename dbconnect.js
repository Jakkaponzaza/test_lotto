const mysql = require('mysql2/promise');
const configLoader = require('./config-loader');

// Load configuration
const config = configLoader.loadConfig();
const dbConfig = {
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  port: config.database.port,
  charset: 'utf8mb4',
  timezone: '+00:00'
};

console.log('=== DATABASE CONNECTION CONFIG ===');
console.log('Host:', dbConfig.host);
console.log('User:', dbConfig.user);
console.log('Database:', dbConfig.database);
console.log('Port:', dbConfig.port);

// Helper function to get database connection
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

// Helper function to validate and fix database schema
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

module.exports = {
  getConnection,
  validateAndFixDatabase,
  dbConfig
};