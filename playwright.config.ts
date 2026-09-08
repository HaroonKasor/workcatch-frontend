import { defineConfig, devices } from '@playwright/test'

/**
 * "Matches Figma" is only meaningful if the comparison conditions are fixed.
 * Everything below exists to remove a source of drift between runs and machines:
 * same viewports, same scale factor, same locale, same timezone, animations off.
 *
 * Playwright renders the REAL screen. The reference comes from Figma via
 * get_screenshot. The two are compared side by side, not by pixel equality —
 * a browser and a design tool will never rasterise text identically.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    deviceScaleFactor: 1,
    // Screenshots must not catch a transition mid-flight.
    launchOptions: { args: ['--force-prefers-reduced-motion'] },
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      // 390x844 is the reference mobile artboard in Figma.
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: false },
    },
  ],

  // Preview serves the production build, so what we screenshot is what ships.
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
