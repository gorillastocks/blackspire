import { defineConfig, devices } from '@playwright/test';
const gl = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
export default defineConfig({
  testDir: 'e2e', timeout: 240000, retries: 0, workers: 1,
  use: { baseURL: 'http://localhost:4173/', storageState: 'e2e/no-dm.json', actionTimeout: 15000, launchOptions: { args: gl } },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'iphone', use: { ...devices['iPhone 14 Pro'], browserName: 'chromium', launchOptions: { args: gl } } },
    { name: 'webkit-iphone', testMatch: /ios-voice\.spec/, use: { ...devices['iPhone 14 Pro'], browserName: 'webkit' } },
    { name: 'iphone-landscape', use: { ...devices['iPhone 14 Pro landscape'], browserName: 'chromium', launchOptions: { args: gl } } },
    { name: 'iphone-std', testMatch: /\/(layout|quests|tidy|narrator|journal|tavern)\.spec/, use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, launchOptions: { args: gl } } },
    { name: 'iphone-promax', testMatch: /\/(layout|quests|tidy|narrator|journal|tavern)\.spec/, use: { browserName: 'chromium', viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, launchOptions: { args: gl } } },
    { name: 'fold-portrait', testMatch: /\/(layout|quests|tidy|narrator|journal|tavern)\.spec/, use: { browserName: 'chromium', viewport: { width: 674, height: 841 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, launchOptions: { args: gl } } },
    { name: 'fold-landscape', testMatch: /\/(layout|quests|tidy|narrator|journal|tavern)\.spec/, use: { browserName: 'chromium', viewport: { width: 841, height: 674 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, launchOptions: { args: gl } } },
    { name: 'ipad-portrait', testMatch: /(narrator|journal|tavern|quests|tidy|phaseE|phaseD|monster-attack-portrait|smoke|appstore|text|caption|taps|dm|levelup-layout|chest|campheal|fx|navrows|partyfit|portraits|ranks|bigmonsters|bossvisible|autobattle)\.spec/, use: { browserName: 'chromium', viewport: { width: 1024, height: 1366 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, launchOptions: { args: gl } } },
    { name: 'ipad-landscape', testMatch: /(narrator|journal|tavern|quests|tidy|phaseE|phaseD|monster-attack-portrait|smoke|appstore|text|caption|taps|dm|levelup-layout|chest|campheal|fx|navrows|partyfit|portraits|ranks|bigmonsters|bossvisible|autobattle)\.spec/, use: { browserName: 'chromium', viewport: { width: 1366, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, launchOptions: { args: gl } } },
  ],
});
