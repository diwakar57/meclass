#!/usr/bin/env node

/**
 * LearnAI Multi-Role Login & Dashboard Testing with Selenium
 * Tests all user roles and captures dashboard information
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

// Demo user credentials
const DEMO_USERS = {
  'SAAS Admin': {
    email: 'saasadmin@learnai.study',
    password: 'Demo@12345',
    dashboardPath: '/admin',
  },
  'Principal': {
    email: 'principal@demo.learnai.study',
    password: 'Demo@12345',
    dashboardPath: '/dashboard/principal',
  },
  'Teacher': {
    email: 'teacher@demo.learnai.study',
    password: 'Demo@12345',
    dashboardPath: '/dashboard/teacher',
  },
  'Student': {
    email: 'student@demo.learnai.study',
    password: 'Demo@12345',
    dashboardPath: '/dashboard/student',
  },
  'Parent': {
    email: 'parent@demo.learnai.study',
    password: 'Demo@12345',
    dashboardPath: '/dashboard/parent',
  },
  'Supervisor': {
    email: 'supervisor@demo.learnai.study',
    password: 'Demo@12345',
    dashboardPath: '/dashboard/supervisor',
  },
};

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'dashboard-screenshots');

// Create screenshot directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function takeScreenshot(driver, filename) {
  try {
    const screenshot = await driver.takeScreenshot();
    const filePath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(filePath, screenshot, 'base64');
    return filePath;
  } catch (err) {
    console.error(`⚠️  Failed to take screenshot: ${err.message}`);
    return null;
  }
}

async function testLoginAndDashboard(driver, role, credentials) {
  try {
    console.log(`\n🔐 Testing ${role} Login...`);
    console.log(`   Email: ${credentials.email}`);

    // Navigate to login page
    await driver.get(`${BASE_URL}/auth/login`);
    await driver.wait(until.elementLocated(By.css('input[type="email"]')), 10000);
    console.log('   ✓ Login page loaded');

    // Take screenshot of login page
    await takeScreenshot(driver, `1-${role}-login-page.png`);

    // Fill in email
    const emailInput = await driver.findElement(By.css('input[type="email"]'));
    await emailInput.clear();
    await emailInput.sendKeys(credentials.email);
    console.log('   ✓ Email entered');

    // Fill in password
    const passwordInput = await driver.findElement(By.css('input[type="password"]'));
    await passwordInput.clear();
    await passwordInput.sendKeys(credentials.password);
    console.log('   ✓ Password entered');

    // Take screenshot before login
    await takeScreenshot(driver, `2-${role}-filled-login.png`);

    // Submit login form
    const loginButton = await driver.findElement(
      By.xpath('//button[contains(text(), "Sign in") or contains(text(), "Login")]')
    );
    await loginButton.click();
    console.log('   ✓ Login submitted');

    // Wait for dashboard to load or error
    try {
      // Wait for navigation away from login page
      await driver.wait(
        async () => {
          const currentUrl = await driver.getCurrentUrl();
          return !currentUrl.includes('/auth/login');
        },
        15000
      );
      console.log('   ✓ Redirected from login page');

      // Wait a bit more for dashboard to fully load
      await driver.sleep(2000);

      // Take screenshot of dashboard
      const screenshotPath = await takeScreenshot(
        driver,
        `3-${role}-dashboard.png`
      );

      // Get current URL and page title
      const currentUrl = await driver.getCurrentUrl();
      const pageTitle = await driver.getTitle();

      // Try to get dashboard content
      let dashboardContent = 'Dashboard content captured';
      try {
        const pageSource = await driver.getPageSource();
        const headingsMatch = pageSource.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/g);
        if (headingsMatch) {
          dashboardContent = headingsMatch
            .slice(0, 5)
            .map((h) => h.replace(/<[^>]+>/g, ''))
            .join(' | ');
        }
      } catch (e) {
        // Ignore
      }

      console.log(`   ✓ Login successful!`);
      console.log(`   📍 Current URL: ${currentUrl}`);
      console.log(`   📄 Page Title: ${pageTitle}`);
      console.log(`   📸 Screenshot: ${path.basename(screenshotPath)}`);

      return {
        role,
        status: '✅ SUCCESS',
        url: currentUrl,
        title: pageTitle,
        screenshot: screenshotPath,
      };
    } catch (navError) {
      console.log('   ⚠️  Navigation timeout, checking for error message...');

      try {
        const errorMsg = await driver.findElement(By.css('[role="alert"], .error, .alert'));
        const errorText = await errorMsg.getText();
        console.log(`   ❌ Login failed: ${errorText}`);

        await takeScreenshot(driver, `${role}-login-error.png`);

        return {
          role,
          status: '❌ LOGIN FAILED',
          error: errorText,
        };
      } catch (e) {
        console.log(`   ❌ Unknown error during login`);
        return {
          role,
          status: '❌ ERROR',
          error: 'Login process failed, no error message found',
        };
      }
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
  let driver;
  const results = [];

  try {
    console.log('🚀 LearnAI Multi-Role Login & Dashboard Testing');
    console.log('='.repeat(60));
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log(`📸 Screenshots: ${SCREENSHOT_DIR}`);
    console.log('='.repeat(60));

    // Create Chrome driver with options
    const options = new chrome.Options();
    options.addArguments('--start-maximized');
    options.addArguments('--disable-notifications');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Test each role
    for (const [role, credentials] of Object.entries(DEMO_USERS)) {
      const result = await testLoginAndDashboard(driver, role, credentials);
      results.push(result);

      // Clear cookies and localStorage between tests
      await driver.executeScript('window.localStorage.clear();');
      await driver.executeScript('window.sessionStorage.clear();');
      await driver.manage().deleteAllCookies();
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const successCount = results.filter((r) => r.status === '✅ SUCCESS').length;
    const failureCount = results.filter((r) => r.status.includes('❌')).length;

    for (const result of results) {
      console.log(`\n${result.status} ${result.role}`);
      if (result.url) {
        console.log(`   📍 URL: ${result.url}`);
      }
      if (result.error) {
        console.log(`   ⚠️  Error: ${result.error}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Passed: ${successCount}/${results.length}`);
    console.log(`❌ Failed: ${failureCount}/${results.length}`);
    console.log('='.repeat(60));

    // Save results to JSON
    const resultsFile = path.join(SCREENSHOT_DIR, 'test-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Results saved to: ${resultsFile}`);

    // List all screenshots
    console.log('\n📸 Screenshots captured:');
    const files = fs.readdirSync(SCREENSHOT_DIR);
    files
      .filter((f) => f.endsWith('.png'))
      .forEach((f) => {
        console.log(`   • ${f}`);
      });

  } catch (err) {
    console.error(`\n❌ Test suite error: ${err.message}`);
    console.error(err.stack);
  } finally {
    if (driver) {
      await driver.quit();
      console.log('\n✔️  Browser closed');
    }
  }
}

// Run the tests
console.log('\n⏳ Starting tests in 3 seconds...');
setTimeout(runAllTests, 3000);
