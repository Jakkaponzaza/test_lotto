const TicketService = require('../services/TicketService');
const UserService = require('../services/UserService');
const { generateLotteryNumbers } = require('../utils/helpers');

/**
 * Initialize lottery tickets if none exist
 */
async function initializeLotteryTickets() {
  try {
    // Check if tickets already exist
    const ticketCount = await TicketService.getTicketCount();
    
    if (ticketCount === 0) {
      console.log('🎫 No lottery tickets found, creating initial 120 tickets...');
      
      // Get admin user ID for created_by
      const adminUser = await UserService.getAdminUser();
      const adminUserId = adminUser ? adminUser.user_id : 1; // fallback to 1
      
      const desiredCount = 120;
      const price = 80.00;
      
      // Generate unique lottery numbers
      const numbers = generateLotteryNumbers(desiredCount);
      
      // Prepare ticket data
      const ticketData = numbers.map(number => ({
        number,
        price,
        adminUserId
      }));
      
      // Create tickets in database
      const inserted = await TicketService.createLotteryTickets(ticketData);
      
      console.log(`✅ Created ${inserted} initial lottery tickets successfully!`);
    } else {
      console.log(`🎫 Found ${ticketCount} existing lottery tickets`);
    }
  } catch (error) {
    console.error('❌ Error initializing lottery tickets:', error);
  }
}

module.exports = { initializeLotteryTickets };