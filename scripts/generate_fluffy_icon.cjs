const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Generating true 3D FLUFFY PLUSH icon: Discord Violet Fur + Tactile White Envelope...');

const W = 640;
const H = 640;

const bufR = new Float32Array(W * H);
const bufG = new Float32Array(W * H);
const bufB = new Float32Array(W * H);

let seed = 4242;
function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

const perm = new Uint8Array(512);
for (let i = 0; i < 256; i++) perm[i] = perm[i + 256] = Math.floor(random() * 256);

function noise2D(x, y) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  
  const a = perm[X] + Y;
  const aa = perm[a];
  const ab = perm[a + 1];
  const b = perm[X + 1] + Y;
  const ba = perm[b];
  const bb = perm[b + 1];
  
  const g1 = (perm[aa] / 255);
  const g2 = (perm[ba] / 255);
  const g3 = (perm[ab] / 255);
  const g4 = (perm[bb] / 255);
  
  const x1 = g1 * (1 - u) + g2 * u;
  const x2 = g3 * (1 - u) + g4 * u;
  return x1 * (1 - v) + x2 * v;
}

function fbm(x, y, octaves = 4) {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise2D(x * freq, y * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return val;
}

// Squircle distance function for cushion base
function getSquircleDist(x, y) {
  const nx = Math.abs(x - 320) / 248;
  const ny = Math.abs(y - 320) / 248;
  return Math.pow(nx, 3.8) + Math.pow(ny, 3.8);
}

function blendPixel(x, y, r, g, b, alpha) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  if (xi < 0 || xi >= W || yi < 0 || yi >= H) return;
  const idx = yi * W + xi;
  bufR[idx] = bufR[idx] * (1 - alpha) + r * alpha;
  bufG[idx] = bufG[idx] * (1 - alpha) + g * alpha;
  bufB[idx] = bufB[idx] * (1 - alpha) + b * alpha;
}

// 1. Fill base canvas with subtle dark violet ambient background
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    const dist = Math.hypot(x - 320, y - 320) / 320;
    bufR[idx] = Math.max(10, 16 - dist * 8);
    bufG[idx] = Math.max(8, 14 - dist * 8);
    bufB[idx] = Math.max(22, 36 - dist * 14);
  }
}

// 2. Base Squircle Purple Velvet Pillow Shader
console.log('Rendering 3D purple velvet cushion base...');
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    const sqDist = getSquircleDist(x, y);

    if (sqDist < 1.28) {
      const lx = (x - 220) / 320;
      const ly = (y - 180) / 320;
      const lightFactor = Math.max(0, 1.0 - Math.hypot(lx, ly) * 0.72);

      const n = fbm(x * 0.025, y * 0.025, 4);

      // Discord blurple & vibrant royal violet palette
      // Base: #5865F2 (88, 101, 242), Highlight: #7A87FF, Depth: #3A42AA
      let r = 70 + lightFactor * 55 + n * 22;
      let g = 40 + lightFactor * 42 + n * 18;
      let b = 195 + lightFactor * 55 + n * 25;

      let alpha = 1.0;
      if (sqDist > 0.88) {
        alpha = Math.max(0, (1.28 - sqDist) / 0.40);
      }

      bufR[idx] = bufR[idx] * (1 - alpha) + r * alpha;
      bufG[idx] = bufG[idx] * (1 - alpha) + g * alpha;
      bufB[idx] = bufB[idx] * (1 - alpha) + b * alpha;
    }
  }
}

