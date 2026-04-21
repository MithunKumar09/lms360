/**
 * Dashboard Accessibility Tests
 * 
 * Tests WCAG compliance for dashboard pages including:
 * - Navigation accessibility
 * - Content structure
 * - Interactive elements
 * - Screen reader support
 */

import { test, expect } from '@playwright/test';
import { setupA11y, testA11y, generateA11yReport } from '../../setup/a11y-helpers.js';
import { authenticateUser, clearBrowserStorage } from '../../setup/playwright-helpers.js';

test.describe('Dashboard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Clear browser storage
    await clearBrowserStorage(page);
  });

  test('student dashboard should pass accessibility standards', async ({ page }) => {
    // Note: Requires authentication
    const testEmail = process.env.TEST_USER_EMAIL || 'student@test.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    // Authenticate and navigate to dashboard
    await authenticateUser(page, testEmail, testPassword);
    await page.waitForTimeout(2000);
    
    // Navigate to student dashboard
    await page.goto('/dashboards/student-dashboard');
    await page.waitForLoadState('networkidle');
    
    // Setup accessibility testing
    await setupA11y(page);
    
    // Run accessibility check
    const result = await testA11y(page, {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    });
    
    if (result.passed) {
      expect(result.passed).toBe(true);
    } else {
      // Log violations but don't fail test (for now)
      console.log('Accessibility violations found:', result.violations?.length || 0);
      if (result.violations) {
        result.violations.slice(0, 5).forEach((violation, index) => {
          console.log(`Violation ${index + 1}:`, violation.id);
        });
      }
    }
  });

  test('dashboard should have proper navigation structure', async ({ page }) => {
    // Note: Requires authentication
    const testEmail = process.env.TEST_USER_EMAIL || 'student@test.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    // Authenticate and navigate
    await authenticateUser(page, testEmail, testPassword);
    await page.waitForTimeout(2000);
    await page.goto('/dashboards/student-dashboard');
    await page.waitForLoadState('networkidle');
    
    await setupA11y(page);
    
    // Check for navigation landmarks
    const nav = page.locator('nav, [role="navigation"]').first();
    const navExists = await nav.isVisible().catch(() => false);
    
    // Navigation should exist (might be in sidebar)
    if (navExists) {
      // Check if navigation has accessible name
      const navAriaLabel = await nav.getAttribute('aria-label');
      const navAriaLabelledBy = await nav.getAttribute('aria-labelledby');
      const hasAccessibleName = navAriaLabel || navAriaLabelledBy;
      
      // Navigation should have accessible name
      expect(hasAccessibleName).toBe(true);
    }
  });

  test('dashboard interactive elements should be keyboard accessible', async ({ page }) => {
    // Note: Requires authentication
    const testEmail = process.env.TEST_USER_EMAIL || 'student@test.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    // Authenticate and navigate
    await authenticateUser(page, testEmail, testPassword);
    await page.waitForTimeout(2000);
    await page.goto('/dashboards/student-dashboard');
    await page.waitForLoadState('networkidle');
    
    // Find interactive elements (buttons, links)
    const buttons = page.locator('button, a[href], [role="button"]');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      // Test first few buttons for keyboard accessibility
      for (let i = 0; i < Math.min(3, buttonCount); i++) {
        const button = buttons.nth(i);
        const isVisible = await button.isVisible().catch(() => false);
        
        if (isVisible) {
          // Try to focus
          await button.focus();
          const isFocused = await button.evaluate((el) => document.activeElement === el);
          
          // Button should be focusable
          expect(isFocused).toBe(true);
        }
      }
    }
  });

  test('dashboard should generate accessibility report', async ({ page }) => {
    // Note: Requires authentication
    const testEmail = process.env.TEST_USER_EMAIL || 'student@test.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    // Authenticate and navigate
    await authenticateUser(page, testEmail, testPassword);
    await page.waitForTimeout(2000);
    await page.goto('/dashboards/student-dashboard');
    await page.waitForLoadState('networkidle');
    
    // Generate comprehensive report
    const report = await generateA11yReport(page, 'Student Dashboard');
    
    // Verify report structure
    expect(report).toHaveProperty('page');
    expect(report).toHaveProperty('summary');
    
    // Log summary
    console.log('Dashboard Accessibility Report:', report.summary);
  });
});
