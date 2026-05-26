/**
 * Puppeteer Scraper Service - Content extraction from iframe
 * Launches headless browser, navigates to open.maic.chat, and scrapes generated content
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { createLogger } from '@/lib/logger';

const log = createLogger('PuppeteerScraper');

interface ScrapingResult {
  success: boolean;
  html?: string;
  assets?: { [key: string]: Buffer };
  error?: string;
}

/**
 * Configuration for scraping
 */
interface ScrapeConfig {
  miacUrl?: string;
  timeout?: number; // milliseconds
  waitForSelector?: string; // Wait for this element to appear
}

const DEFAULT_CONFIG: ScrapeConfig = {
  miacUrl: 'https://open.maic.chat',
  timeout: 90000, // 90 seconds
  waitForSelector: '[data-generation-complete="true"], .course-complete, .content-ready', // Adjust based on actual MAIC UI
};

/**
 * Scrape course content from open.maic.chat iframe
 */
export async function scrapeOpenMaicContent(
  syllabusContent: any,
  studentContext?: {
    gradeLevel?: string;
    interests?: string[];
  },
  config: ScrapeConfig = DEFAULT_CONFIG
): Promise<ScrapingResult> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Overcome limited resource problems
      ],
    });

    page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1280, height: 720 });

    // Build URL with encoded syllabus
    const miacUrl = buildMaicUrl(config.miacUrl || DEFAULT_CONFIG.miacUrl!, syllabusContent, studentContext);
    
    log.info('Navigating to MAIC:', miacUrl.substring(0, 100) + '...');

    // Navigate with timeout
    try {
      await page.goto(miacUrl, {
        waitUntil: 'networkidle2',
        timeout: config.timeout || DEFAULT_CONFIG.timeout!,
      });
    } catch (error) {
      log.warn('Navigation timeout or error, continuing anyway:', error);
      // Continue - content might still be loaded
    }

    // Wait for content generation to complete
    try {
      const waitSelector = config.waitForSelector || DEFAULT_CONFIG.waitForSelector;
      await page.waitForFunction(
        () => {
          // Check multiple possible completion indicators
          const sel1 = document.querySelector('[data-generation-complete="true"]');
          const sel2 = document.querySelector('.course-complete');
          const sel3 = document.querySelector('.content-ready');
          const sel4 = document.querySelector('[data-status="complete"]');
          return !!(sel1 || sel2 || sel3 || sel4);
        },
        { timeout: config.timeout || DEFAULT_CONFIG.timeout! }
      );
    } catch (error) {
      log.warn('Wait for completion selector timed out, content might still be ready:', error);
      // Give it a bit more time for rendering
      await page.waitForTimeout(3000);
    }

    // Extract HTML content
    const html = await page.content();
    
    // Try to extract just the main content (remove iframe wrapper if present)
    const cleanHtml = cleanIframeContent(html);

    // Extract assets (CSS, JS, images)
    const assets = await extractAssets(page);

    return {
      success: true,
      html: cleanHtml,
      assets,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('Scraping error:', message);
    return {
      success: false,
      error: message,
    };
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        log.warn('Error closing page:', e);
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        log.warn('Error closing browser:', e);
      }
    }
  }
}

/**
 * Build URL for open.maic.chat with encoded syllabus
 * Adjust parameters based on actual MAIC API
 */
function buildMaicUrl(
  baseUrl: string,
  syllabusContent: any,
  studentContext?: any
): string {
  const url = new URL(baseUrl);

  // Encode syllabus as JSON
  const syllabusJson = JSON.stringify(syllabusContent);
  const encoded = Buffer.from(syllabusJson).toString('base64');

  url.searchParams.append('syllabus', encoded);

  // Add student context if provided
  if (studentContext?.gradeLevel) {
    url.searchParams.append('gradeLevel', studentContext.gradeLevel);
  }
  if (studentContext?.interests && Array.isArray(studentContext.interests)) {
    url.searchParams.append('interests', studentContext.interests.join(','));
  }

  // Add generation trigger parameter
  url.searchParams.append('autoGenerate', 'true');

  return url.toString();
}

/**
 * Clean iframe content - remove wrapper, keep main content
 */
function cleanIframeContent(html: string): string {
  // Remove script tags that might cause issues
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Try to extract main content area
  // Adjust selectors based on MAIC's actual structure
  const mainMatch = html.match(/<main[^>]*>[\s\S]*?<\/main>/i);
  const contentMatch = html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>[\s\S]*?<\/div>/i);
  const bodyMatch = html.match(/<body[^>]*>[\s\S]*?<\/body>/i);

  if (mainMatch) {
    cleaned = mainMatch[0];
  } else if (contentMatch) {
    cleaned = contentMatch[0];
  } else if (bodyMatch) {
    cleaned = bodyMatch[0];
  }

  return cleaned;
}

/**
 * Extract external assets (CSS, images) from page
 */
async function extractAssets(page: Page): Promise<{ [key: string]: Buffer }> {
  const assets: { [key: string]: Buffer } = {};

  try {
    // Get all resources from page
    const resourceUrls = await page.evaluate(() => {
      const urls: string[] = [];

      // Get stylesheets
      document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        const href = (link as HTMLLinkElement).href;
        if (href) urls.push(href);
      });

      // Get images
      document.querySelectorAll('img').forEach((img) => {
        const src = (img as HTMLImageElement).src;
        if (src && src.startsWith('http')) urls.push(src);
      });

      return urls;
    });

    // Download each resource (limit to avoid too many downloads)
    for (const url of resourceUrls.slice(0, 20)) {
      try {
        const response = await page.goto(url, { waitUntil: 'networkidle0' });
        if (response?.ok()) {
          const buffer = await response.buffer();
          const fileName = url.split('/').pop() || `asset_${Object.keys(assets).length}`;
          assets[fileName] = buffer;
        }
      } catch (error) {
        log.warn('Failed to download asset:', url);
      }
    }
  } catch (error) {
    log.warn('Error extracting assets:', error);
  }

  return assets;
}

/**
 * Test connectivity to open.maic.chat
 */
export async function testMaicConnectivity(baseUrl = 'https://open.maic.chat'): Promise<boolean> {
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    });

    const page = await browser.newPage();
    const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.close();

    return response?.ok() ?? false;
  } catch (error) {
    log.error('Connectivity test failed:', error);
    return false;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