// 3. Render 280,000 Extra-Fluffy Plush Fur Strands on the Violet Squircle
console.log('Rendering 280,000 wavy purple plush fur strands...');
for (let i = 0; i < 280000; i++) {
  const px = 40 + random() * 560;
  const py = 40 + random() * 560;
  const sqDist = getSquircleDist(px, py);

  if (sqDist > 1.25) continue;

  const isBorder = sqDist > 0.80;
  const radialAngle = Math.atan2(py - 320, px - 320);
  const noiseAngle = (fbm(px * 0.012, py * 0.012, 3) - 0.5) * Math.PI * 2.8;

  const angle = isBorder ? (radialAngle + (random() - 0.5) * 1.1) : noiseAngle;
  // Long fluffy strands sticking outward at border (up to 24px!)
  const length = isBorder ? (12 + random() * 18) : (7 + random() * 13);
  const curl = (random() - 0.5) * 1.3;

  const distFromLight = Math.hypot(px - 210, py - 170) / 380;
  const fiberLight = Math.max(0.4, 1.28 - distFromLight * 0.85) + (random() - 0.5) * 0.25;

  const colorType = random();
  let fR, fG, fB;
  if (colorType < 0.28) {
    // Lavender / light violet tips
    fR = 175 * fiberLight; fG = 130 * fiberLight; fB = 255 * fiberLight;
  } else if (colorType < 0.70) {
    // Classic Discord blurple
    fR = 98 * fiberLight; fG = 110 * fiberLight; fB = 245 * fiberLight;
  } else {
    // Deep royal indigo fur base
    fR = 55 * fiberLight; fG = 45 * fiberLight; fB = 185 * fiberLight;
  }

  const steps = 8;
  for (let s = 0; s < steps; s++) {
    const t = s / steps;
    const wave = Math.sin(t * Math.PI * 2) * 1.6;
    const curAngle = angle + curl * t;
    const sx = px + Math.cos(curAngle) * (length * t) + Math.cos(curAngle + Math.PI / 2) * wave;
    const sy = py + Math.sin(curAngle) * (length * t) + Math.sin(curAngle + Math.PI / 2) * wave;

    const strandT = 0.6 + t * 0.5;
    const tipR = Math.min(255, fR * strandT);
    const tipG = Math.min(255, fG * strandT);
    const tipB = Math.min(255, fB * strandT);

    const a = (1.0 - t * 0.2) * 0.65;
    blendPixel(sx, sy, tipR, tipG, tipB, a);
    blendPixel(sx + 0.6, sy + 0.3, tipR, tipG, tipB, a * 0.45);
  }
}

// 4. Geometry of the White Mail Envelope (Значок письма)
// Envelope box: Width 320, Height 216, centered at (320, 335)
const envLeft = 160;
const envRight = 480;
const envTop = 224;
const envBottom = 440;
const envR = 26; // rounded corner radius

// V-Flap peak (apex pointing down)
const flapPeakX = 320;
const flapPeakY = 348; // crisp deep fold

function insideRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  if (x < x0 + r && y < y0 + r) return Math.hypot(x - (x0 + r), y - (y0 + r)) <= r;
  if (x > x1 - r && y < y0 + r) return Math.hypot(x - (x1 - r), y - (y0 + r)) <= r;
  if (x < x0 + r && y > y1 - r) return Math.hypot(x - (x0 + r), y - (y1 - r)) <= r;
  if (x > x1 - r && y > y1 - r) return Math.hypot(x - (x1 - r), y - (y1 - r)) <= r;
  return true;
}

// Check if (x, y) is inside the top V flap
function insideFlap(x, y) {
  if (x < envLeft || x > envRight || y < envTop || y > flapPeakY) return false;
  if (!insideRoundedRect(x, y, envLeft, envTop, envRight, envBottom, envR)) return false;

  // Left flap line: from (envLeft, envTop) to (flapPeakX, flapPeakY)
  // Right flap line: from (envRight, envTop) to (flapPeakX, flapPeakY)
  const lineY = x <= flapPeakX
    ? envTop + (x - envLeft) * ((flapPeakY - envTop) / (flapPeakX - envLeft))
    : envTop + (envRight - x) * ((flapPeakY - envTop) / (envRight - flapPeakX));

  return y <= lineY + 1.0;
}

// 5. Envelope Drop Shadow onto Purple Fur (Realistic 3D contact shadow)
console.log('Rendering 3D drop shadow of envelope...');
for (let y = envTop - 12; y < envBottom + 50; y++) {
  for (let x = envLeft - 12; x < envRight + 50; x++) {
    const sx = x - 12;
    const sy = y - 22;
    if (insideRoundedRect(sx, sy, envLeft, envTop, envRight, envBottom, envR)) {
      const idx = y * W + x;
      const shadowFactor = 0.32;
      bufR[idx] *= shadowFactor;
      bufG[idx] *= shadowFactor;
      bufB[idx] *= (shadowFactor + 0.10);
    }
  }
}

// 6. Base Envelope Body (Lower pouch) with tactile plush shading
console.log('Rendering envelope plush body...');
for (let y = envTop; y <= envBottom; y++) {
  for (let x = envLeft; x <= envRight; x++) {
    if (insideRoundedRect(x, y, envLeft, envTop, envRight, envBottom, envR)) {
      const idx = y * W + x;

      // Soft 3D dome volume
      const distBorder = Math.min(x - envLeft, envRight - x, y - envTop, envBottom - y);
      const puff = Math.min(1.0, distBorder / 24.0);

      const n = (fbm(x * 0.04, y * 0.04, 3) - 0.5) * 10;
      // White plush/ivory felt body
      let r = (235 + puff * 16) + n;
      let g = (238 + puff * 15) + n;
      let b = (248 + puff * 7) + n;

      bufR[idx] = Math.min(255, Math.max(0, r));
      bufG[idx] = Math.min(255, Math.max(0, g));
      bufB[idx] = Math.min(255, Math.max(0, b));
    }
  }
}

