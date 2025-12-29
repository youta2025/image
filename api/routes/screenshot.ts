import { Router } from 'express';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Enable stealth plugin
chromium.use(stealth());

const router = Router();

router.post('/', async (req, res) => {
  let { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  // Normalize URL
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) {
    if (!url.startsWith('http')) {
       url = 'https://' + url;
    }
  }

  let browser;
  try {
    // Launch browser with more anti-detect args
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1920,1080',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      deviceScaleFactor: 1,
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
    });
    
    const page = await context.newPage();

    // Add scripts to mask webdriver
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    try {
      // Add custom headers to mimic real browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Referer': 'https://www.douyin.com/',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
      });

      // Use domcontentloaded + fixed wait instead of networkidle which can be flaky on video sites
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Wait for 5 seconds to allow React/Vue apps to hydrate and anti-bot checks to pass
      await page.waitForTimeout(5000);
      
    } catch (e: any) {
      console.error('Navigation error:', e);
      // If it's a timeout, we proceed to screenshot anyway to see what loaded
      if (!e.message.includes('Timeout')) {
        throw e;
      }
    }

    // --- DYNAMIC CLEANUP LOGIC (Persistent) ---
    // Start a timer to aggressively remove popups every 100ms for 5 seconds
    const cleanupInterval = setInterval(async () => {
        try {
            if (page.isClosed()) return;
            await page.evaluate(() => {
                const selectors = [
                    '#login-pannel', '.login-mask', '[data-e2e="login-modal"]', '.dy-account-close',
                    '.captcha_verify_container', '#captcha_container', '.captcha-verify-box',
                    '.dy-login-mask', '.login-dialog-wrapper', '[class*="login-modal"]'
                ];
                selectors.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));
                
                // Force remove any high z-index overlay
                document.querySelectorAll('div, section').forEach(div => {
                    const style = window.getComputedStyle(div);
                    const z = parseInt(style.zIndex);
                    const text = (div as HTMLElement).innerText || '';
                    
                    // Targeted removal for "Login" overlays
                    if ((z > 50 || style.position === 'fixed') && 
                        (text.includes('登录') || text.includes('Login') || text.includes('验证') || text.includes('扫码'))) {
                        div.remove();
                    }
                    
                    // Specific Douyin "View More/Login" card mask
                    if (div.classList.contains('login-mask') || 
                        div.id === 'login-pannel' ||
                        text.includes('登录查看更多')) {
                        div.remove();
                    }
                });
                
                document.body.style.overflow = 'auto';
            }).catch(() => {});
        } catch (e) {}
    }, 100);

    // Scroll down to trigger loading
    await page.evaluate(() => window.scrollBy(0, 500));
    
    // Wait for dynamic content
    await page.waitForTimeout(2000); 
    
    // Stop the cleanup interval
    clearInterval(cleanupInterval);

    // Final cleanup pass
    await page.evaluate(() => {

        const selectorsToRemove = [
            '#login-pannel',           // Douyin login panel
            '.login-mask',             // Douyin login mask
            '[data-e2e="login-modal"]',// Douyin login modal
            '.dy-account-close',       // Douyin close button
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
            '[data-e2e="dy-login-container"]',
            '.dy-login-mask',
            '.login-dialog-wrapper',
            // Banner ads
            '.banner',
            '.ad-container',
        ];

        selectorsToRemove.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => el.remove());
            } catch (e) {}
        });

        // Heuristic removal: Find high z-index fixed/absolute elements containing keywords
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
                    
                    const rect = el.getBoundingClientRect();
                    const isLarge = rect.width > 300 && rect.height > 300;
                    
                    if (hasKeyword || (isLarge && style.backgroundColor !== 'rgba(0, 0, 0, 0)')) {
                        el.remove();
                    }
                }
            } catch (e) {}
        });

        // Restore scrolling
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
    });
    
    await page.waitForTimeout(500);

    // Press Escape as a fallback
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Take screenshot
    const screenshotBuffer = await page.screenshot({ fullPage: false });
    const base64Image = screenshotBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    // Save to disk
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)){
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const fileName = `${crypto.randomUUID()}.png`;
    const filePath = path.join(uploadsDir, fileName);
    
    fs.writeFileSync(filePath, screenshotBuffer);
    
    const protocol = req.protocol;
    const host = req.get('host');
    const publicUrl = `${protocol}://${host}/uploads/${fileName}`;

    res.json({
      success: true,
      data: {
        image: dataUrl,
        url: publicUrl
      }
    });

  } catch (error: any) {
    console.error('Screenshot error:', error);
    
    // Attempt to capture a debug screenshot if browser is open
    let debugUrl = null;
    try {
        if (browser) {
           // We might not have 'page' reference easily here without refactoring, 
           // but normally we fail before page creation or during navigation.
           // If we failed inside, let's just return the error.
        }
    } catch(e) {}

    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to capture screenshot',
      details: 'Check server logs for more info.'
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

export default router;
