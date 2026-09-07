const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

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
      const output = `images/optimized/${stem}.webp`;
      // Lossless, full-resolution conversion keeps lettering and transparency intact.
      await sharp(source).webp({ lossless: true, effort: 6 }).toFile(output);
      manifest[source] = { src: output, width: metadata.width, height: metadata.height };
    } else {
      const widths = [...new Set([400, 800, 1200].map(width => Math.min(width, metadata.width)))];
      const variants = [];
      for (const width of widths) {
        const output = `images/optimized/${stem}-${width}.webp`;
        await sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 85 }).toFile(output);
        const dimensions = await sharp(output).metadata();
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
