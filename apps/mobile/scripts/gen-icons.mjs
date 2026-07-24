// Regenerate app icons from SVG with proper transparency (sharp).
// Run: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/images');

const GRAD = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5B54F0"/>
      <stop offset="1" stop-color="#3B32C8"/>
    </linearGradient>
  </defs>`;

// The rupee mark + community ring + mint member dot, drawn in `color`.
// `scale` shrinks it toward the centre so adaptive-icon cropping is safe.
function mark(color, scale = 1, ringOpacity = 0.18) {
  const t = (1 - scale) * 512;
  return `
    <g transform="translate(${t} ${t}) scale(${scale})">
      <circle cx="512" cy="512" r="340" fill="none" stroke="${color}" stroke-opacity="${ringOpacity}" stroke-width="34"/>
      <circle cx="512" cy="172" r="46" fill="#B9F6CA"/>
      <text x="512" y="700" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="520" fill="${color}">&#8377;</text>
    </g>`;
}

// Full coloured icon: indigo gradient square + white mark (opaque).
const fullIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${GRAD}
  <rect width="1024" height="1024" rx="224" fill="url(#bg)"/>
  ${mark('#FFFFFF')}
</svg>`;

// Adaptive foreground: white mark on TRANSPARENT bg, pulled into the safe
// zone (~62%). Android draws the indigo backgroundColor behind it.
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${mark('#FFFFFF', 0.62, 0.3)}
</svg>`;

// Monochrome (themed icons): solid black mark on transparent, Android tints it.
const monochrome = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${mark('#000000', 0.62, 0.35)}
</svg>`;

// Splash: white mark on transparent (shown on the indigo splash background).
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${mark('#FFFFFF', 0.9, 0.28)}
</svg>`;

async function render(svg, file, size = 1024) {
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size)
    .png()
    .toFile(resolve(dir, file));
  console.log('✓', file);
}

await render(fullIcon, 'icon.png');
await render(foreground, 'android-icon-foreground.png');
await render(monochrome, 'android-icon-monochrome.png');
await render(splash, 'splash-icon.png');
await render(fullIcon, 'favicon.png', 96);
console.log('Done.');
