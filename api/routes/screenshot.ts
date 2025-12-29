import { Router } from 'express';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();

router.post('/', async (req, res) => {
  let { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  // Normalize URL
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) {
      // If the user forgot http/https, we could add it, or return error.
      // But based on user feedback "please enter a valid URL using https protocol",
      // let's ensure we support valid input even if it has extra spaces.
      // And we can try to prepend https:// if missing, or just validation.
      if (!url.startsWith('http')) {
           url = 'https://' + url;
      }
  }

  let browser;
  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // Useful for some environments
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();

    // Navigate to URL
    // We use domcontentloaded first to ensure we get to the page quickly.
    // Then we try to wait for networkidle, but don't fail if it times out (e.g. streaming sites).
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      // Extra wait for dynamic content
      await page.waitForTimeout(3000);
    } catch (e) {
      console.error('Navigation error:', e);
      // If navigation failed completely, we might still want to try capturing if content exists,
      // but usually goto throws if it can't load the page.
      // If it's just a timeout, we might be able to proceed.
      if (!e.message.includes('Timeout')) {
        throw e;
      }
    }

    // Logic to close verification codes / login modals / popups
    // This is heuristic-based and might not cover all cases
    const commonCloseSelectors = [
      'button[aria-label="Close"]',
      'button[aria-label="close"]',
      'button[title="Close"]',
      '.close',
      '.modal-close',
      '.popup-close',
      'button:has-text("Close")',
      'button:has-text("No thanks")',
      'button:has-text("Not now")',
      'button:has-text("Maybe later")',
      'button:has-text("关闭")',
      'button:has-text("以后再说")',
      '[data-dismiss="modal"]',
      '.ant-modal-close',
      '.el-dialog__headerbtn',
      'div[role="button"][aria-label="Close"]',
      'svg[aria-label="Close"]',
      // Douyin / TikTok specific (heuristic)
      '.dy-account-close',
      '[class*="close"]', 
      '[class*="Close"]'
    ];

    // Scroll down a bit to trigger lazy loading or popups
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(2000); // Wait a bit more for popups to appear

    // Aggressive cleanup logic using evaluate
    await page.evaluate(() => {
        // 1. Remove specific known selectors for Douyin and others
        const selectorsToRemove = [
            '#login-pannel',           // Douyin login panel
            '.login-mask',             // Douyin login mask
            '[data-e2e="login-modal"]',// Douyin login modal
            '.dy-account-close',       // Douyin close button (if we want to remove the container instead of clicking)
            '.captcha_verify_container', // Captcha container
            '#captcha_container',
            '.captcha-verify-box',
            '#captcha-verify-image',   // Captcha image
            '.verify-bar',             // Verify slider
            '[class*="login-modal"]',  // Common login modal classes
            '[class*="login_modal"]',
            '[class*="LoginModal"]',
            '.ant-modal-root',         // Ant Design modal
            '.el-overlay',             // Element Plus overlay
            '[role="dialog"]',         // Generic dialogs
            '.mask',                   // Generic mask
            '.modal-backdrop',
            '#passport-login-pop',     // Weibo/others
            '.sign-in-modal',
        ];

        selectorsToRemove.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    el.remove();
                });
            } catch (e) {}
        });

        // 2. Heuristic removal: Find high z-index fixed/absolute elements containing keywords
        // This is "nuclear option" to remove overlays
        const allElements = document.querySelectorAll('div, section, aside, article');
        allElements.forEach(el => {
            try {
                const style = window.getComputedStyle(el);
                const isOverlay = (style.position === 'fixed' || style.position === 'absolute');
                const hasHighZIndex = parseInt(style.zIndex) > 50;
                
                if (isOverlay && hasHighZIndex) {
                    const text = (el as HTMLElement).innerText || '';
                    const keywords = ['登录', '验证', '扫码', 'Login', 'Sign in', 'Verify', 'Captcha'];
                    const hasKeyword = keywords.some(kw => text.includes(kw));
                    
                    // If it covers a large area or has keywords, remove it
                    const rect = el.getBoundingClientRect();
                    const isLarge = rect.width > 300 && rect.height > 300;
                    
                    if (hasKeyword || (isLarge && style.backgroundColor !== 'rgba(0, 0, 0, 0)')) {
                        // Double check we are not removing the main content
                        // Usually main content is not fixed with high z-index
                        el.remove();
                    }
                }
            } catch (e) {}
        });

        // 3. Restore scrolling
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
    });
    
    // Small pause to ensure rendering updates after removal
    await page.waitForTimeout(500);

    // Fallback: Click specific close buttons if they still exist (maybe inside iframes?)
    // Note: Cross-origin iframes are hard to touch, but same-origin might work.
    // We already tried to remove containers, so this is just a backup.
    const textSelectors = [
      'button:has-text("Close")',
      'button:has-text("关闭")',
      'button:has-text("No thanks")',
      'button:has-text("Not now")',
      '[aria-label="Close"]',
      '.dy-account-close'
    ];

    for (const selector of textSelectors) {
      try {
        const locators = page.locator(selector);
        const count = await locators.count();
        if (count > 0) {
            await locators.first().click({ timeout: 500 }).catch(() => {});
        }
      } catch (e) {}
    }

    // Additional specific handling for common patterns if needed
    // e.g. pressing Escape key which often closes modals
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Take screenshot
    const screenshotBuffer = await page.screenshot({ fullPage: false });
    const base64Image = screenshotBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    // Upload to a temporary hosting service or just return the data URL
    // Since the user asked for "url format" but we don't have object storage configured (S3/OSS),
    // we can't easily return a public http:// url for the image unless we save it to disk and serve it static.
    // 
    // However, saving to disk on Render (ephemeral filesystem) and serving it is possible but temporary.
    // Let's implement a simple local file save and return the URL relative to our server.
    
    // Create uploads directory if not exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)){
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const fileName = `${crypto.randomUUID()}.png`;
    const filePath = path.join(uploadsDir, fileName);
    
    fs.writeFileSync(filePath, screenshotBuffer);
    
    // Construct public URL
    // Assuming the server is reachable via the host header or a configured base URL
    const protocol = req.protocol;
    const host = req.get('host');
    const publicUrl = `${protocol}://${host}/uploads/${fileName}`;

    res.json({
      success: true,
      data: {
        image: dataUrl, // Keep base64 for compatibility
        url: publicUrl  // Add public URL
      }
    });

  } catch (error: any) {
    console.error('Screenshot error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to capture screenshot' 
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

export default router;
