const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { HtmlValidate } = require('html-validate');
const { createHash } = require('node:crypto');
const pages = require('../src/pages.json');
const original = require('./fixtures/original-pages.json');
const { layout, navigation } = require('../src/layout.cjs');
const assets = require('../images/optimized/manifest.json');
const validator = new HtmlValidate({
  extends: ['html-validate:recommended'],
  rules: {
    // These are formatting preferences, not validity or accessibility checks.
    'void-style': 'off',
    'no-inline-style': 'off',
    // Existing numeric year fragments are valid HTML5 and remain linkable.
    'valid-id': ['error', { relaxed: true }],
    // Initial focus belongs on the modal's close button, not the page background.
    'no-autofocus': 'off',
  },
});
const plainText = html => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replaceAll('&amp;', '&').replace(/\s+/g, ' ').trim();

for (const file of Object.keys(pages)) {
  const html = fs.readFileSync(file, 'utf8');
  test(`${file}: HTML and accessibility markup`, async () => {
    const result = await validator.validateString(html, file);
    assert.equal(result.valid, true, JSON.stringify(result.results.flatMap(item => item.messages), null, 2));
    assert.equal((html.match(/<main\b/g) || []).length, 1);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    for (const frame of html.matchAll(/<iframe\b[^>]+>/g)) assert.match(frame[0], /title="[^"]+"/);
  });
  test(`${file}: original wording, links and embeds preserved`, () => {
    const main = html.match(/<main\b[\s\S]*?<\/main>/)[0];
    assert.equal(plainText(main), original[file].text);
    const links = [...main.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(links, original[file].links);
    const embeds = [...main.matchAll(/<iframe\b[^>]*src="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(embeds, original[file].embeds);
    for (const [href] of navigation) assert.equal((html.match(new RegExp(`href="${href}"`, 'g')) || []).length, 2);
    const current = [...html.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g)];
    assert.equal(current.length, file === 'index.html' ? 1 : 2);
    for (const [tag] of current) assert.ok(tag.includes(`href="${file}"`));
  });
  test(`${file}: all local targets and responsive images exist`, () => {
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'Duplicate IDs');
    const refs = [...html.matchAll(/\b(?:src|href|data-default-src|data-hover-src)="([^"]+)"/g)].map(match => match[1]);
    for (const [, srcset] of html.matchAll(/\bsrcset="([^"]+)"/g)) refs.push(...srcset.split(',').map(item => item.trim().split(/\s+/)[0]));
    for (const ref of refs) {
      if (/^(?:https?:|data:|mailto:|tel:)/.test(ref)) continue;
      if (ref.startsWith('#')) { assert.ok(ids.includes(ref.slice(1)), `Missing fragment ${ref}`); continue; }
      assert.ok(fs.existsSync(path.resolve(ref.split(/[?#]/)[0])), `Missing ${ref}`);
    }
    for (const [tag] of html.matchAll(/<img\b[^>]+>/g)) {
      if (tag.includes('gallery-image')) continue; // Modal source is selected on interaction.
      assert.match(tag, /width="\d+"/);
      assert.match(tag, /height="\d+"/);
    }
  });
}

test('shared layout preserves page-specific metadata', () => {
  for (const [file, page] of Object.entries(pages)) {
    const html = layout(file, page, '<main></main>', assets);
    assert.ok(html.includes(`<title>${page.title}</title>`));
    assert.ok(html.includes(`rel="canonical" href="${page.url}"`));
    const structured = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1];
    assert.equal(JSON.parse(structured)['@type'], 'Organization');
  }
});

test('navigation and image links have a usable no-JavaScript fallback', () => {
  const html = fs.readFileSync('heimlaga.html', 'utf8');
  assert.match(html, /<div id="mobile-menu" class="mobile-menu">/);
  assert.match(html, /<button[^>]*class="mobile-menu-button" hidden/);
  assert.equal((html.match(/data-lightbox="gallery"/g) || []).length, 6);
  assert.doesNotMatch(html, /cdnjs|jquery|lightbox\.min/);
});

test('generated pages reference the current CSS and JavaScript versions', () => {
  for (const asset of ['main.js', 'style.css']) {
    const hash = createHash('sha256').update(fs.readFileSync(asset)).digest('hex').slice(0, 12);
    for (const file of Object.keys(pages)) assert.ok(fs.readFileSync(file, 'utf8').includes(`${asset}?v=${hash}`), `${file} has a stale ${asset} version; run npm run build`);
  }
});
