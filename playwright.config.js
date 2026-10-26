import { defineConfig, devices } from '@playwright/test';
const gl = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
export default defineConfig({
  testDir: 'e2e', timeout: 240000, retries: 0, workers: 1,
  use: { baseURL: 'http://localhost:4173/', storageState: 'e2e/no-dm.json', actionTimeout: 15000, launchOptions: { args: gl } },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'iphone', use: { ...devices['iPhone 14 Pro'], browserName: 'chromium', launchOptions: { args: gl } } },
    { name: 'iphone-landscape', use: { ...devices['iPhone 14 Pro landscape'], browserName: 'chromium', launchOptions: { args: gl } } },
    { name: 'ipad-portrait', testMatch: /(smoke|appstore|text|caption|taps|dm|levelup-layout|chest|campheal)\.spec/, use: { browserName: 'chromium', viewport: { width: 1024, height: 1366 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, launchOptions: { args: gl } } },
    { name: 'ipad-landscape', testMatch: /(smoke|appstore|text|caption|taps|dm|levelup-layout|chest|campheal)\.spec/, use: { browserName: 'chromium', viewport: { width: 1366, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, launchOptions: { args: gl } } },
  ],
});
