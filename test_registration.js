const axios = require('axios');

async function testRegistration() {
  console.log('📝 Testing Member Registration API\n');
  
  try {
    // ทดสอบสมัครสมาชิกใหม่
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@gmail.com`,
      password: 'test123',
      phone: '0987654321',
      wallet: 1000
    };
    
    console.log('🔄 Testing member registration...');
    console.log('📊 Test data:', {
      username: testUser.username,
      email: testUser.email,
      phone: testUser.phone,
      wallet: testUser.wallet
    });
    
    const registerResponse = await axios.post('http://localhost:3000/api/register', testUser, {
      timeout: 10000
    });
    
    console.log('✅ Registration successful!');
    console.log('📊 Response:');
    console.log('   Status:', registerResponse.status);
    console.log('   Full Response:', JSON.stringify(registerResponse.data, null, 2));
    
    // ทดสอบ login ด้วย user ที่สมัครใหม่
    console.log('\n🔄 Testing login with new user...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: testUser.username,
      password: testUser.password
    }, { timeout: 10000 });
    
    console.log('✅ Login successful!');
    console.log('📊 Login Response:');
    console.log('   Status:', loginResponse.status);
    console.log('   User:', loginResponse.data.data.user.username);
    console.log('   Role:', loginResponse.data.data.user.role);
    console.log('   Wallet:', loginResponse.data.data.user.wallet);
    console.log('   Token:', loginResponse.data.data.tokens.accessToken.substring(0, 30) + '...');
    
    return true;
    
  } catch (error) {
    console.log('❌ Test failed:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('   Error:', error.message);
    }
    return false;
  }
}

async function testDuplicateRegistration() {
  console.log('\n📝 Testing Duplicate Registration...\n');
  
  try {
    // ทดสอบสมัครด้วย username ที่มีอยู่แล้ว
    const duplicateUser = {
      username: 'admin', // username ที่มีอยู่แล้ว
      email: 'duplicate@gmail.com',
      password: 'test123',
      phone: '0111111111',
      wallet: 1000
    };
    
    console.log('🔄 Testing duplicate username registration...');
    const response = await axios.post('http://localhost:3000/api/register', duplicateUser, {
      timeout: 10000
    });
    
    console.log('❌ Unexpected success - should have failed');
    return false;
    
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Correctly rejected duplicate registration');
      console.log('📊 Error Response:', JSON.stringify(error.response.data, null, 2));
      return true;
    } else {
      console.log('❌ Unexpected error:', error.message);
      return false;
    }
  }
}

async function main() {
  console.log('🚀 Member Registration Test Suite\n');
  
  // Test 1: Normal registration
  const test1 = await testRegistration();
  
  // Test 2: Duplicate registration
  const test2 = await testDuplicateRegistration();
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 Test Results Summary:');
  console.log('   New Member Registration:', test1 ? '✅ PASS' : '❌ FAIL');
  console.log('   Duplicate Prevention:', test2 ? '✅ PASS' : '❌ FAIL');
  
  if (test1 && test2) {
    console.log('\n🎉 All registration tests passed!');
    console.log('✅ Flutter app registration should work perfectly');
  } else {
    console.log('\n❌ Some registration tests failed');
  }
}

if (require.main === module) {
  main().catch(console.error);
}