// 7. Render bottom fold diagonal lines (creases from bottom corners to center)
// This gives the classic tactile letter look
console.log('Rendering bottom fold crease seams...');
function drawFoldCrease(x1, y1, x2, y2) {
  const steps = 300;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = x1 * (1 - t) + x2 * t;
    const cy = y1 * (1 - t) + y2 * t;

    // Soft violet/slate shadow line
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const d = Math.hypot(dx, dy);
        if (d <= 3.2) {
          const a = (1.0 - d / 3.5) * 0.38;
          // Discord violet shadow crease #5865F2
          blendPixel(cx + dx, cy + dy, 120, 130, 205, a);
        }
      }
    }
    // Subtle top highlight
    blendPixel(cx, cy - 2, 255, 255, 255, 0.45);
  }
}

drawFoldCrease(envLeft + 14, envBottom - 14, 275, 365);
drawFoldCrease(envRight - 14, envBottom - 14, 365, 365);

// 8. 3D Cast Shadow of the Top V-Flap onto the Envelope Body!
// This is CRITICAL for depth: creates a deep, distinct shadow directly beneath the flap V!
console.log('Rendering dramatic 3D flap cast shadow...');
for (let y = envTop; y <= envBottom; y++) {
  for (let x = envLeft; x <= envRight; x++) {
    if (!insideRoundedRect(x, y, envLeft, envTop, envRight, envBottom, envR)) continue;
    if (insideFlap(x, y)) continue; // Don't shadow the flap itself

    // Check distance below flap edge
    const flapEdgeY = x <= flapPeakX
      ? envTop + (x - envLeft) * ((flapPeakY - envTop) / (flapPeakX - envLeft))
      : envTop + (envRight - x) * ((flapPeakY - envTop) / (envRight - flapPeakX));

    const dy = y - flapEdgeY;
    if (dy > 0 && dy < 28) {
      const idx = y * W + x;
      // Rich soft shadow factor (deep near edge, fades out)
      const shadowFactor = 0.58 + (dy / 28) * 0.42;
      bufR[idx] = bufR[idx] * shadowFactor;
      bufG[idx] = bufG[idx] * (shadowFactor * 0.98);
      bufB[idx] = Math.min(255, bufB[idx] * (shadowFactor * 1.05) + 12 * (1 - dy / 28));
    }
  }
}

// 9. Base Top Flap Surface (Crisp White Plush Pillow Volume)
console.log('Rendering top flap plush pillow...');
for (let y = envTop; y <= flapPeakY; y++) {
  for (let x = envLeft; x <= envRight; x++) {
    if (insideFlap(x, y)) {
      const idx = y * W + x;

      // Distance to flap border
      const flapEdgeY = x <= flapPeakX
        ? envTop + (x - envLeft) * ((flapPeakY - envTop) / (flapPeakX - envLeft))
        : envTop + (envRight - x) * ((flapPeakY - envTop) / (envRight - flapPeakX));

      const distEdge = Math.min(
        x - envLeft, envRight - x,
        y - envTop,
        flapEdgeY - y
      );
      const puff = Math.min(1.0, distEdge / 18.0);

      const n = (fbm(x * 0.04, y * 0.04, 3) - 0.5) * 8;
      // Pure bright white plush felt
      const light = 0.96 + ((flapPeakY - y) / (flapPeakY - envTop)) * 0.05;
      let r = Math.min(255, (246 + puff * 9) * light + n);
      let g = Math.min(255, (248 + puff * 7) * light + n);
      let b = Math.min(255, (255) * light + n);

      bufR[idx] = r;
      bufG[idx] = g;
      bufB[idx] = b;
    }
  }
}

