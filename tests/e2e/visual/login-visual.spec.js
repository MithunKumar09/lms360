/**
 * Login Page Visual Regression Tests
 * 
 * Tests visual appearance of the login page
 */

import { test, expect } from '@playwright/test';

test.describe('Login Page Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('should match login page screenshot', async ({ page }) => {
    // Wait for login form to be visible
    const loginForm = page.locator('form, [data-testid="login-form"]').first();
    await loginForm.waitFor({ state: 'visible', timeout: 5000 });
    
    // Take screenshot of full page
    await expect(page).toHaveScreenshot('login-page-full.png', {
      fullPage: true,
    });
  });

  test('should match login form', async ({ page }) => {
    // Wait for login form
    const loginForm = page.locator('form, [data-testid="login-form"]').first();
    await loginForm.waitFor({ state: 'visible', timeout: 5000 });
    
    // Take screenshot of form
    await expect(loginForm).toHaveScreenshot('login-form.png');
  });

  test('should match login page on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await expect(page).toHaveScreenshot('login-page-mobile.png', {
      fullPage: true,
    });
  });

  test('should match error state', async ({ page }) => {
    // Trigger error state by submitting invalid form
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    // Fill with invalid data
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill('invalid@test.com');
    }
    if (await passwordInput.isVisible().catch(() => false)) {
      await passwordInput.fill('wrongpassword');
    }
    
    // Submit form
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(2000); // Wait for error message
    }
    
    // Take screenshot of error state
    await expect(page).toHaveScreenshot('login-page-error.png', {
      fullPage: true,
    });
  });
});
