/**
 * Playwright Test Helpers
 * 
 * Reusable utilities for E2E tests:
 * - Authentication helpers
 * - Navigation helpers
 * - Form interaction helpers
 * - API response helpers
 * - Screenshot helpers
 */

/**
 * Authenticate a user by logging in
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} [expectedRedirect] - Expected redirect URL after login
 * @returns {Promise<void>}
 */
export async function authenticateUser(page, email, password, expectedRedirect = null) {
  // Navigate to login page
  await page.goto('/login');
  
  // Wait for login form to be visible
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
  
  // Fill in email
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.fill(email);
  
  // Fill in password
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  await passwordInput.fill(password);
  
  // Submit form
  const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
  await submitButton.click();
  
  // Wait for navigation or success indicator
  if (expectedRedirect) {
    await page.waitForURL(expectedRedirect, { timeout: 10000 });
  } else {
    // Wait for redirect to dashboard or any navigation
    await page.waitForURL(/\/dashboards\/|\/login/, { timeout: 10000 });
  }
}

/**
 * Wait for navigation to a specific URL pattern
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string|RegExp} urlPattern - URL or pattern to wait for
 * @param {number} [timeout=10000] - Timeout in milliseconds
 * @returns {Promise<void>}
 */
export async function waitForNavigation(page, urlPattern, timeout = 10000) {
  await page.waitForURL(urlPattern, { timeout });
}

/**
 * Fill a form field by selector
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - Field selector
 * @param {string} value - Value to fill
 * @returns {Promise<void>}
 */
export async function fillFormField(page, selector, value) {
  const field = page.locator(selector).first();
  await field.waitFor({ state: 'visible', timeout: 5000 });
  await field.fill(value);
}

/**
 * Click an element and wait for navigation or response
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @param {object} [options] - Click options
 * @returns {Promise<void>}
 */
export async function clickAndWait(page, selector, options = {}) {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible', timeout: 5000 });
  
  // If expecting navigation, wait for it
  if (options.waitForNavigation) {
    await Promise.all([
      page.waitForNavigation({ timeout: options.navigationTimeout || 10000 }),
      element.click(),
    ]);
  } else {
    await element.click();
    // Small delay to allow any async operations
    await page.waitForTimeout(500);
  }
}

/**
 * Take a screenshot with a descriptive name
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} name - Screenshot name
 * @returns {Promise<void>}
 */
export async function takeScreenshot(page, name) {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

/**
 * Wait for an API response matching a pattern
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string|RegExp} urlPattern - URL pattern to match
 * @param {number} [timeout=10000] - Timeout in milliseconds
 * @returns {Promise<import('@playwright/test').Response>}
 */
export async function waitForApiResponse(page, urlPattern, timeout = 10000) {
  const response = await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
  return response;
}

/**
 * Wait for element to be visible and stable
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @param {number} [timeout=5000] - Timeout in milliseconds
 * @returns {Promise<void>}
 */
export async function waitForElement(page, selector, timeout = 5000) {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible', timeout });
}

/**
 * Check if element is visible
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @returns {Promise<boolean>}
 */
export async function isElementVisible(page, selector) {
  const element = page.locator(selector).first();
  return await element.isVisible().catch(() => false);
}

/**
 * Get text content of an element
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @returns {Promise<string>}
 */
export async function getElementText(page, selector) {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible', timeout: 5000 });
  return await element.textContent();
}

/**
 * Clear browser storage (cookies, localStorage, sessionStorage)
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function clearBrowserStorage(page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
