#!/usr/bin/env node

const http = require('http');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: responseData,
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testLogin() {
  try {
    console.log('🔐 Testing login endpoint...\n');

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const loginData = {
      email: 'student@demo.learnai.study',
      password: 'Demo@12345',
    };

    console.log('📤 Sending login request:');
    console.log('   Email: student@demo.learnai.study');
    console.log('   Password: Demo@12345\n');

    const result = await makeRequest(options, loginData);

    console.log(`✅ Response Status: ${result.status}`);
    console.log(`📝 Response Headers: Content-Type: ${result.headers['content-type']}`);

    if (result.body) {
      try {
        const jsonBody = JSON.parse(result.body);
        console.log('📦 Response Body:', JSON.stringify(jsonBody, null, 2));

        if (result.status === 200 || result.status === 201) {
          console.log('\n🎉 SUCCESS! Login endpoint is working!');
          if (jsonBody.token) {
            console.log(`✅ Authentication token received`);
          }
          if (jsonBody.user) {
            console.log(`✅ User data received: ${jsonBody.user.email}`);
          }
        } else {
          console.log(`\n⚠️ Response status: ${result.status}`);
        }
      } catch (e) {
        console.log('📝 Response Body (text):', result.body);
      }
    }
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
    process.exit(1);
  }
}

testLogin();
