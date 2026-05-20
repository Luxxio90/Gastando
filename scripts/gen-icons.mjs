import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const svg = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.19)}" fill="#7c3aed"/>
  <text x="${size/2}" y="${Math.round(size * 0.73)}" text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${Math.round(size * 0.62)}" font-weight="900" fill="white">G</text>
</svg>`)

for (const size of [192, 512]) {
  await sharp(svg(size)).resize(size, size).png().toFile(join(__dirname, `../public/icon-${size}.png`))
  console.log(`icon-${size}.png ✓`)
}
