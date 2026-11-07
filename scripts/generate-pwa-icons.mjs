import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function createPng(width, height, getPixel) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const rawBytes = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawBytes[offset++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      rawBytes[offset++] = r;
      rawBytes[offset++] = g;
      rawBytes[offset++] = b;
      rawBytes[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawBytes, { level: 9 });
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

// Distance from point (px, py) to line segment (x1, y1) -> (x2, y2)
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Generate Grocify App Icon
// isMaskable = true ensures elements are safe inside the center 80% circle
function renderGrocifyIcon(width, height, isMaskable = false) {
  return createPng(width, height, (x, y) => {
    // Normalized coordinates [-1, 1]
    const nx = (x / width) * 2 - 1;
    const ny = (y / height) * 2 - 1;
    const r = Math.hypot(nx, ny);

    // Deep luxury dark background
    let bgR = 11, bgG = 15, bgB = 25; // #0b0f19

    // Emerald ambient glow in the center
    const glow = Math.max(0, 1 - r * 0.95);
    bgR = Math.round(bgR + 16 * glow * 0.4);
    bgG = Math.round(bgG + 185 * glow * 0.22);
    bgB = Math.round(bgB + 129 * glow * 0.16);

    // If not maskable, we can also give it a subtle sleek rounded container or full bleed
    // Standard icon is full bleed with rounded corners handled by OS or nice subtle outline
    let pixelR = bgR;
    let pixelG = bgG;
    let pixelB = bgB;
    let pixelA = 255;

    // Scale coordinates for drawing the cart icon
    // Safe radius is 0.70 for maskable, 0.78 for standard
    const scale = isMaskable ? 0.65 : 0.75;
    const sx = nx / scale;
    const sy = ny / scale;

    // Foreground color: Vibrant Emerald #10b981 to Mint #34d399 gradient
    const grad = (sy + 1) / 2; // 0 at top, 1 at bottom
    const fgR = Math.round(16 * (1 - grad) + 52 * grad);
    const fgG = Math.round(185 * (1 - grad) + 211 * grad);
    const fgB = Math.round(129 * (1 - grad) + 153 * grad);

    // Cart geometry (normalized in scale space [-1, 1]):
    // Handle: (-0.60, -0.40) -> (-0.42, -0.40) -> (-0.32, -0.15)
    // Basket top: (-0.32, -0.15) -> (0.50, -0.15)
    // Basket right: (0.50, -0.15) -> (0.38, 0.28)
    // Basket bottom: (0.38, 0.28) -> (-0.22, 0.28)
    // Basket left: (-0.22, 0.28) -> (-0.32, -0.15)
    const lineWidth = 0.075;

    const segments = [
      // Handle
      [-0.58, -0.40, -0.42, -0.40],
      [-0.42, -0.40, -0.32, -0.15],
      // Basket
      [-0.32, -0.15, 0.48, -0.15],
      [0.48, -0.15, 0.36, 0.25],
      [0.36, 0.25, -0.22, 0.25],
      [-0.22, 0.25, -0.32, -0.15],
      // Horizontal basket slat
      [-0.27, 0.05, 0.42, 0.05],
      // Vertical inner slats
      [-0.10, -0.15, -0.06, 0.25],
      [0.12, -0.15, 0.14, 0.25]
    ];

    let minDist = 999;
    for (const [x1, y1, x2, y2] of segments) {
      const d = distToSegment(sx, sy, x1, y1, x2, y2);
      if (d < minDist) minDist = d;
    }

    // Wheels
    const w1Dist = Math.abs(Math.hypot(sx - (-0.14), sy - 0.42) - 0.08);
    const w1Fill = Math.hypot(sx - (-0.14), sy - 0.42);
    const w2Dist = Math.abs(Math.hypot(sx - 0.28, sy - 0.42) - 0.08);
    const w2Fill = Math.hypot(sx - 0.28, sy - 0.42);

    let isWheel = false;
    if (w1Fill <= 0.09 || w2Fill <= 0.09) {
      isWheel = true;
    }

    // Sparkle star (✦) above the cart: center at (0.28, -0.42)
    const spX = sx - 0.28;
    const spY = sy - (-0.42);
    // 4-pointed star formula: |x|^0.5 + |y|^0.5 <= size^0.5
    const starSize = 0.18;
    const starDist = Math.sqrt(Math.abs(spX)) + Math.sqrt(Math.abs(spY));
    const isStar = starDist <= Math.sqrt(starSize);

    // Anti-aliased rendering
    let coverage = 0;
    if (minDist <= lineWidth / 2) {
      // smooth edge
      coverage = Math.min(1, Math.max(0, (lineWidth / 2 - minDist) / (lineWidth * 0.3) + 0.5));
    }
    if (isWheel) {
      coverage = 1;
    } else if (w1Dist <= 0.035 || w2Dist <= 0.035) {
      coverage = Math.max(coverage, 0.8);
    }
    if (isStar) {
      coverage = Math.max(coverage, 1);
    }

    // Outer subtle boundary ring
    if (!isMaskable) {
      const ringDist = Math.abs(r - 0.94);
      if (ringDist <= 0.015) {
        const ringAlpha = Math.max(0, 1 - ringDist / 0.015) * 0.25;
        pixelR = Math.round(pixelR * (1 - ringAlpha) + 16 * ringAlpha);
        pixelG = Math.round(pixelG * (1 - ringAlpha) + 185 * ringAlpha);
        pixelB = Math.round(pixelB * (1 - ringAlpha) + 129 * ringAlpha);
      }
    }

    if (coverage > 0) {
      // Glow under icon
      pixelR = Math.round(pixelR * (1 - coverage) + fgR * coverage);
      pixelG = Math.round(pixelG * (1 - coverage) + fgG * coverage);
      pixelB = Math.round(pixelB * (1 - coverage) + fgB * coverage);
    }

    return [pixelR, pixelG, pixelB, pixelA];
  });
}

// Generate the required icons
const iconsDir = path.resolve('public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA icons into:', iconsDir);

const icon192 = renderGrocifyIcon(192, 192, false);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192);
console.log('✓ icon-192.png generated (192x192)');

const icon512 = renderGrocifyIcon(512, 512, false);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), icon512);
console.log('✓ icon-512.png generated (512x512)');

const iconMaskable192 = renderGrocifyIcon(192, 192, true);
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), iconMaskable192);
console.log('✓ icon-maskable-192.png generated (192x192 maskable)');

const iconMaskable512 = renderGrocifyIcon(512, 512, true);
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), iconMaskable512);
console.log('✓ icon-maskable-512.png generated (512x512 maskable)');

const appleTouchIcon = renderGrocifyIcon(180, 180, false);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), appleTouchIcon);
console.log('✓ apple-touch-icon.png generated (180x180)');

console.log('All icons generated successfully!');