// 10. White Plush Wool Micro-Fibers (Soft Felt Texture)
console.log('Rendering 60,000 delicate white plush wool fibers...');
for (let i = 0; i < 60000; i++) {
  const px = (envLeft - 6) + random() * ((envRight - envLeft) + 12);
  const py = (envTop - 6) + random() * ((envBottom - envTop) + 12);

  const inEnvelope = insideRoundedRect(px, py, envLeft, envTop, envRight, envBottom, envR);
  const isOuterFringe = !inEnvelope && insideRoundedRect(px, py, envLeft - 6, envTop - 6, envRight + 6, envBottom + 6, envR + 6);

  if (!inEnvelope && !isOuterFringe) continue;

  const inF = insideFlap(px, py);
  const angle = (fbm(px * 0.03, py * 0.03, 3) - 0.5) * Math.PI * 2.0;
  const length = isOuterFringe ? (5 + random() * 8) : (3 + random() * 5);
  const curl = (random() - 0.5) * 0.8;

  let fiberR = 255, fiberG = 255, fiberB = 255;
  if (!inF && inEnvelope) {
    fiberR = 240; fiberG = 242; fiberB = 250;
  }

  const steps = 4;
  for (let s = 0; s < steps; s++) {
    const t = s / steps;
    const wave = Math.sin(t * Math.PI) * 0.8;
    const curAngle = angle + curl * t;
    const sx = px + Math.cos(curAngle) * (length * t) + Math.cos(curAngle + Math.PI / 2) * wave;
    const sy = py + Math.sin(curAngle) * (length * t) + Math.sin(curAngle + Math.PI / 2) * wave;

    const a = (1.0 - t * 0.25) * 0.45;
    blendPixel(sx, sy, fiberR, fiberG, fiberB, a);
  }
}

// 11. High-Contrast Black / Dark Lines for Envelope (Четкие черные контуры и линии письма)
console.log('Rendering bold dark/black lines on envelope...');

function drawSmoothLine(x1, y1, x2, y2, width = 5.0, colR = 15, colG = 20, colB = 30, maxAlpha = 0.95) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.ceil(dist * 2.5);
  const radius = width / 2.0;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = x1 * (1 - t) + x2 * t;
    const cy = y1 * (1 - t) + y2 * t;

    const rCeil = Math.ceil(radius + 1.2);
    for (let dy = -rCeil; dy <= rCeil; dy++) {
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        const d = Math.hypot(dx, dy);
        if (d <= radius + 1.0) {
          const a = Math.max(0, Math.min(1.0, (radius + 1.0 - d) / 1.2)) * maxAlpha;
          blendPixel(cx + dx, cy + dy, colR, colG, colB, a);
        }
      }
    }
  }
}

function drawSmoothArc(cx, cy, r, startAngle, endAngle, width = 5.0, colR = 15, colG = 20, colB = 30, maxAlpha = 0.95) {
  const arcLen = Math.abs(endAngle - startAngle) * r;
  const steps = Math.ceil(arcLen * 2.5);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = startAngle * (1 - t) + endAngle * t;
    const px = cx + Math.cos(ang) * r;
    const py = cy + Math.sin(ang) * r;

    const radius = width / 2.0;
    const rCeil = Math.ceil(radius + 1.2);
    for (let dy = -rCeil; dy <= rCeil; dy++) {
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        const d = Math.hypot(dx, dy);
        if (d <= radius + 1.0) {
          const a = Math.max(0, Math.min(1.0, (radius + 1.0 - d) / 1.2)) * maxAlpha;
          blendPixel(px + dx, py + dy, colR, colG, colB, a);
        }
      }
    }
  }
}

// 11a. Outer black contour of the envelope (rounded rectangle)
const lineWidth = 5.2;
const darkR = 14, darkG = 16, darkB = 26; // Crisp deep black / dark slate
drawSmoothLine(envLeft + envR, envTop, envRight - envR, envTop, lineWidth, darkR, darkG, darkB, 0.95);
drawSmoothLine(envRight, envTop + envR, envRight, envBottom - envR, lineWidth, darkR, darkG, darkB, 0.95);
drawSmoothLine(envRight - envR, envBottom, envLeft + envR, envBottom, lineWidth, darkR, darkG, darkB, 0.95);
drawSmoothLine(envLeft, envBottom - envR, envLeft, envTop + envR, lineWidth, darkR, darkG, darkB, 0.95);

// 4 rounded corners
drawSmoothArc(envLeft + envR, envTop + envR, envR, Math.PI, Math.PI * 1.5, lineWidth, darkR, darkG, darkB, 0.95);
drawSmoothArc(envRight - envR, envTop + envR, envR, Math.PI * 1.5, Math.PI * 2.0, lineWidth, darkR, darkG, darkB, 0.95);
drawSmoothArc(envRight - envR, envBottom - envR, envR, 0, Math.PI * 0.5, lineWidth, darkR, darkG, darkB, 0.95);
drawSmoothArc(envLeft + envR, envBottom - envR, envR, Math.PI * 0.5, Math.PI, lineWidth, darkR, darkG, darkB, 0.95);

