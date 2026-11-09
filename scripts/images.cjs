const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { createHash } = require('node:crypto');

async function writeImage(stem, buffer) {
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 12);
  const output = `images/optimized/${stem}-${hash}.webp`;
  await fs.writeFile(output, buffer);
  return output;
}

async function buildImages() {
  await fs.mkdir('images/optimized', { recursive: true });
  const manifest = {};
  const pages = await fs.readdir('src/pages');
  const markup = (await Promise.all(pages.map(file => fs.readFile(`src/pages/${file}`, 'utf8')))).join('\n');
  const sources = new Set([...markup.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(match => match[1]));
  sources.add('images/MeraakerLogoBlack.png');
  sources.add('images/MeraakerLogoGreen.png');
  for (const source of sources) {
    const metadata = await sharp(source).metadata();
    const stem = path.parse(source).name;
    if (stem.startsWith('MeraakerLogo')) {
      // Lossless, full-resolution conversion keeps lettering and transparency intact.
      const buffer = await sharp(source).webp({ lossless: true, effort: 6 }).toBuffer();
      const output = await writeImage(stem, buffer);
      manifest[source] = { src: output, width: metadata.width, height: metadata.height };
    } else {
      const widths = [...new Set([400, 800, 1200].map(width => Math.min(width, metadata.width)))];
      const variants = [];
      for (const width of widths) {
        const buffer = await sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
        const output = await writeImage(`${stem}-${width}`, buffer);
        const dimensions = await sharp(buffer).metadata();
        variants.push({ src: output, width: dimensions.width, height: dimensions.height });
      }
      const preferred = variants.find(item => item.width >= 800) || variants.at(-1);
      manifest[source] = { ...preferred, srcset: variants.map(item => `${item.src} ${item.width}w`).join(', ') };
    }
  }
  await fs.writeFile('images/optimized/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
module.exports = { buildImages };
if (require.main === module) buildImages().catch(error => { console.error(error); process.exitCode = 1; });
