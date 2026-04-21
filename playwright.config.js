import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Next.js E2E Testing
 * 
 * Features:
 * - Multi-browser support (Chromium, Firefox, WebKit)
 * - Auto-start Next.js dev server
 * - Screenshots on failure
 * - Video recording on retry
 * - Trace on first retry
 * - HTML reports
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html'],
    ['list'],
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on retry
    video: 'retain-on-failure',
    
    // Action timeout
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Visual comparison configuration
  expect: {
    // Threshold for visual comparison (0-1, where 0 is exact match)
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixels: 100,
    },
    // Threshold for snapshot comparison
    toMatchSnapshot: {
      threshold: 0.2,
    },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  
  // Global setup/teardown (optional, can add later)
  // globalSetup: require.resolve('./tests/setup/global-setup.js'),
  // globalTeardown: require.resolve('./tests/setup/global-teardown.js'),
});
