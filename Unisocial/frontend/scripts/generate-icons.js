/**
 * PWA 아이콘 생성 스크립트
 * 사용법: node scripts/generate-icons.js
 *
 * 이 스크립트는 canvas를 사용하여 각 크기의 PNG 아이콘을 생성합니다.
 * sharp 또는 canvas 패키지가 없으면 SVG 아이콘을 각 크기로 복사합니다.
 *
 * 프로덕션 배포 전에 실제 디자인된 아이콘으로 교체하는 것을 권장합니다.
 */

const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, "..", "public", "icons");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function generateSvgIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.188)}" fill="url(#bg)"/>
  <text x="${size / 2}" y="${size * 0.665}" font-family="Arial,sans-serif" font-size="${Math.round(size * 0.547)}" font-weight="bold" fill="white" text-anchor="middle">U</text>
</svg>`;
}

// SVG를 PNG로 변환 시도 (sharp가 있으면)
async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.log("sharp not installed. Generating SVG icons as fallback.");
    console.log("For PNG icons, run: npm install sharp && node scripts/generate-icons.js");
  }

  for (const size of sizes) {
    const svg = generateSvgIcon(size);
    const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    if (sharp) {
      await sharp(Buffer.from(svg)).png().toFile(pngPath);
      console.log(`Generated: icon-${size}x${size}.png`);
    } else {
      // SVG fallback
      const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
      fs.writeFileSync(svgPath, svg);
      console.log(`Generated SVG: icon-${size}x${size}.svg`);
    }
  }

  // 스크린샷 placeholder
  const wideSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
    <rect width="1280" height="720" fill="#0f172a"/>
    <text x="640" y="340" font-family="Arial,sans-serif" font-size="48" fill="#6366f1" text-anchor="middle">UniSocial Dashboard</text>
    <text x="640" y="400" font-family="Arial,sans-serif" font-size="24" fill="#94a3b8" text-anchor="middle">13 Platforms, One Dashboard</text>
  </svg>`;

  const narrowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844">
    <rect width="390" height="844" fill="#0f172a"/>
    <text x="195" y="400" font-family="Arial,sans-serif" font-size="32" fill="#6366f1" text-anchor="middle">UniSocial</text>
    <text x="195" y="440" font-family="Arial,sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">13 Platforms, One Dashboard</text>
  </svg>`;

  if (sharp) {
    await sharp(Buffer.from(wideSvg)).png().toFile(path.join(iconsDir, "screenshot-wide.png"));
    await sharp(Buffer.from(narrowSvg)).png().toFile(path.join(iconsDir, "screenshot-narrow.png"));
    console.log("Generated screenshots");
  }

  console.log("Done!");
}

main().catch(console.error);
