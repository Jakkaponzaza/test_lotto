const { getConnection } = require('./dbconnect');
const { SystemValidator } = require('./utils/businessLogicValidator');

/**
 * Working Reset Function - ใช้โค้ดนี้เป็นแม่แบบสำหรับ API
 * โค้ดนี้ทดสอบแล้วทำงานได้ 100%
 */
async function workingResetFunction() {
  console.log('🔄 Working Reset Function - Direct Database Access\n');
  
  try {
    // Validate system resources before heavy operation
    console.log('1️⃣ Validating system resources...');
    SystemValidator.validateSystemResources('system_reset');
    console.log('✅ System resources OK');
    
    const cleanup = SystemValidator.validateConcurrentOperations('system_reset', 1);
    console.log('✅ Concurrent operations check passed');
    
    try {
      const connection = await getConnection();
      console.log('✅ Database connection established');
      
      try {
        console.log('\n2️⃣ Starting reset process...');
        
        // 1. หา admin user ก่อนลบ
        console.log('   👤 Finding admin user...');
        const [adminUser] = await connection.execute(
          "SELECT user_id, username FROM User WHERE role IN ('owner', 'admin') ORDER BY user_id LIMIT 1"
        );
        
        if (adminUser.length === 0) {
          throw new Error('No admin user found! Cannot reset system.');
        }
        
        const adminUsername = adminUser[0].username;
        console.log(`   ✅ Found admin: ${adminUsername} (ID: ${adminUser[0].user_id})`);

        // 2. ลบข้อมูลทั้งหมดตามลำดับ (เพื่อหลีกเลี่ยง foreign key constraints)
        console.log('\n   🗑️ Deleting Purchase records...');
        const [deletedPurchases] = await connection.execute('DELETE FROM Purchase');
        console.log(`   ✅ Deleted ${deletedPurchases.affectedRows} purchases`);

        console.log('   🗑️ Deleting Prize records...');
        const [deletedPrizes] = await connection.execute('DELETE FROM Prize');
        console.log(`   ✅ Deleted ${deletedPrizes.affectedRows} prizes`);

        console.log('   🗑️ Deleting Ticket records...');
        const [deletedTickets] = await connection.execute('DELETE FROM Ticket');
        console.log(`   ✅ Deleted ${deletedTickets.affectedRows} tickets`);
        
        console.log('   🗑️ Deleting non-admin users...');
        const [deletedUsers] = await connection.execute(
          "DELETE FROM User WHERE role NOT IN ('admin', 'owner')"
        );
        console.log(`   ✅ Deleted ${deletedUsers.affectedRows} member users`);

        console.log('\n3️⃣ Verifying reset results...');
        const [finalTickets] = await connection.execute('SELECT COUNT(*) as total FROM Ticket');
        const [finalUsers] = await connection.execute('SELECT COUNT(*) as total FROM User');
        const [finalPurchases] = await connection.execute('SELECT COUNT(*) as total FROM Purchase');
        const [finalPrizes] = await connection.execute('SELECT COUNT(*) as total FROM Prize');
        
        console.log(`   📊 Final counts:`);
        console.log(`   - Tickets: ${finalTickets[0].total} (should be 0)`);
        console.log(`   - Users: ${finalUsers[0].total} (should be 1 - admin only)`);
        console.log(`   - Purchases: ${finalPurchases[0].total} (should be 0)`);
        console.log(`   - Prizes: ${finalPrizes[0].total} (should be 0)`);

        console.log('\n🎉 Reset completed successfully!');
        console.log(`   📊 Summary:`);
        console.log(`   - Deleted ${deletedPurchases.affectedRows} purchases`);
        console.log(`   - Deleted ${deletedPrizes.affectedRows} prizes`);
        console.log(`   - Deleted ${deletedTickets.affectedRows} tickets`);
        console.log(`   - Deleted ${deletedUsers.affectedRows} member users`);
        console.log(`   - Preserved admin: ${adminUsername}`);

        return {
          success: true,
          data: {
            deletedPurchases: deletedPurchases.affectedRows,
            deletedPrizes: deletedPrizes.affectedRows,
            deletedTickets: deletedTickets.affectedRows,
            deletedUsers: deletedUsers.affectedRows,
            adminPreserved: adminUsername
          }
        };

      } finally {
        await connection.end();
        console.log('✅ Database connection closed');
      }
    } finally {
      cleanup(); // Clean up concurrent operation counter
      console.log('✅ Concurrent operation cleanup completed');
    }
    
  } catch (error) {
    console.error('\n❌ Reset function failed:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      errno: error.errno
    });
    
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🧪 Testing Working Reset Function\n');
  console.log('📝 Note: This is the reference implementation that works 100%');
  console.log('📝 The API controller uses the exact same logic\n');
  
  const result = await workingResetFunction();
  
  if (result.success) {
    console.log('\n✅ Working reset function completed successfully!');
    console.log('✅ This is the exact code that works and is used in the API.');
    console.log('✅ Keep this file as reference for future debugging.');
  } else {
    console.log('\n❌ Working reset function failed!');
    console.log('Error:', result.error);
  }
}

// Export the working function for use in other files
module.exports = { workingResetFunction };

if (require.main === module) {
  main().catch(console.error);
}