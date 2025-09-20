const axios = require('axios');
const { generateToken } = require('./middleware/auth');

/**
 * Test API Reset Function
 * ทดสอบ API endpoint ที่ใช้โค้ดเดียวกันกับ working_reset_test.js
 */
async function testAPIReset() {
  console.log('🧪 Testing API Reset Endpoint\n');
  console.log('📝 This test uses the same working code as the API controller\n');
  
  try {
    // Test server health first
    console.log('🔍 Testing server health...');
    const healthResponse = await axios.get('http://localhost:3000/health', { timeout: 5000 });
    console.log('✅ Server is running:', healthResponse.data.status);
    
    // Create admin token for testing
    const adminUser = {
      user_id: 5,
      username: 'admin',
      role: 'admin'
    };
    
    const token = generateToken(adminUser);
    console.log('✅ Generated admin token for user:', adminUser.username);
    
    // Test the reset endpoint
    console.log('\n🔄 Calling /api/admin/reset endpoint...');
    console.log('📝 This should show detailed logs in the server console');
    
    const response = await axios.post('http://localhost:3000/api/admin/reset', {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('\n✅ Reset API call successful!');
    console.log('📊 Response Details:');
    console.log('   Status:', response.status);
    console.log('   Success:', response.data.success);
    console.log('   Message:', response.data.message);
    console.log('   Data:', JSON.stringify(response.data.data, null, 2));
    
    return true;
    
  } catch (error) {
    console.log('\n❌ API Reset Test Failed:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   🔌 Cannot connect to server');
      console.error('   💡 Solution: Run "npm start" to start the server');
    } else if (error.response) {
      console.error('   📡 API Error Response:');
      console.error('      Status:', error.response.status);
      console.error('      Status Text:', error.response.statusText);
      console.error('      Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNABORTED') {
      console.error('   ⏰ Request timeout - server took too long to respond');
      console.error('   💡 Check server logs for any errors or slow queries');
    } else {
      console.error('   🔥 Unexpected Error:');
      console.error('      Message:', error.message);
      console.error('      Code:', error.code);
    }
    return false;
  }
}

/**
 * Test Authentication (ทดสอบการ login ก่อน reset)
 */
async function testAuthenticationFlow() {
  console.log('\n🔐 Testing Full Authentication Flow...');
  
  try {
    // Test login first
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'admin123' // ใช้รหัสผ่านจริงของ admin
    }, { timeout: 10000 });
    
    console.log('✅ Login successful');
    const realToken = loginResponse.data.tokens.accessToken;
    
    // Test reset with real token
    console.log('🔄 Testing reset with real authentication token...');
    const resetResponse = await axios.post('http://localhost:3000/api/admin/reset', {}, {
      headers: {
        'Authorization': `Bearer ${realToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Reset with real token successful!');
    console.log('📊 Result:', resetResponse.data.message);
    
    return true;
    
  } catch (error) {
    console.log('❌ Authentication flow failed:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    } else {
      console.log('   Error:', error.message);
    }
    return false;
  }
}

async function main() {
  console.log('🚀 Admin Reset API Test Suite\n');
  
  // Test 1: API with generated token
  const test1 = await testAPIReset();
  
  // Test 2: Full authentication flow (optional)
  console.log('\n' + '='.repeat(50));
  const test2 = await testAuthenticationFlow();
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 Test Results Summary:');
  console.log('   Generated Token Test:', test1 ? '✅ PASS' : '❌ FAIL');
  console.log('   Real Auth Flow Test:', test2 ? '✅ PASS' : '❌ FAIL');
  
  if (test1 || test2) {
    console.log('\n🎉 At least one test passed - API is working!');
    console.log('💡 Check server logs to see detailed reset process');
  } else {
    console.log('\n❌ All tests failed - check server and configuration');
  }
}

if (require.main === module) {
  main().catch(console.error);
}