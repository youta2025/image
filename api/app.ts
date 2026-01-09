/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import fs from 'fs'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import screenshotRoutes from './routes/screenshot.js'
import uploadRoutes from './routes/upload.js'
import processRoutes from './routes/process.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Simple Request Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  // Log when request comes in
  console.log(`[${new Date().toISOString()}] Incoming ${req.method} ${req.originalUrl}`);
  if (req.method === 'POST' && req.body && req.body.url) {
      console.log(` -> Target URL: ${req.body.url}`);
  }

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] Completed ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Serve static files from 'public' directory
app.use('/uploads', (req, res, next) => {
  next();
}, express.static(path.join(process.cwd(), 'public', 'uploads')));

// Serve Frontend Static Assets (Production Mode)
// Check if 'dist' directory exists (result of vite build)
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
    // Serve static files from dist
    app.use(express.static(distPath));

    // Handle SPA routing: serve index.html for any unknown non-API routes
    // We place this BEFORE the 404 handler but AFTER API routes
    // However, since API routes are defined below, we need to be careful.
    // Actually, in Express, order matters.
    // Correct approach:
    // 1. Static files (done above)
    // 2. API Routes (done below)
    // 3. SPA Fallback (should be after API routes but before Error Handlers)
} else {
    // Serve the test UI at root (Dev Mode Fallback)
    app.get('/', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'test_ui.html'));
    });
}

// Keep the root static serve just in case for other public files
app.use(express.static(path.join(process.cwd(), 'public')));

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/screenshot', screenshotRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/process', processRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

// SPA Fallback: If request didn't match any API route and we are in production (dist exists), serve index.html
if (fs.existsSync(distPath)) {
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
            // Let API 404s fall through to the 404 handler
            return res.status(404).json({ success: false, error: 'API not found' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

/**
 * Cleanup Task: Delete old files every hour
 * Retain files for 1 hour (3600000 ms)
 */
const cleanupOldFiles = () => {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const MAX_AGE = 60 * 60 * 1000; // 1 hour

    console.log(`[Cleanup] Starting cleanup of ${uploadsDir}`);

    if (fs.existsSync(uploadsDir)) {
        fs.readdir(uploadsDir, (err, files) => {
            if (err) {
                console.error('[Cleanup] Error reading directory:', err);
                return;
            }

            const now = Date.now();
            let deletedCount = 0;

            files.forEach(file => {
                const filePath = path.join(uploadsDir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;

                    if (now - stats.mtimeMs > MAX_AGE) {
                        fs.unlink(filePath, (err) => {
                            if (err) console.error(`[Cleanup] Failed to delete ${file}`);
                            else {
                                // console.log(`[Cleanup] Deleted old file: ${file}`);
                                deletedCount++;
                            }
                        });
                    }
                });
            });
        });
    }
};

// Run cleanup immediately on start
cleanupOldFiles();

// Schedule cleanup every 30 minutes
setInterval(cleanupOldFiles, 30 * 60 * 1000);


/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
