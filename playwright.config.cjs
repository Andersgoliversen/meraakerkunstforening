const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:4187', browserName: 'chromium', channel: 'chromium', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/serve.cjs',
    url: 'http://127.0.0.1:4187',
    env: { PORT: '4187' },
    timeout: 15000,
  },
});
