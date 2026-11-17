const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure', timezoneId: 'America/Sao_Paulo' },
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [{ name: 'desktop', use: { ...devices['Desktop Edge'], channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' } }, { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' } }],
  webServer: [
    { command: 'node --env-file=.env.test src/server.js', cwd: './apps/api', url: 'http://127.0.0.1:3001/api/health', reuseExistingServer: false },
    { command: 'npm run dev -w apps/web -- --host localhost --port 5173 --strictPort', env: { API_PROXY_TARGET: 'http://127.0.0.1:3001' }, url: 'http://localhost:5173', reuseExistingServer: false }
  ]
});
