/**
 * Dashboard Visual Regression Tests
 * 
 * Tests visual appearance of dashboard pages
 */

import { test, expect } from '@playwright/test';
import { authenticateUser, clearBrowserStorage } from '../../setup/playwright-helpers.js';

test.describe('Dashboard Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Clear browser storage
    await clearBrowserStorage(page);
  });

  test('should match student dashboard screenshot', async ({ page }) => {
    // Note: Requires authentication
    const testEmail = process.env.TEST_USER_EMAIL || 'student@test.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    // Authenticate
    await authenticateUser(page, testEmail, testPassword);
    await page.waitForTimeout(2000);
    
    // Navigate to dashboard
    await page.goto('/dashboards/student-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for content to load
    
    // Take screenshot
    await expect(page).toHaveScreenshot('student-dashboard-full.png', {
      fullPage: true,
    });
  });

  test('should match dashboard on mobile', async ({ page }) => {
    // Note: Requires authentication
    const testEmail = process.env.TEST_USER_EMAIL || 'student@test.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    // Set mobile viewport first
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Authenticate
    await authenticateUser(page, testEmail, testPassword);
    await page.waitForTimeout(2000);
    
    // Navigate to dashboard
    await page.goto('/dashboards/student-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await expect(page).toHaveScreenshot('student-dashboard-mobile.png', {
      fullPage: true,
    });
  });
});
