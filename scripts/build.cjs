const fs = require('node:fs/promises');
const { layout } = require('../src/layout.cjs');
const { buildImages } = require('./images.cjs');

async function renderPages(assets) {
  const pages = JSON.parse(await fs.readFile('src/pages.json', 'utf8'));
  for (const [file, page] of Object.entries(pages)) {
    let content = await fs.readFile(`src/pages/${file}`, 'utf8');
    content = content.replace(/<img\b[^>]+>/g, tag => {
      const source = tag.match(/src="([^"]+)"/)[1];
      const asset = assets[source];
      if (!asset) throw new Error(`No optimized asset for ${source}`);
      const sizes = file === 'heimlaga.html' ? '(min-width: 1280px) 405px, (min-width: 768px) calc((100vw - 64px) / 3), calc(100vw - 32px)' : '(min-width: 1280px) 624px, (min-width: 768px) calc((100vw - 32px) / 2), calc(100vw - 32px)';
      return tag.replace(`src="${source}"`, `src="${asset.src}" width="${asset.width}" height="${asset.height}" srcset="${asset.srcset}" sizes="${sizes}"`);
    });
    await fs.writeFile(file, layout(file, page, content, assets));
  }
  console.log(`Generated ${Object.keys(pages).length} static pages.`);
}
async function build() {
  const assets = process.argv.includes('--pages-only') ? JSON.parse(await fs.readFile('images/optimized/manifest.json', 'utf8')) : await buildImages();
  await renderPages(assets);
}
module.exports = { renderPages };
if (require.main === module) build().catch(error => { console.error(error); process.exitCode = 1; });
