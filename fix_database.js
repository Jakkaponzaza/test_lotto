const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection config
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  charset: 'utf8mb4',
  timezone: '+00:00'
};

async function fixDatabase() {
  console.log('🔧 Fixing database schema...');
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
      // Check current Ticket table structure
      console.log('🔍 Checking current Ticket table structure...');
      const [columns] = await connection.execute("SHOW COLUMNS FROM Ticket WHERE Field = 'status'");
      
      if (columns.length === 0) {
        console.log('❌ Status column not found in Ticket table');
        return;
      }
      
      const statusColumn = columns[0];
      console.log('📋 Current status column definition:', statusColumn);
      
      // Check if ENUM includes 'claimed'
      const enumValues = statusColumn.Type;
      console.log('📝 Current ENUM values:', enumValues);
      
      if (!enumValues.includes('claimed')) {
        console.log('🔧 Adding "claimed" to status ENUM...');
        await connection.execute(
          "ALTER TABLE Ticket MODIFY COLUMN status ENUM('available', 'sold', 'claimed') DEFAULT 'available'"
        );
        console.log('✅ Status ENUM updated successfully');
      } else {
        console.log('✅ Status ENUM already includes "claimed"');
      }
      
      // Verify the fix
      const [updatedColumns] = await connection.execute("SHOW COLUMNS FROM Ticket WHERE Field = 'status'");
      console.log('🎯 Updated status column:', updatedColumns[0]);
      
      // Test updating a ticket to claimed status
      console.log('🧪 Testing claimed status update...');
      const [testTickets] = await connection.execute('SELECT ticket_id FROM Ticket LIMIT 1');
      
      if (testTickets.length > 0) {
        const testTicketId = testTickets[0].ticket_id;
        
        // Test update
        await connection.execute(
          'UPDATE Ticket SET status = ? WHERE ticket_id = ?',
          ['claimed', testTicketId]
        );
        
        // Verify
        const [verifyResult] = await connection.execute(
          'SELECT status FROM Ticket WHERE ticket_id = ?',
          [testTicketId]
        );
        
        console.log('🎯 Test result - ticket status:', verifyResult[0].status);
        
        // Reset back to available
        await connection.execute(
          'UPDATE Ticket SET status = ? WHERE ticket_id = ?',
          ['available', testTicketId]
        );
        
        console.log('✅ Database test completed successfully');
      }
      
    } finally {
      await connection.end();
    }
    
  } catch (error) {
    console.error('❌ Error fixing database:', error);
  }
}

// Run the fix
fixDatabase();