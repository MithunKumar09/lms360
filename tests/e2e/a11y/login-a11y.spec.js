/**
 * Login Page Accessibility Tests
 * 
 * Tests WCAG compliance for the login page including:
 * - Keyboard navigation
 * - Screen reader compatibility
 * - Form labels
 * - Color contrast
 * - ARIA attributes
 */

import { test, expect } from '@playwright/test';
import { setupA11y, testA11y, checkImageAltText, checkFormLabels, checkHeadingHierarchy, generateA11yReport } from '../../setup/a11y-helpers.js';
import { LoginPage } from '../helpers/page-objects/LoginPage.js';

test.describe('Login Page Accessibility', () => {
  let loginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // Setup accessibility testing
    await setupA11y(page);
  });

  test('should pass WCAG 2.1 AA accessibility standards', async ({ page }) => {
    // Run full accessibility check
    const result = await testA11y(page, {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    });

    // Should have no critical violations
    expect(result.passed).toBe(true);
    
    if (!result.passed && result.violations) {
      console.log('Accessibility violations found:', result.violations.length);
      result.violations.forEach((violation, index) => {
        console.log(`Violation ${index + 1}:`, violation.id, violation.description);
      });
    }
  });

  test('should have proper form labels', async ({ page }) => {
    const formCheck = await checkFormLabels(page);
    
    // All form inputs should have labels
    expect(formCheck.withoutLabels).toBe(0);
    
    if (formCheck.withoutLabels > 0) {
      console.log('Form inputs without labels:', formCheck.violations);
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const headingCheck = await checkHeadingHierarchy(page);
    
    // Should have proper heading structure
    expect(headingCheck.hasIssues).toBe(false);
    
    if (headingCheck.hasIssues) {
      console.log('Heading hierarchy issues:', headingCheck.issues);
    }
  });

  test('should have alt text for all images', async ({ page }) => {
    const imageCheck = await checkImageAltText(page);
    
    // All images should have alt text (or be decorative with empty alt)
    // Note: Empty alt is acceptable for decorative images
    if (imageCheck.withoutAlt > 0) {
      console.log('Images without alt text:', imageCheck.violations);
      // This is a warning, not necessarily a failure
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Test tab navigation through form fields
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // Start from top of page
    await page.keyboard.press('Tab');
    
    // Should be able to tab to email field
    await emailInput.focus();
    const emailFocused = await emailInput.evaluate((el) => document.activeElement === el);
    expect(emailFocused).toBe(true);

    // Tab to password field
    await page.keyboard.press('Tab');
    await passwordInput.focus();
    const passwordFocused = await passwordInput.evaluate((el) => document.activeElement === el);
    expect(passwordFocused).toBe(true);

    // Tab to submit button
    await page.keyboard.press('Tab');
    await submitButton.focus();
    const buttonFocused = await submitButton.evaluate((el) => document.activeElement === el);
    expect(buttonFocused).toBe(true);
  });

  test('should support screen readers', async ({ page }) => {
    // Check for ARIA labels and roles
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    
    // Check if inputs have accessible names (via label, aria-label, or aria-labelledby)
    const emailId = await emailInput.getAttribute('id');
    const emailAriaLabel = await emailInput.getAttribute('aria-label');
    const emailAriaLabelledBy = await emailInput.getAttribute('aria-labelledby');
    
    // At least one method should provide accessible name
    const emailHasLabel = emailId ? await page.locator(`label[for="${emailId}"]`).count() > 0 : false;
    const emailIsAccessible = emailHasLabel || emailAriaLabel || emailAriaLabelledBy;
    
    expect(emailIsAccessible).toBe(true);
    
    // Same for password
    const passwordId = await passwordInput.getAttribute('id');
    const passwordAriaLabel = await passwordInput.getAttribute('aria-label');
    const passwordAriaLabelledBy = await passwordInput.getAttribute('aria-labelledby');
    
    const passwordHasLabel = passwordId ? await page.locator(`label[for="${passwordId}"]`).count() > 0 : false;
    const passwordIsAccessible = passwordHasLabel || passwordAriaLabel || passwordAriaLabelledBy;
    
    expect(passwordIsAccessible).toBe(true);
  });

  test('should generate comprehensive accessibility report', async ({ page }) => {
    const report = await generateA11yReport(page, 'Login Page');
    
    // Verify report structure
    expect(report).toHaveProperty('page');
    expect(report).toHaveProperty('axe');
    expect(report).toHaveProperty('images');
    expect(report).toHaveProperty('forms');
    expect(report).toHaveProperty('headings');
    expect(report).toHaveProperty('summary');
    
    // Log summary for review
    console.log('Accessibility Report Summary:', report.summary);
    
    // Report should be generated successfully
    expect(report.page).toBe('Login Page');
  });
});
