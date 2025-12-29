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
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import screenshotRoutes from './routes/screenshot.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Serve static files from 'public' directory
// This is where we store the temporary screenshot files
// Fix: Mount 'public' directory to '/uploads' path specifically or root
// If we use app.use(express.static(...)), then 'public/uploads/x.png' is accessed via '/uploads/x.png'
// However, if the file is truly 404, maybe process.cwd() is not what we expect in compiled TS code.
// Let's try to be more robust by using __dirname relative path if possible, or debugging.
// But first, let's explicitly mount the uploads directory to make the URL structure clearer.

// Option 1: Mount public folder to root (Current) -> /uploads/file.png
// Option 2: Mount uploads folder to /uploads -> /uploads/file.png

// Let's try Option 2 to be safer and ensure the path mapping is correct.
// We also add logging to debug static file requests.

app.use('/uploads', (req, res, next) => {
  // Simple debug log for static files
  // console.log('Accessing upload:', req.path);
  next();
}, express.static(path.join(process.cwd(), 'public', 'uploads')));

// Keep the root static serve just in case for other public files
app.use(express.static(path.join(process.cwd(), 'public')));

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/screenshot', screenshotRoutes)

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
