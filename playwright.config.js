import { defineConfig, devices } from '@playwright/test';
const gl = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
export default defineConfig({
  testDir: 'e2e', timeout: 180000, retries: 0, workers: 1,
  use: { baseURL: 'http://localhost:4173/', launchOptions: { args: gl } },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'iphone', use: { ...devices['iPhone 14 Pro'], browserName: 'chromium', launchOptions: { args: gl } } },
    { name: 'iphone-landscape', use: { ...devices['iPhone 14 Pro landscape'], browserName: 'chromium', launchOptions: { args: gl } } },
  ],
});
