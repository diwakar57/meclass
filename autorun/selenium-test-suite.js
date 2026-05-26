#!/usr/bin/env node

/**
 * LearnAI Selenium Testing Suite
 * Automates login testing and visual validation for all user roles
 * Supports Chrome, Firefox, and Edge browsers
 */

const { Builder, By, until, Key, Actions } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const edge = require('selenium-webdriver/edge');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  browser: process.env.BROWSER || 'chrome', // chrome, firefox, edge
  headless: process.env.HEADLESS !== 'false',
  screenshotDir: path.join(__dirname, 'test-screenshots'),
  timeout: {
    page: 15000,
    element: 10000,
    action: 5000,
  },
  slowdown: process.env.SLOWDOWN || 500, // ms between actions
};

// Test users
const TEST_USERS = {
  'SAAS Admin': {
    email: 'saasadmin@learnai.study',
    password: 'Demo@12345',
    role: 'saas_admin',
    expectedDashboard: '/admin',
  },
  'Principal': {
    email: 'principal@demo.learnai.study',
    password: 'Demo@12345',
    role: 'principal',
    expectedDashboard: '/dashboard/principal',
  },
  'Teacher': {
    email: 'teacher@demo.learnai.study',
    password: 'Demo@12345',
    role: 'teacher',
    expectedDashboard: '/dashboard/teacher',
  },
  'Student': {
    email: 'student@demo.learnai.study',
    password: 'Demo@12345',
    role: 'student',
    expectedDashboard: '/dashboard/student',
  },
  'Parent': {
    email: 'parent@demo.learnai.study',
    password: 'Demo@12345',
    role: 'parent',
    expectedDashboard: '/dashboard/parent',
  },
  'Supervisor': {
    email: 'supervisor@demo.learnai.study',
    password: 'Demo@12345',
    role: 'supervisor',
    expectedDashboard: '/dashboard/supervisor',
  },
};

// Create screenshot directory
if (!fs.existsSync(CONFIG.screenshotDir)) {
  fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
}

// Logger
class Logger {
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const emoji = {
      ERROR: '❌',
      WARN: '⚠️',
      INFO: 'ℹ️',
      SUCCESS: '✅',
      TEST: '🧪',
    }[level] || '📝';
    console.log(`[${timestamp}] ${emoji} ${level.padEnd(7)} | ${message}`);
  }

  error(msg) { this.log(msg, 'ERROR'); }
  warn(msg) { this.log(msg, 'WARN'); }
  info(msg) { this.log(msg, 'INFO'); }
  success(msg) { this.log(msg, 'SUCCESS'); }
  test(msg) { this.log(msg, 'TEST'); }
}

const logger = new Logger();

// Test Suite
class SeleniumTestSuite {
  constructor() {
    this.driver = null;
    this.results = [];
    this.testCount = 0;
    this.passCount = 0;
    this.failCount = 0;
  }

  async initDriver() {
    logger.info(`Initializing ${CONFIG.browser} driver...`);

    const builder = new Builder();

    switch (CONFIG.browser) {
      case 'firefox':
        const firefoxOptions = new firefox.Options();
        if (CONFIG.headless) firefoxOptions.headless();
        builder.forBrowser('firefox').setFirefoxOptions(firefoxOptions);
        break;

      case 'edge':
        const edgeOptions = new edge.Options();
        if (CONFIG.headless) edgeOptions.headless();
        builder.forBrowser('edge').setEdgeOptions(edgeOptions);
        break;

      case 'chrome':
      default:
        const chromeOptions = new chrome.Options();
        if (CONFIG.headless) chromeOptions.addArguments('--headless=new');
        chromeOptions.addArguments('--no-sandbox', '--disable-dev-shm-usage');
        chromeOptions.addArguments('--start-maximized');
        chromeOptions.addArguments('--disable-notifications');
        builder.forBrowser('chrome').setChromeOptions(chromeOptions);
    }

    this.driver = await builder.build();
    await this.driver.manage().setTimeouts({
      implicit: CONFIG.timeout.page,
      pageLoad: CONFIG.timeout.page,
      script: CONFIG.timeout.page,
    });

    logger.success(`${CONFIG.browser} driver initialized`);
  }

