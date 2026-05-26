#!/usr/bin/env node

/**
 * LearnAI Multi-Role API Login Testing
 * Tests authentication for all user roles via REST API
 */

const http = require('http');

// Demo user credentials
const DEMO_USERS = {
  'SAAS Admin': {
    email: 'saasadmin@learnai.study',
    password: 'Demo@12345',
    expectedRole: 'saas_admin',
  },
  'Principal (School Admin)': {
    email: 'principal@demo.learnai.study',
    password: 'Demo@12345',
    expectedRole: 'principal',
  },
  'Teacher': {
    email: 'teacher@demo.learnai.study',
    password: 'Demo@12345',
    expectedRole: 'teacher',
  },
  'Student': {
    email: 'student@demo.learnai.study',
    password: 'Demo@12345',
    expectedRole: 'student',
  },
  'Parent': {
    email: 'parent@demo.learnai.study',
    password: 'Demo@12345',
    expectedRole: 'parent',
  },
  'Supervisor': {
    email: 'supervisor@demo.learnai.study',
    password: 'Demo@12345',
    expectedRole: 'supervisor',
  },
};

const BASE_URL = 'http://localhost:3000';

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

async function testRoleLogin(role, credentials) {
  try {
    console.log(`\n🔐 Testing ${role} Login...`);
    console.log(`   Email: ${credentials.email}`);
    console.log(`   Password: ${credentials.password}`);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LearnAI-Test-Suite/1.0',
      },
    };

    const loginData = {
      email: credentials.email,
      password: credentials.password,
    };

    const result = await makeRequest(options, loginData);

    if (result.status === 200 || result.status === 201) {
      try {
        const responseJson = JSON.parse(result.body);

        if (responseJson.user && responseJson.token) {
          const actualRole = responseJson.user.role;
          const roleMatch = actualRole === credentials.expectedRole;

          console.log(`   ✅ Login successful!`);
          console.log(`   🔑 Token: ${responseJson.token.substring(0, 50)}...`);
          console.log(`   👤 User: ${responseJson.user.firstName} ${responseJson.user.lastName}`);
          console.log(`   🏫 School: ${responseJson.user.schoolId || 'Global (SAAS)'}`);
          console.log(
            `   🎯 Role: ${actualRole} ${
              roleMatch ? '✅ (Correct)' : `❌ (Expected: ${credentials.expectedRole})`
            }`
          );
          console.log(`   ⏰ Expires in: ${responseJson.expiresIn} seconds`);

          return {
            role,
            status: '✅ SUCCESS',
            userEmail: responseJson.user.email,
            userRole: actualRole,
            token: responseJson.token.substring(0, 50) + '...',
            firstName: responseJson.user.firstName,
            lastName: responseJson.user.lastName,
            schoolId: responseJson.user.schoolId,
            roleMatch,
          };
        } else {
          console.log(`   ❌ Invalid response structure`);
          return {
            role,
            status: '❌ INVALID RESPONSE',
            error: 'Token or user data missing',
          };
        }
      } catch (e) {
        console.log(`   ❌ JSON parse error: ${e.message}`);
        return {
          role,
          status: '❌ PARSE ERROR',
          error: e.message,
        };
      }
    } else {
      const errorMsg = result.body;
      console.log(`   ❌ Login failed (HTTP ${result.status})`);
      console.log(`   Error: ${errorMsg}`);

      return {
        role,
        status: `❌ HTTP ${result.status}`,
        error: errorMsg,
      };
    }
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    return {
      role,
      status: '❌ ERROR',
      error: err.message,
    };
  }
}

async function runAllTests() {
  const results = [];

  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 LearnAI Multi-Role Authentication Test Suite');
    console.log('='.repeat(70));
    console.log(`🌐 API Base URL: ${BASE_URL}`);
    console.log(`🔑 Testing Authentication Endpoint: /api/auth/login`);
    console.log('='.repeat(70));

    // Wait for server to be ready
    console.log('\n⏳ Checking if server is ready...');
    try {
      const healthCheck = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/',
        method: 'GET',
      });

      if (healthCheck.status === 200 || healthCheck.status === 404) {
        console.log('✅ Server is ready\n');
      }
    } catch (e) {
      console.log(`⚠️ Could not reach server, proceeding anyway...\n`);
    }

    // Test each role
    for (const [role, credentials] of Object.entries(DEMO_USERS)) {
      const result = await testRoleLogin(role, credentials);
      results.push(result);

      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(70) + '\n');

    const successCount = results.filter((r) => r.status === '✅ SUCCESS')
      .length;
    const failureCount = results.filter(
      (r) => r.status.includes('❌')
    ).length;
    const roleMatchCount = results.filter((r) => r.roleMatch).length;

    // Create a table
    console.log(
      'Role                     │ Status      │ Email                        │ User Role'
    );
    console.log(
      '─────────────────────────┼─────────────┼──────────────────────────────┼────────────────'
    );

    for (const result of results) {
      const roleCol = result.role.padEnd(24, ' ');
      const statusCol = result.status.padEnd(11, ' ');
      const emailCol = (result.userEmail || '').padEnd(28, ' ');
      const userRoleCol = result.userRole || 'N/A';

      console.log(
        `${roleCol} │ ${statusCol} │ ${emailCol} │ ${userRoleCol}`
      );
    }

    console.log(
      '─────────────────────────┴─────────────┴──────────────────────────────┴────────────────\n'
    );

    console.log(`📊 Summary:`);
    console.log(`   ✅ Successful Logins:  ${successCount}/${results.length}`);
    console.log(`   ❌ Failed Logins:      ${failureCount}/${results.length}`);
    console.log(`   🎯 Correct Roles:      ${roleMatchCount}/${successCount}`);

    if (successCount === results.length && roleMatchCount === successCount) {
      console.log(`\n🎉 ALL TESTS PASSED! Authentication system is fully functional.`);
    } else if (successCount === results.length) {
      console.log(`\n⚠️  All logins succeeded, but ${
        successCount - roleMatchCount
      } role(s) were unexpected.`);
    } else {
      console.log(
        `\n❌ ${failureCount} login(s) failed. Check credentials and server status.`
      );
    }

    console.log('='.repeat(70));

    // Detailed result summary
    console.log('\n📋 Detailed Results:');
    results.forEach((result, i) => {
      const statusEmoji = result.status.includes('✅') ? '✅' : '❌';
      console.log(`\n${statusEmoji} ${i + 1}. ${result.role}`);

      if (result.userEmail) {
        console.log(`    Email: ${result.userEmail}`);
        console.log(
          `    Name: ${result.firstName} ${result.lastName}`
        );
        console.log(`    Role: ${result.userRole}`);
        if (result.schoolId) {
          console.log(`    School: ${result.schoolId}`);
        } else {
          console.log(`    School: Platform Administrator (Global)`);
        }
        console.log(`    Token: ${result.token}`);
      } else if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log('✔️  Testing completed!\n');

  } catch (err) {
    console.error(`\n❌ Test suite error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run the tests
console.log('⏳ Starting authentication tests...');
runAllTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
