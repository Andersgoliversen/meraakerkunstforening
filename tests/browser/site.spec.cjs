const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const pages = require('../../src/pages.json');

// Keep iframe dimensions/src attributes, but give them inert contents. This also
// prevents lazy iframe navigations during resizing from contacting third parties.
async function mockEmbeds(route) {
  const request = route.request();
  const url = new URL(request.url());
  if (url.hostname !== '127.0.0.1') return route.abort();
  if (request.resourceType() === 'document' && (url.pathname === '/' || url.pathname.endsWith('.html'))) {
    const response = await route.fetch();
    const body = (await response.text()).replaceAll('<iframe ', '<iframe srcdoc="&lt;!doctype html&gt;&lt;title&gt;Embed test placeholder&lt;/title&gt;" ');
    return route.fulfill({ response, body });
  }
  return route.continue();
}

test.beforeEach(async ({ context }) => { await context.route('**/*', mockEmbeds); });

for (const file of Object.keys(pages)) {
  for (const width of [320, 390, 768, 1024, 1280]) {
    test(`${file} at ${width}px`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${file}`);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.mobile-menu-button')).toBeVisible({ visible: width < 1024 });
      await expect(page.locator('.desktop-menu')).toBeVisible({ visible: width >= 1024 });
      await expect(page.locator('.mobile-menu')).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      for (const frame of await page.locator('[data-facebook-embed]').all()) {
        await expect.poll(async () => new URL(await frame.getAttribute('src')).searchParams.get('width'))
          .toBe(String(Math.floor((await frame.boundingBox()).width)));
      }
      if (file === 'heimlaga.html') {
        await expect(page.locator('[data-lightbox]')).toHaveCount(6);
        const columns = await page.locator('.grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
        expect(columns).toBe(width < 768 ? 1 : 3);
      }
      expect(errors).toEqual([]);
      // Optional migration evidence, recorded before and after with the same browser/OS.
      if (process.env.LAYOUT_REPORT_DIR) {
        const report = await page.locator('nav, nav img, nav hr, .desktop-menu, .mobile-menu-button, main, main h1, main h2, main h3, main p, main img, main iframe, main .grid, footer').evaluateAll(elements =>
          elements.map(el => {
            const rect = el.getBoundingClientRect();
            const css = getComputedStyle(el);
            return { tag: el.tagName, x: rect.x, y: rect.y, width: rect.width, height: rect.height,
              fontSize: css.fontSize, lineHeight: css.lineHeight, fontFamily: css.fontFamily,
              color: css.color, borderRadius: css.borderRadius };
          }));
        fs.mkdirSync(process.env.LAYOUT_REPORT_DIR, { recursive: true });
        fs.writeFileSync(path.join(process.env.LAYOUT_REPORT_DIR, `${file}-${width}.json`), JSON.stringify(report, null, 2));
        if (['index.html', 'heimlaga.html'].includes(file) && [390, 1280].includes(width)) {
          await page.screenshot({ path: path.join(process.env.LAYOUT_REPORT_DIR, `${file}-${width}.png`), fullPage: true });
        }
      }
    });
  }
}

test('mobile menu, keyboard focus, logo and breakpoint changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const button = page.locator('.mobile-menu-button');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.mobile-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(button).toBeFocused();
  await expect(page.locator('.mobile-menu')).toBeHidden();
  await button.click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('.desktop-menu')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.locator('.mobile-menu')).toBeHidden();
  const logo = page.locator('#navLogo');
  await page.locator('.logo-link').hover();
  await expect(logo).toHaveAttribute('src', await logo.getAttribute('data-hover-src'));
  await page.locator('h1').hover();
  await expect(logo).toHaveAttribute('src', await logo.getAttribute('data-default-src'));
  await button.click();
  await page.locator('.mobile-menu a[href="kontakt.html"]').click();
  await expect(page).toHaveURL(/kontakt\.html$/);
});

for (const width of [390, 1280]) {
  test(`gallery navigation, keyboard and focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/heimlaga.html');
    const opener = page.locator('[data-lightbox]').first();
    const dialog = page.locator('#gallery-dialog');
    await opener.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('img')).toBeVisible();
    await expect(page.locator('.gallery-close')).toBeFocused();
    await expect(page.locator('#gallery-caption')).toHaveText('Heimlaga armbånd');
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('.gallery-next')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('.gallery-close')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#gallery-count')).toHaveText('Bilde 6 av 6');
    await page.locator('.gallery-next').click();
    await expect(page.locator('#gallery-count')).toHaveText('Bilde 1 av 6');
    await expect(page.locator('.gallery-original')).toHaveAttribute('href', /Heimlaga_armbaand\.jpg$/);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(page.locator('body')).not.toHaveClass(/gallery-open/);
    await opener.click();
    await page.locator('.gallery-close').click();
    await expect(dialog).toBeHidden();
  });
}

test('navigation and originals remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  await context.route('**/*', mockEmbeds);
  await page.goto('/heimlaga.html');
  await expect(page.locator('.mobile-menu')).toBeVisible();
  await expect(page.locator('.mobile-menu-button')).toBeHidden();
  await page.locator('[data-lightbox]').first().click();
  await expect(page).toHaveURL(/Heimlaga_armbaand\.jpg$/);
  await context.close();
});

test('reduced motion disables hover scaling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/heimlaga.html');
  const image = page.locator('[data-lightbox] img').first();
  await image.hover();
  const motion = await image.evaluate(el => {
    const css = getComputedStyle(el);
    return { transform: css.transform, scale: css.scale, transition: css.transitionDuration };
  });
  expect(motion).toEqual({ transform: 'none', scale: 'none', transition: '0s' });
});

test('touch menu and gallery controls', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 900 } });
  await context.route('**/*', mockEmbeds);
  const page = await context.newPage();
  await page.goto('/heimlaga.html');
  await page.locator('.mobile-menu-button').tap();
  await expect(page.locator('.mobile-menu')).toBeVisible();
  await page.locator('.mobile-menu-button').tap();
  await page.locator('[data-lightbox]').first().tap();
  await expect(page.locator('#gallery-dialog')).toBeVisible();
  await page.locator('.gallery-next').tap();
  await expect(page.locator('#gallery-count')).toHaveText('Bilde 2 av 6');
  await page.locator('.gallery-close').tap();
  await expect(page.locator('#gallery-dialog')).toBeHidden();
  await context.close();
});