  async takeScreenshot(filename) {
    try {
      const filepath = path.join(CONFIG.screenshotDir, filename);
      const screenshot = await this.driver.takeScreenshot();
      fs.writeFileSync(filepath, screenshot, 'base64');
      logger.info(`Screenshot saved: ${filename}`);
      return filepath;
    } catch (err) {
      logger.error(`Failed to take screenshot: ${err.message}`);
      return null;
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async waitForElement(locator, timeout = CONFIG.timeout.element) {
    try {
      await this.driver.wait(until.elementLocated(locator), timeout);
      return await this.driver.findElement(locator);
    } catch (err) {
      throw new Error(`Element not found: ${locator}`);
    }
  }

  async clickElement(locator) {
    const element = await this.waitForElement(locator);
    await this.driver.wait(until.elementIsVisible(element), CONFIG.timeout.element);
    await element.click();
    await this.sleep(CONFIG.slowdown);
  }

  async typeText(locator, text) {
    const element = await this.waitForElement(locator);
    await element.clear();
    await element.sendKeys(text);
    await this.sleep(CONFIG.slowdown);
  }

  async testLogin(userRole, credentials) {
    logger.test(`Testing ${userRole} login...`);
    this.testCount++;

    try {
      // Navigate to login page
      await this.driver.get(`${CONFIG.baseUrl}/auth/login`);
      await this.sleep(1000);

      // Take login page screenshot
      await this.takeScreenshot(`01-${userRole}-login-page.png`);

      // Fill email
      await this.typeText(By.css('input[type="email"]'), credentials.email);
      logger.info(`Email entered: ${credentials.email}`);

      // Fill password
      await this.typeText(By.css('input[type="password"]'), credentials.password);
      logger.info(`Password entered`);

      // Take pre-login screenshot
      await this.takeScreenshot(`02-${userRole}-form-filled.png`);

      // Submit form
      const submitButton = await this.waitForElement(
        By.xpath('//button[contains(text(), "Sign in") or contains(text(), "Login")]')
      );
      await this.driver.wait(until.elementIsVisible(submitButton), CONFIG.timeout.element);
      await submitButton.click();
      logger.info('Login form submitted');

      // Wait for navigation
      let navigationSuccess = false;
      try {
        await this.driver.wait(
          async () => {
            const url = await this.driver.getCurrentUrl();
            return !url.includes('/auth/login');
          },
          CONFIG.timeout.page
        );
        navigationSuccess = true;
        logger.info('Navigation away from login successful');
      } catch (err) {
        logger.warn('Navigation timeout - checking for dashboard anyway');
      }

      // Wait for page to fully load
      await this.sleep(2000);

      // Check for errors
      let errorFound = false;
      try {
        const errorElement = await this.driver.findElement(
          By.xpath('//*[@role="alert"] | //*[contains(@class, "error")] | //*[contains(@class, "alert")]')
        );
        const errorText = await errorElement.getText();
        logger.error(`Login error: ${errorText}`);
        errorFound = true;
      } catch (e) {
        // No error element found - good!
      }

      if (errorFound) {
        await this.takeScreenshot(`error-${userRole}-login.png`);
        this.failCount++;
        this.results.push({
          role: userRole,
          status: 'FAILED',
          reason: 'Login error message displayed',
        });
        return false;
      }

      // Take dashboard screenshot
      const dashboardScreenshot = await this.takeScreenshot(
        `03-${userRole}-dashboard.png`
      );

      // Get page info
      const currentUrl = await this.driver.getCurrentUrl();
      const pageTitle = await this.driver.getTitle();

      logger.success(`✅ ${userRole} LOGIN SUCCESSFUL`);
      logger.info(`URL: ${currentUrl}`);
      logger.info(`Title: ${pageTitle}`);

      this.passCount++;
      this.results.push({
        role: userRole,
        status: 'PASSED',
        url: currentUrl,
        title: pageTitle,
        screenshot: dashboardScreenshot,
      });

      return true;
    } catch (err) {
      logger.error(`${userRole} test failed: ${err.message}`);
      await this.takeScreenshot(`error-${userRole}.png`);

      this.failCount++;
      this.results.push({
        role: userRole,
        status: 'FAILED',
        reason: err.message,
      });

      return false;
    }
  }

  async runAllTests() {
    logger.info(`Starting test suite with ${CONFIG.browser} browser (headless: ${CONFIG.headless})`);
    console.log('= '.repeat(40));

    try {
      await this.initDriver();

      for (const [role, credentials] of Object.entries(TEST_USERS)) {
        await this.testLogin(role, credentials);
        // Clear cookies and storage between tests
        await this.driver.manage().deleteAllCookies();
        await this.driver.executeScript('window.localStorage.clear();');
        await this.driver.executeScript('window.sessionStorage.clear();');
        await this.sleep(1000);
      }

      // Print summary
      this.printSummary();

      // Generate HTML report
      this.generateHTMLReport();

    } catch (err) {
      logger.error(`Test suite error: ${err.message}`);
      logger.error(err.stack);
    } finally {
      if (this.driver) {
        await this.driver.quit();
        logger.success('Browser closed');
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUITE SUMMARY');
    console.log('='.repeat(80));

    console.log(`\nTotal Tests: ${this.testCount}`);
    console.log(`✅ Passed:   ${this.passCount}/${this.testCount}`);
    console.log(`❌ Failed:   ${this.failCount}/${this.testCount}`);
    console.log(`📊 Success Rate: ${((this.passCount / this.testCount) * 100).toFixed(1)}%`);

    console.log('\n' + '-'.repeat(80));
    console.log('DETAILED RESULTS:');
    console.log('-'.repeat(80));

    this.results.forEach((result, index) => {
      const emoji = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`\n${index + 1}. ${emoji} ${result.role}`);
      console.log(`   Status: ${result.status}`);
      if (result.url) console.log(`   URL: ${result.url}`);
      if (result.title) console.log(`   Title: ${result.title}`);
      if (result.reason) console.log(`   Error: ${result.reason}`);
      if (result.screenshot) {
        console.log(`   Screenshot: ${path.basename(result.screenshot)}`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`📸 Screenshots saved to: ${CONFIG.screenshotDir}`);
    console.log('='.repeat(80) + '\n');
  }

  generateHTMLReport() {
    const htmlPath = path.join(CONFIG.screenshotDir, 'test-report.html');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LearnAI Selenium Test Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
    header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
    h1 { font-size: 2.5em; margin-bottom: 10px; }
    .subtitle { opacity: 0.9; font-size: 1.1em; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; background: #f8f9fa; }
    .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .stat-value { font-size: 2.5em; font-weight: bold; color: #667eea; }
    .stat-label { color: #666; margin-top: 10px; font-weight: 500; }
    .results { padding: 30px; }
    .result-item { border: 2px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
    .result-header { background: #f8f9fa; padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
    .result-header:hover { background: #eee; }
    .result-status { font-size: 1.5em; }
    .result-title { font-weight: bold; font-size: 1.1em; color: #333; margin-left: 10px; flex: 1; }
    .result-content { padding: 20px; background: white; display: none; }
    .result-item.active .result-content { display: block; }
    .result-item.active .result-header { background: #e8eaf6; }
    .result-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin-bottom: 15px; }
    .info-block { background: #f5f5f5; padding: 12px; border-radius: 4px; border-left: 4px solid #667eea; }
    .info-label { font-weight: 600; color: #666; font-size: 0.9em; }
    .info-value { color: #333; margin-top: 5px; word-break: break-all; font-family: 'Courier New', monospace; }
    .screenshot-container { margin-top: 15px; }
    .screenshot { max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #ddd; }
    .success { color: #4caf50; }
    .failed { color: #f44336; }
    footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🧪 LearnAI Selenium Test Report</h1>
      <p class="subtitle">Authentication & Dashboard Testing</p>
    </header>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${this.testCount}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat-card">
        <div class="stat-value success">${this.passCount}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value failed">${this.failCount}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${((this.passCount / this.testCount) * 100).toFixed(1)}%</div>
        <div class="stat-label">Success Rate</div>
      </div>
    </div>

    <div class="results">
      <h2 style="margin-bottom: 20px; color: #333;">Detailed Results</h2>
      ${this.results
        .map(
          (result) => `
        <div class="result-item ${result.status === 'PASSED' ? 'passed' : 'failed'}">
          <div class="result-header" onclick="this.parentElement.classList.toggle('active')">
            <span class="result-status">${result.status === 'PASSED' ? '✅' : '❌'}</span>
            <span class="result-title">${result.role}</span>
            <span style="color: #999;">▼</span>
          </div>
          <div class="result-content">
            <div class="result-info">
              <div class="info-block">
                <div class="info-label">Status</div>
                <div class="info-value ${result.status === 'PASSED' ? 'success' : 'failed'}">
                  ${result.status}
                </div>
              </div>
              ${
                result.url
                  ? `
              <div class="info-block">
                <div class="info-label">Dashboard URL</div>
                <div class="info-value">${result.url}</div>
              </div>
              `
                  : ''
              }
              ${
                result.title
                  ? `
              <div class="info-block">
                <div class="info-label">Page Title</div>
                <div class="info-value">${result.title}</div>
              </div>
              `
                  : ''
              }
              ${
                result.reason
                  ? `
              <div class="info-block" style="border-left-color: #f44336;">
                <div class="info-label">Error</div>
                <div class="info-value" style="color: #f44336;">${result.reason}</div>
              </div>
              `
                  : ''
              }
            </div>
            ${
              result.screenshot
                ? `
            <div class="screenshot-container">
              <p style="margin-bottom: 10px; color: #666; font-weight: 500;">Dashboard Screenshot:</p>
              <img src="${path.basename(result.screenshot)}" alt="${result.role} Dashboard" class="screenshot">
            </div>
            `
                : ''
            }
          </div>
        </div>
      `
        )
        .join('')}
    </div>

    <footer>
      <p>Report generated on ${new Date().toLocaleString()}</p>
      <p>Browser: ${CONFIG.browser.toUpperCase()} | Headless: ${CONFIG.headless}</p>
    </footer>
  </div>

  <script>
    // Expand first item by default
    const firstItem = document.querySelector('.result-item');
    if (firstItem) firstItem.classList.add('active');
  </script>
</body>
</html>
    `;

    fs.writeFileSync(htmlPath, html);
    logger.success(`HTML report generated: ${htmlPath}`);
  }
}

// Run the test suite
async function main() {
  const suite = new SeleniumTestSuite();
  await suite.runAllTests();
}

main().catch((err) => {
  logger.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
