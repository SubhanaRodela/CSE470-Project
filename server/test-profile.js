const axios = require('axios');

async function testProfileUpdate() {
  try {
    console.log('Testing profile update...');
    
    // First, register a test user
    console.log('1. Registering test user...');
    const registerResponse = await axios.post('http://localhost:5000/api/auth/register', {
      name: 'Test User',
      email: 'testprofile@test.com',
      phone: '1234567890',
      password: 'password123',
      userType: 'user'
    });
    
    console.log('Registration successful:', registerResponse.data);
    const token = registerResponse.data.token;
    
    // Now test the profile update
    console.log('2. Testing profile update...');
    const updateResponse = await axios.put('http://localhost:5000/api/auth/update-profile', {
      name: 'Updated Test User',
      email: 'testprofile@test.com',
      phone: '0987654321'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Profile update successful:', updateResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testProfileUpdate(); 