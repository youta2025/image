
import { Router, type Request, type Response } from 'express';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
// fetch is available globally in Node 18+

const router = Router();

router.get('/', (req, res) => {
  res.status(405).json({ success: false, error: 'Method Not Allowed. Please use POST to process image.' });
});

interface ProcessRequestBody {
  imageUrl: string;
  options: {
    subtitle?: string;
    themeColor?: string; // hex code
    strokeWidth?: number;
    borderStyle?: 'solid' | 'dashed' | 'double';
    borderRadius?: {
        tl: number;
        tr: number;
        bl: number;
        br: number;
    };
    textColor?: string;
    footerColor?: string;
    footerOpacity?: number;
    // Free distortion options (offsets for each corner)
    distortion?: {
        tl?: { x: number; y: number };
        tr?: { x: number; y: number };
        bl?: { x: number; y: number };
        br?: { x: number; y: number };
    };
    // Legacy simple perspective boolean
    perspective?: boolean;
  };
  outputFormat?: 'jpg' | 'png' | 'webp';
}

/**
 * Apply perspective transform using ImageMagick
 */
function applyPerspective(inputBuffer: Buffer, width: number, height: number, distortion?: ProcessRequestBody['options']['distortion']): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        let p0, p1, p2, p3;

        if (distortion) {
            // Use custom distortion offsets
            // TL
            const x0 = 0 + (distortion.tl?.x || 0);
            const y0 = 0 + (distortion.tl?.y || 0);
            // TR
            const x1 = width + (distortion.tr?.x || 0);
            const y1 = 0 + (distortion.tr?.y || 0);
            // BL
            const x2 = 0 + (distortion.bl?.x || 0);
            const y2 = height + (distortion.bl?.y || 0);
            // BR
            const x3 = width + (distortion.br?.x || 0);
            const y3 = height + (distortion.br?.y || 0);

            p0 = `0,0 ${x0},${y0}`;
            p1 = `${width},0 ${x1},${y1}`;
            p2 = `0,${height} ${x2},${y2}`;
            p3 = `${width},${height} ${x3},${y3}`;
        } else {
            // Default "tilt back" effect if no custom distortion provided
            const factor = 0.15;
            const xOffset = width * factor;
            const yOffset = height * (factor * 0.5);
            
            p0 = `0,0 ${xOffset},${yOffset}`;         // TL
            p1 = `${width},0 ${width - xOffset},${yOffset}`; // TR
            p2 = `0,${height} 0,${height}`;           // BL
            p3 = `${width},${height} ${width},${height}`;    // BR
        }
        
        // Use ImageMagick 'convert' to apply perspective distortion
        // -alpha set: ensure alpha channel exists
        // -virtual-pixel transparent: ensure background is transparent
        // -distort Perspective: apply the transform
        const args = [
             '-', // Read from stdin
             '-alpha', 'set', 
             '-virtual-pixel', 'transparent',
             '-distort', 'Perspective', `${p0}  ${p1}  ${p2}  ${p3}`,
             '-' // Write to stdout
         ];
 
         // Try to spawn 'convert' (ImageMagick 6) or 'magick' (ImageMagick 7)
         // On Windows it is often 'magick', on Linux 'convert'
         // We'll try 'magick' first for better cross-platform support in modern IM
         let command = 'convert';
         if (process.platform === 'win32') {
            command = 'magick';
         }

         const proc = spawn(command, args);
         
         const chunks: Buffer[] = [];
        proc.stdout.on('data', (chunk) => chunks.push(chunk));
        proc.stdout.on('end', () => {
            if (chunks.length === 0) {
                // If no output, maybe command failed silently or not found?
                // Resolve with original buffer to be safe
                console.warn('ImageMagick produced no output, returning original image.');
                resolve(inputBuffer);
            } else {
                resolve(Buffer.concat(chunks));
            }
        });
        
        proc.stderr.on('data', (data) => {
             // ImageMagick might output warnings to stderr, not necessarily errors
             // Only treat as fatal if we get no stdout
             // console.warn(`ImageMagick stderr: ${data}`);
        });
        
        proc.on('error', (err) => {
            console.error('Failed to spawn ImageMagick (perspective transform skipped):', err.message);
            // Fallback: return original buffer instead of crashing
            resolve(inputBuffer); 
        });
        
        // Write input image to stdin
        proc.stdin.write(inputBuffer);
        proc.stdin.end();
    });
}

/**
 * Helper to get local file path from URL or return buffer from remote URL
 */
