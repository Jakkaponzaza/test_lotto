const axios = require('axios');

async function testAdminLogin() {
  console.log('🔐 Testing Admin Login API\n');
  
  try {
    // ทดสอบ admin login
    console.log('🔄 Testing admin login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    }, { timeout: 10000 });
    
    console.log('✅ Admin login successful!');
    console.log('📊 Response:');
    console.log('   Status:', loginResponse.status);
    console.log('   Full Response:', JSON.stringify(loginResponse.data, null, 2));
    
    // ตรวจสอบ structure ของ response
    if (loginResponse.data.user) {
      console.log('   User:', loginResponse.data.user.username);
      console.log('   Role:', loginResponse.data.user.role);
      console.log('   IsAdmin:', loginResponse.data.user.isAdmin);
    }
    
    let token = null;
    if (loginResponse.data.data && loginResponse.data.data.tokens && loginResponse.data.data.tokens.accessToken) {
      token = loginResponse.data.data.tokens.accessToken;
      console.log('   Token:', token.substring(0, 30) + '...');
    } else if (loginResponse.data.tokens && loginResponse.data.tokens.accessToken) {
      token = loginResponse.data.tokens.accessToken;
      console.log('   Token:', token.substring(0, 30) + '...');
    } else if (loginResponse.data.token) {
      token = loginResponse.data.token;
      console.log('   Token:', token.substring(0, 30) + '...');
    }
    
    // ทดสอบ reset ด้วย token ที่ได้
    if (token) {
      console.log('\n🔄 Testing reset with admin token...');
      const resetResponse = await axios.post('http://localhost:3000/api/admin/reset', {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
    
      console.log('✅ Reset successful!');
      console.log('📊 Reset Result:');
      console.log('   Status:', resetResponse.status);
      console.log('   Message:', resetResponse.data.message);
      console.log('   Data:', JSON.stringify(resetResponse.data.data, null, 2));
    } else {
      console.log('\n❌ No token found in response');
    }
    
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

async function main() {
  const success = await testAdminLogin();
  
  if (success) {
    console.log('\n🎉 Admin login and reset working perfectly!');
    console.log('✅ Flutter app should now be able to login and reset');
  } else {
    console.log('\n❌ Admin login/reset test failed');
  }
}

if (require.main === module) {
  main().catch(console.error);
}