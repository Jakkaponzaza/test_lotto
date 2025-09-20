const io = require('socket.io-client');

// Test script to debug prize claiming issue
console.log('🧪 Starting prize claim test...');

const socket = io('http://localhost:3000', {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ Connected to server');
  
  // Login first
  console.log('🔐 Attempting login...');
  socket.emit('auth:login', {
    username: 'member',  // Adjust this to your test user
    password: 'password123'  // Adjust this to your test password
  });
});

socket.on('auth:success', (data) => {
  console.log('✅ Login successful');
  console.log('👤 User data:', data.user);
  
  // Get latest draw to see available winners
  console.log('📊 Getting latest draw...');
  socket.emit('draw:get-latest');
});

socket.on('draw:latest-result', (data) => {
  console.log('📊 Draw result received:', data);
  
  if (data.drawResult && data.drawResult.winners) {
    console.log('🏆 Available winners:');
    Object.entries(data.drawResult.winners).forEach(([prize, tickets]) => {
      console.log(`  ${prize}: ${tickets.join(', ')}`);
    });
    
    // Try to claim the first winning ticket (for testing)
    const firstWinner = Object.values(data.drawResult.winners).find(tickets => tickets.length > 0);
    if (firstWinner && firstWinner.length > 0) {
      const testTicket = firstWinner[0];
      console.log(`💰 Testing claim for ticket: ${testTicket}`);
      
      socket.emit('claim:prize', {
        userId: '68',  // Adjust this to your test user ID
        ticketNumber: testTicket
      });
    } else {
      console.log('❌ No winning tickets found to test');
      socket.disconnect();
    }
  } else {
    console.log('❌ No draw result available');
    socket.disconnect();
  }
});

socket.on('claim:success', (data) => {
  console.log('🎉 CLAIM SUCCESS:', data);
  socket.disconnect();
});

socket.on('claim:error', (data) => {
  console.log('❌ CLAIM ERROR:', data);
  console.log('Error details:', {
    message: data.error,
    details: data.details,
    errorType: data.errorType,
    stack: data.stack
  });
  socket.disconnect();
});

socket.on('auth:error', (data) => {
  console.log('❌ Auth error:', data);
  socket.disconnect();
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from server');
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection error:', error);
  process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout');
  socket.disconnect();
  process.exit(1);
}, 30000);