async function getImageBuffer(imageUrl: string): Promise<Buffer> {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const urlParts = imageUrl.split('/uploads/');
  
  if (urlParts.length > 1) {
    const filename = urlParts[1];
    const localPath = path.join(uploadsDir, filename);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }
  }

  // Basic URL validation
  try {
    const parsedUrl = new URL(imageUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Invalid URL protocol');
    }
  } catch (e) {
    throw new Error('Invalid URL format');
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Helper to generate path D string for rounded rectangle
 */
function getRoundedRectPath(w: number, h: number, tl: number, tr: number, br: number, bl: number, inset: number = 0): string {
    const x = inset;
    const y = inset;
    const width = w - 2 * inset;
    const height = h - 2 * inset;
    
    // Ensure radii don't exceed dimensions
    const maxR = Math.min(width, height) / 2;
    const rtl = Math.min(tl, maxR);
    const rtr = Math.min(tr, maxR);
    const rbr = Math.min(br, maxR);
    const rbl = Math.min(bl, maxR);

    // Adjust radii for inset (shrink internal radii)
    // If inset > radius, the internal radius should effectively be 0 or small? 
    // Actually, mathematically, inner radius = outer radius - inset.
    const itl = Math.max(0, rtl - inset);
    const itr = Math.max(0, rtr - inset);
    const ibr = Math.max(0, rbr - inset);
    const ibl = Math.max(0, rbl - inset);
    
    // However, if we are drawing a STROKE, the path should be in the center of the stroke?
    // Or we draw the path at the edge and rely on stroke alignment?
    // SVG stroke is centered on the path.
    // If we want the border to be INSIDE the card (width W, height H),
    // and strokeWidth is S.
    // The path should be inset by S/2.
    // And the radius used in the path arc command should be (R - S/2).
    
    // So if 'inset' passed here is S/2:
    
    return `
        M ${x + itl} ${y}
        H ${x + width - itr}
        A ${itr} ${itr} 0 0 1 ${x + width} ${y + itr}
        V ${y + height - ibr}
        A ${ibr} ${ibr} 0 0 1 ${x + width - ibr} ${y + height}
        H ${x + ibl}
        A ${ibl} ${ibl} 0 0 1 ${x} ${y + height - ibl}
        V ${y + itl}
        A ${itl} ${itl} 0 0 1 ${x + itl} ${y}
        Z
    `;
}


/**
 * POST /api/process
 * Create a premium card compositing from an image
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageUrl, options = {}, outputFormat = 'png' } = req.body as ProcessRequestBody;
    const { 
        subtitle = 'STEP 01 接收用户指令', 
        themeColor = '#3B82F6',
        strokeWidth = 4,
        borderStyle = 'solid',
        borderRadius = { tl: 20, tr: 20, bl: 20, br: 20 },
        textColor = '#cccccc',
        footerColor = '#000000',
        footerOpacity = 0.7
    } = options;

    if (!imageUrl) {
      res.status(400).json({ success: false, error: 'imageUrl is required' });
      return;
    }

    // 1. Get Image Buffer
    let originalImageBuffer: Buffer;
    try {
      originalImageBuffer = await getImageBuffer(imageUrl);
    } catch (e: any) {
      res.status(400).json({ success: false, error: `Could not load image: ${e.message}` });
      return;
    }

    // 2. Prepare Dimensions
    const imageMetadata = await sharp(originalImageBuffer).metadata();
    const originalWidth = imageMetadata.width || 800;
    const originalHeight = imageMetadata.height || 500;

    const MAX_WIDTH = 1200;
    let CARD_WIDTH = originalWidth;
    let CARD_HEIGHT = originalHeight;

    if (CARD_WIDTH > MAX_WIDTH) {
        const ratio = MAX_WIDTH / CARD_WIDTH;
        CARD_WIDTH = MAX_WIDTH;
        CARD_HEIGHT = Math.round(originalHeight * ratio);
    }

    // Ensure dimensions are even numbers
    CARD_WIDTH = Math.floor(CARD_WIDTH / 2) * 2;
    CARD_HEIGHT = Math.floor(CARD_HEIGHT / 2) * 2;

    const FOOTER_HEIGHT = 60; 

    // Resize original image & ensure alpha channel exists
    const resizedImageBuffer = await sharp(originalImageBuffer)
      .resize({
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        fit: 'cover',
        position: 'center'
      })
      .ensureAlpha()
      .toBuffer();

    // 3. Create SVG Overlays
    
    // 3.1 Mask Path (Outer Boundary)
    // Used for clipping the image and footer
    const maskPathD = getRoundedRectPath(
        CARD_WIDTH, CARD_HEIGHT, 
        borderRadius.tl, borderRadius.tr, borderRadius.br, borderRadius.bl, 
        0 // No inset for mask
    );

    // 3.2 Footer Background
    // Footer needs to be clipped by the same rounded corners at the bottom
    // We can just draw a rect and clip it later, OR draw a path that matches bottom curvature.
    // Drawing a simple rect and letting the final mask handle the clipping is easier and safer.
    // BUT we need it to be semi-transparent on top of the image BEFORE masking?
    // No, if we composite footer on top of image, then mask the whole thing, it works.
    // The only issue is if the footer is semi-transparent, we want it to cover the image.
    
    // Let's create a footer rect that spans full width
    const footerSvg = `
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
        <rect x="0" y="${CARD_HEIGHT - FOOTER_HEIGHT}" width="${CARD_WIDTH}" height="${FOOTER_HEIGHT}" 
              fill="${footerColor}" fill-opacity="${footerOpacity}"/>
      </svg>
    `;

    // 3.3 Text Overlay
    const safeSubtitle = subtitle.replace(/[<>&]/g, '');
    const textSvg = `
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
        <style>
          .text { fill: ${textColor}; font-family: sans-serif; font-size: 16px; font-weight: bold; }
        </style>
        <text x="20" y="${CARD_HEIGHT - 25}" class="text">${safeSubtitle}</text>
      </svg>
    `;

    // 3.4 Rounded Corners Mask (White on Black for dest-in)
    // Actually standard SVG mask is luminance or alpha. Sharp 'dest-in' uses alpha of the input.
    // So we need a solid shape with alpha 1.
    const roundedMask = Buffer.from(`
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
        <path d="${maskPathD}" fill="white"/>
      </svg>
    `);

    // 3.5 Border SVG
    let borderSvgContent = '';
    
    if (borderStyle === 'double') {
        // Double border logic
        // Total width = strokeWidth.
        // We draw two lines. 
        // Each line width = strokeWidth / 3.
        // Gap = strokeWidth / 3.
        const singleLineWidth = strokeWidth / 3;
        
        // Outer line: inset by singleLineWidth / 2
        const outerInset = singleLineWidth / 2;
        const outerPath = getRoundedRectPath(CARD_WIDTH, CARD_HEIGHT, borderRadius.tl, borderRadius.tr, borderRadius.br, borderRadius.bl, outerInset);
        
        // Inner line: inset by (singleLineWidth + gap + singleLineWidth / 2) = 2.5 * singleLineWidth
        // Or simpler: Total stroke is S.
        // Outer edge is 0.
        // Outer line center is S/6.
        // Inner line center is S - S/6 = 5S/6.
        const innerInset = strokeWidth - (singleLineWidth / 2); 
        const innerPath = getRoundedRectPath(CARD_WIDTH, CARD_HEIGHT, borderRadius.tl, borderRadius.tr, borderRadius.br, borderRadius.bl, innerInset);

        borderSvgContent = `
            <path d="${outerPath}" fill="none" stroke="${themeColor}" stroke-width="${singleLineWidth}" stroke-opacity="1"/>
            <path d="${innerPath}" fill="none" stroke="${themeColor}" stroke-width="${singleLineWidth}" stroke-opacity="1"/>
        `;
    } else {
        // Solid or Dashed
        const dashAttr = borderStyle === 'dashed' ? 'stroke-dasharray="10,8"' : '';
        const inset = strokeWidth / 2;
        const borderPathD = getRoundedRectPath(CARD_WIDTH, CARD_HEIGHT, borderRadius.tl, borderRadius.tr, borderRadius.br, borderRadius.bl, inset);
        
        borderSvgContent = `
            <path d="${borderPathD}" fill="none" stroke="${themeColor}" stroke-width="${strokeWidth}" ${dashAttr} stroke-opacity="1"/>
        `;
    }

    const borderSvg = `
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
        ${borderSvgContent}
      </svg>
    `;

    // 4. Compositing
    const cardContent = await sharp(resizedImageBuffer)
        .composite([
            { input: Buffer.from(footerSvg), blend: 'over' },
            { input: Buffer.from(textSvg), blend: 'over' },
            { input: Buffer.from(borderSvg), blend: 'over' }
        ])
        .png() 
        .toBuffer();

    // Apply rounded mask
    const finalCard = await sharp({
        create: {
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite([
        { input: cardContent, blend: 'over' },
        { input: roundedMask, blend: 'dest-in' }
    ])
    .png()
    .toBuffer();

    let outputBuffer = finalCard;

    // Apply Perspective if requested
    if (options.perspective || options.distortion) {
        outputBuffer = await applyPerspective(finalCard, CARD_WIDTH, CARD_HEIGHT, options.distortion);
    }

    // 5. Final Output
    const finalOutput = await sharp(outputBuffer)
        .toFormat(outputFormat === 'jpg' ? 'jpeg' : outputFormat as any)
        .toBuffer();

    // 6. Save
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `card-${uuidv4()}.${outputFormat}`;
    const outputPath = path.join(uploadsDir, filename);
    
    fs.writeFileSync(outputPath, finalOutput);

    const protocol = req.protocol;
    const host = req.headers.host;
    const processedUrl = `${protocol}://${host}/uploads/${filename}`;

    res.json({
      success: true,
      processedUrl: processedUrl,
      processingTime: 0
    });

  } catch (error: any) {
    console.error('Processing error:', error);
    res.status(500).json({ success: false, error: error.message || 'Processing failed' });
  }
});

export default router;
