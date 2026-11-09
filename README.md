# Meråker Kunstforening

Dette er kildekoden til nettsiden for Meråker Kunstforening. Innholdet består av HTML, JavaScript og bilder som viser foreningens aktiviteter. Prosjektet er spesifikt for Meråker Kunstforening, men enkelte elementer kan gjenbrukes av andre som ønsker å lage en tilsvarende nettside for sin kunstforening.

---

# Meråker Art Association

This repository contains the website code for Meråker Kunstforening. It includes simple HTML, JavaScript and images used to showcase the association's activities. The project is tailored for Meråker Kunstforening, but parts of it may be helpful if you want to create a similar website for another art association.

## Development

Use Node.js 22.19 or newer and install the locked dependencies with `npm ci`.

The build stays on Tailwind CSS 3 and uses the locally installed PostCSS, Autoprefixer and cssnano. Installing cssnano explicitly avoids the older browser database bundled in Tailwind's fallback minifier.

- Edit page markup in `src/pages/*.html` and page metadata in `src/pages.json`.
- Edit the shared header, navigation, footer and gallery dialog in `src/layout.cjs`.
- Edit styles in `input.css`, color tokens in `tailwind.config.js`, and browser behavior in `main.js`.
- Run `npm run build` to generate responsive WebP images, the seven root HTML pages and minified `style.css`.
- Run `npm test` to validate HTML, accessibility markup, local asset references and preservation of existing page text, links and embeds.
- Run `npm run serve` for a local preview at `http://127.0.0.1:4173`. In another terminal, `npm run watch` rebuilds when source files change; reload the browser to see changes. Set `PORT` to use a different local port.

The root HTML files and `style.css` are generated, committed deployment files. Do not edit them directly: the next build overwrites them. `npm run build:pages` refreshes HTML without reprocessing images; use the full build after adding or changing pictures.

## Images and deployment

Original images stay in `images/` at their existing URLs. The build writes optimized versions and a manifest to `images/optimized/`. Optimized filenames include a hash of their contents, so changed pictures get new URLs and refresh browser caches. Existing optimized files are retained for cached HTML during staged uploads. Gallery links still open the full-size originals; thumbnails use responsive images. Logo WebP files are lossless and keep the original resolution and transparency. Social metadata continues to reference the original PNG logo.

Upload the seven generated root HTML pages, `main.js`, `style.css`, and the complete `images/` directory, including `images/optimized/`. No Node server, runtime dependencies, template files or `node_modules` are needed on the website host. Upload assets before HTML so new references are available when pages update.

Generated pages include content-based version queries for CSS and JavaScript so cached assets refresh when they change. The menu and logo script also accepts the previous HTML markup during a staged upload.

## Regression checks

CI rebuilds and tests the site, then rejects changes to tracked files or newly generated, uncommitted optimized images. Always commit the generated deployment files together with source changes.

The homepage Facebook plugin and organization metadata use the same `/p/` page address as the navigation and contact links. The plugin requests `tabs=timeline`; Facebook controls which posts are available to visitors. If only the page heading appears, check the page's public visibility and restrictions in Facebook as well as the plugin itself.

`tests/fixtures/original-pages.json` preserves the page text, content links and iframe destinations from before the implementation changes. Update the corresponding fixture deliberately when making an intentional content change later; do not regenerate it automatically during builds.

Before publishing, check the homepage and Heimlaga at 320, 390, 768, 1024 and 1280 pixels, including Facebook embed resizing. Check all navigation links, current-page indicators, keyboard menu opening and Escape closing, skip-link focus, logo hover, and gallery captions, original links, previous/next wraparound, Escape and focus restoration. Without JavaScript, the mobile menu stays visible and gallery links open the original images directly. Facebook and Google Maps remain third-party services and may be affected by network access or browser privacy settings.