// 11b. Bottom diagonal fold lines (meeting near center)
drawSmoothLine(envLeft + 12, envBottom - 12, flapPeakX, flapPeakY, 4.2, darkR, darkG, darkB, 0.88);
drawSmoothLine(envRight - 12, envBottom - 12, flapPeakX, flapPeakY, 4.2, darkR, darkG, darkB, 0.88);

// 11c. Top V-Flap fold lines (bold, crisp black V descending from top corners to center)
drawSmoothLine(envLeft + 6, envTop + 4, flapPeakX, flapPeakY, 5.5, darkR, darkG, darkB, 0.98);
drawSmoothLine(envRight - 6, envTop + 4, flapPeakX, flapPeakY, 5.5, darkR, darkG, darkB, 0.98);

// Subtle highlight just above the flap line for a slight 3D embossed look
for (let t = 0; t <= 1; t += 0.005) {
  const lx = (envLeft + 14) * (1 - t) + flapPeakX * t;
  const ly = (envTop + 8) * (1 - t) + flapPeakY * t;
  const rx = (envRight - 14) * (1 - t) + flapPeakX * t;
  const ry = (envTop + 8) * (1 - t) + flapPeakY * t;
  blendPixel(lx, ly - 3, 255, 255, 255, 0.65);
  blendPixel(rx, ry - 3, 255, 255, 255, 0.65);
}


// 12. Write PPM file
console.log('Writing PPM image to /tmp/fluffy_avatar.ppm...');
const ppmHeader = Buffer.from(`P6\n${W} ${H}\n255\n`);
const ppmData = Buffer.alloc(W * H * 3);

for (let i = 0; i < W * H; i++) {
  ppmData[i * 3] = Math.min(255, Math.max(0, Math.round(bufR[i])));
  ppmData[i * 3 + 1] = Math.min(255, Math.max(0, Math.round(bufG[i])));
  ppmData[i * 3 + 2] = Math.min(255, Math.max(0, Math.round(bufB[i])));
}

const ppmPath = '/tmp/fluffy_avatar.ppm';
fs.writeFileSync(ppmPath, Buffer.concat([ppmHeader, ppmData]));

// 13. Convert using ffmpeg
console.log('Rendering pristine JPEG 640x640 and PNG 512x512...');
const outJpg = path.join(__dirname, '..', 'public', 'bot-avatar.jpg');
execSync(`ffmpeg -y -i ${ppmPath} -q:v 2 "${outJpg}"`);

const outPng = path.join(__dirname, '..', 'public', 'icon.png');
execSync(`ffmpeg -y -i ${ppmPath} -vf "scale=512:512" "${outPng}"`);

// Also copy to dist if dist exists
const distJpg = path.join(__dirname, '..', 'dist', 'bot-avatar.jpg');
if (fs.existsSync(path.dirname(distJpg))) fs.copyFileSync(outJpg, distJpg);
const distPng = path.join(__dirname, '..', 'dist', 'icon.png');
if (fs.existsSync(path.dirname(distPng))) fs.copyFileSync(outPng, distPng);

// Copy to android assets
const androidAssetJpg = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'web', 'bot-avatar.jpg');
if (fs.existsSync(path.dirname(androidAssetJpg))) fs.copyFileSync(outJpg, androidAssetJpg);

// Update icon.svg with high-res embedded PNG image
const pngBase64 = fs.readFileSync(outPng).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,${pngBase64}" width="512" height="512" />
</svg>`;
fs.writeFileSync(path.join(__dirname, '..', 'public', 'icon.svg'), svg);
if (fs.existsSync(path.join(__dirname, '..', 'dist'))) {
  fs.writeFileSync(path.join(__dirname, '..', 'dist', 'icon.svg'), svg);
}
const androidAssetSvg = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'web', 'icon.svg');
if (fs.existsSync(path.dirname(androidAssetSvg))) fs.writeFileSync(androidAssetSvg, svg);

// Update Android launcher mipmaps
console.log('Generating Android mipmaps...');
const mipmapBases = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];
for (const [folder, size] of mipmapBases) {
  const p = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', folder, 'ic_launcher.png');
  if (fs.existsSync(path.dirname(p))) {
    execSync(`ffmpeg -y -i "${outPng}" -vf "scale=${size}:${size}" "${p}" 2>/dev/null || true`);
  }
}

console.log('FINISHED! 3D fluffy plush icon successfully generated and synced.');
