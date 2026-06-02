const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Colors: sunrise glow gradient
const GRADIENT_START = '#FF6B35';  // orange glow
const GRADIENT_MID = '#FFD23F';    // yellow sun
const GRADIENT_END = '#FF6B9D';    // pink glow

function createSVG(width, height, text, fontSize, isSplash = false) {
  const cx = width / 2;
  const cy = height / 2;

  // For splash, text is higher; for icon, centered
  const textY = isSplash ? cy - 100 : cy + (fontSize * 0.35);

  // Larger glow for splash
  const glowRadius = isSplash ? 180 : 120;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${GRADIENT_START}"/>
        <stop offset="50%" stop-color="${GRADIENT_MID}"/>
        <stop offset="100%" stop-color="${GRADIENT_END}"/>
      </linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="40" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="${cx}" cy="${isSplash ? textY - 80 : cy}" r="${glowRadius}" fill="#FFFFFF" opacity="0.25" filter="url(#glow)"/>
    <text x="${cx}" y="${textY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="${fontSize}" fill="#FFFFFF" letter-spacing="-4">
      ${text}
    </text>
  </svg>`;
}

async function generate() {
  const dirs = [
    'mobile/consumer/assets',
    'mobile/provider/assets',
    'public',
  ];

  dirs.forEach(d => {
    const dir = path.resolve(__dirname, '..', d);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const sizes = {
    'mobile/consumer/assets/icon.png': { w: 1024, h: 1024, font: 340 },
    'mobile/consumer/assets/adaptive-icon.png': { w: 1024, h: 1024, font: 340 },
    'mobile/consumer/assets/splash.png': { w: 1242, h: 2436, font: 500, splash: true },
    'mobile/consumer/assets/notification-icon.png': { w: 96, h: 96, font: 32 },
    'mobile/provider/assets/icon.png': { w: 1024, h: 1024, font: 340 },
    'mobile/provider/assets/adaptive-icon.png': { w: 1024, h: 1024, font: 340 },
    'mobile/provider/assets/splash.png': { w: 1242, h: 2436, font: 500, splash: true },
    'mobile/provider/assets/notification-icon.png': { w: 96, h: 96, font: 32 },
    'public/favicon-32x32.png': { w: 32, h: 32, font: 10 },
    'public/favicon-16x16.png': { w: 16, h: 16, font: 5 },
    'public/apple-touch-icon.png': { w: 180, h: 180, font: 60 },
  };

  for (const [file, { w, h, font, splash }] of Object.entries(sizes)) {
    const svg = createSVG(w, h, 'Xbi', font, !!splash);
    const out = path.resolve(__dirname, '..', file);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(out);
    console.log(`Generated ${file}`);
  }

  // Simple favicon.ico (just copy 32x32 for now, or generate multi-res)
  const ico32 = path.resolve(__dirname, '..', 'public/favicon-32x32.png');
  const icoOut = path.resolve(__dirname, '..', 'public/favicon.ico');
  await sharp(ico32).toFile(icoOut);
  console.log('Generated public/favicon.ico');

  console.log('\nAll icons generated successfully!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
