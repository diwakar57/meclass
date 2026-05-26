#!/usr/bin/env node

/**
 * LearnAI Multi-Role Login & Dashboard Testing with Puppeteer
 * Tests all user roles and captures dashboard information
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Demo user credentials
const DEMO_USERS = {
  'SAAS Admin': {
    email: 'saasadmin@learnai.study',
    password: 'Demo@12345',
  },
  'Principal (School Admin)': {
    email: 'principal@demo.learnai.study',
    password: 'Demo@12345',
  },
  'Teacher': {
    email: 'teacher@demo.learnai.study',
    password: 'Demo@12345',
  },
  'Student': {
    email: 'student@demo.learnai.study',
    password: 'Demo@12345',
  },
  'Parent': {
    email: 'parent@demo.learnai.study',
    password: 'Demo@12345',
  },
  'Supervisor': {
    email: 'supervisor@demo.learnai.study',
    password: 'Demo@12345',
  },
};

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'dashboard-screenshots');

// Create screenshot directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function takeScreenshot(page, filename) {
  try {
    const filePath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  } catch (err) {
    console.error(`⚠️  Failed to take screenshot: ${err.message}`);
    return null;
  }
}

async function testLoginAndDashboard(browser, role, credentials) {
  let page;
  try {
    page = await browser.newPage();
    await page.setDefaultNavigationTimeout(15000);
    await page.setDefaultTimeout(10000);
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`\n🔐 Testing ${role} Login...`);
    console.log(`   Email: ${credentials.email}`);

    // Navigate to login page
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle2' });
    console.log('   ✓ Login page loaded');

    // Take screenshot of login page
    await takeScreenshot(page, `01-${role.replace(/\s+/g, '-')}-login-page.png`);

    // Fill in email
    await page.type('input[type="email"]', credentials.email, { delay: 50 });
    console.log('   ✓ Email entered');

    // Fill in password
    await page.type('input[type="password"]', credentials.password, { delay: 50 });
    console.log('   ✓ Password entered');

    // Take screenshot before login
    await takeScreenshot(
      page,
      `02-${role.replace(/\s+/g, '-')}-filled-login.png`
    );

    // Submit login form
    const loginButton = await page.$('button[type="submit"]');
    if (!loginButton) {
      throw new Error('Login button not found');
    }
    await loginButton.click();
    console.log('   ✓ Login submitted');

    // Wait for navigation away from login page
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 12000 });
    } catch (err) {
      // Navigation might timeout, but page loads
      await page.waitForTimeout(2000);
    }

    const currentUrl = page.url();
    const pageTitle = await page.title();

    // Check for error messages
    const errorElement = await page.$('[role="alert"], .error, .alert-danger');
    if (errorElement) {
      const errorText = await page.evaluate(
        (el) => el.textContent,
        errorElement
      );
      console.log(`   ❌ Login failed: ${errorText}`);
      await takeScreenshot(
        page,
        `error-${role.replace(/\s+/g, '-')}-login.png`
      );

      return {
        role,
        status: '❌ LOGIN FAILED',
        error: errorText,
        url: currentUrl,
      };
    }

    // Wait for dashboard to load
    await page.waitForTimeout(2000);

    // Take screenshot of dashboard
    const screenshotPath = await takeScreenshot(
      page,
      `03-${role.replace(/\s+/g, '-')}-dashboard.png`
    );

    // Get dashboard content
    let dashboardInfo = '';
    try {
      const h1 = await page.$eval('h1', (el) => el.textContent);
      const h2s = await page.$$eval('h2', (els) => els.map((e) => e.textContent));

      dashboardInfo = `${h1}`;
      if (h2s.length > 0) {
        dashboardInfo += ` | ${h2s.slice(0, 3).join(' | ')}`;
      }
    } catch (e) {
      dashboardInfo = 'Dashboard content loaded';
    }

    // Get page layout info
    let layoutInfo = '';
    try {
      const sidebar = await page.$('[role="navigation"], nav, .sidebar');
      const mainContent = await page.$('main, [role="main"], .dashboard');
      const header = await page.$('header, [role="banner"]');

      const features = [];
      if (header) features.push('Header');
      if (sidebar) features.push('Sidebar');
      if (mainContent) features.push('Main Content');

      layoutInfo = features.join(' + ');
    } catch (e) {
      layoutInfo = 'Standard layout';
    }

    console.log(`   ✅ Login successful!`);
    console.log(`   📍 URL: ${currentUrl}`);
    console.log(`   📄 Title: ${pageTitle}`);
    if (dashboardInfo) {
      console.log(`   📊 Content: ${dashboardInfo}`);
    }
    if (layoutInfo) {
      console.log(`   🎨 Layout: ${layoutInfo}`);
    }
    console.log(`   📸 Screenshot: dashboard-screenshots/${path.basename(screenshotPath)}`);

    return {
      role,
      status: '✅ SUCCESS',
      url: currentUrl,
      title: pageTitle,
      content: dashboardInfo,
      layout: layoutInfo,
      screenshot: screenshotPath,
    };

  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    if (page) {
      try {
        await takeScreenshot(
          page,
          `error-${role.replace(/\s+/g, '-')}.png`
        );
      } catch (e) {
        // Ignore screenshot error
      }
    }

    return {
      role,
      status: '❌ ERROR',
      error: err.message,
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

async function runAllTests() {
  let browser;
  const results = [];

  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 LearnAI Multi-Role Login & Dashboard Testing');
    console.log('='.repeat(70));
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log(`📸 Screenshots: ${SCREENSHOT_DIR}`);
    console.log('='.repeat(70));

    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    console.log('\n✓ Browser launched');

    // Test each role
    for (const [role, credentials] of Object.entries(DEMO_USERS)) {
      const result = await testLoginAndDashboard(browser, role, credentials);
      results.push(result);

      // Wait between tests
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));

    const successCount = results.filter((r) => r.status === '✅ SUCCESS')
      .length;
    const failureCount = results.filter(
      (r) => r.status.includes('❌')
    ).length;

    for (const result of results) {
      console.log(`\n${result.status} ${result.role}`);
      if (result.url) {
        console.log(`   📍 URL: ${result.url}`);
      }
      if (result.title) {
        console.log(`   📄 Title: ${result.title}`);
      }
      if (result.content) {
        console.log(`   📊 Dashboard: ${result.content}`);
      }
      if (result.error) {
        console.log(`   ⚠️  Error: ${result.error}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(
      `\n📊 Results: ✅ ${successCount}/${results.length} passed | ❌ ${failureCount}/${results.length} failed\n`
    );

    if (successCount === results.length) {
      console.log('🎉 ALL TESTS PASSED!');
    } else if (failureCount === 0) {
      console.log('✅ System loaded successfully');
    }

    console.log('='.repeat(70));

    // Save results to JSON
    const resultsFile = path.join(SCREENSHOT_DIR, 'test-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed results: ${resultsFile}`);

    // List all screenshots
    console.log('\n📸 Screenshots captured:');
    const files = fs.readdirSync(SCREENSHOT_DIR);
    files
      .filter((f) => f.endsWith('.png'))
      .sort()
      .forEach((f, i) => {
        console.log(`   ${i + 1}. ${f}`);
      });

  } catch (err) {
    console.error(`\n❌ Test suite error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n✔️  Browser closed');
    }
  }
}

// Run the tests
console.log('⏳ Starting browser automation tests...');
runAllTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
