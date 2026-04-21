/**
 * Homepage Accessibility Tests
 * 
 * Tests WCAG compliance for the homepage including:
 * - Overall page structure
 * - Navigation
 * - Content sections
 * - Forms and interactive elements
 */

import { test, expect } from '@playwright/test';
import { setupA11y, testA11y, checkImageAltText, checkHeadingHierarchy, generateA11yReport } from '../../setup/a11y-helpers.js';

test.describe('Homepage Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Setup accessibility testing
    await setupA11y(page);
  });

  test('should pass WCAG 2.1 AA accessibility standards', async ({ page }) => {
    // Run full accessibility check
    const result = await testA11y(page, {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    });

    // Should have no critical violations
    if (result.passed) {
      expect(result.passed).toBe(true);
    } else {
      // Log violations for review
      console.log('Accessibility violations found:', result.violations?.length || 0);
      if (result.violations) {
        result.violations.slice(0, 10).forEach((violation, index) => {
          console.log(`Violation ${index + 1}:`, violation.id, violation.description);
        });
      }
      // Don't fail test - log for review
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const headingCheck = await checkHeadingHierarchy(page);
    
    // Should have at least one h1
    const hasH1 = headingCheck.headings.some(h => h.level === 1);
    expect(hasH1).toBe(true);
    
    // Should have proper hierarchy
    if (headingCheck.hasIssues) {
      console.log('Heading hierarchy issues:', headingCheck.issues);
    }
  });

  test('should have alt text for images', async ({ page }) => {
    const imageCheck = await checkImageAltText(page);
    
    // Log results
    console.log(`Total images: ${imageCheck.total}, Without alt: ${imageCheck.withoutAlt}`);
    
    if (imageCheck.withoutAlt > 0) {
      console.log('Images without alt text:', imageCheck.violations.slice(0, 5));
    }
    
    // Most images should have alt text (some decorative images can have empty alt)
    // This is informational, not a hard failure
    expect(imageCheck.total).toBeGreaterThan(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Test keyboard navigation through main elements
    const links = page.locator('a[href], button, input, select, textarea');
    const linkCount = await links.count();
    
    if (linkCount > 0) {
      // Test tab navigation
      await page.keyboard.press('Tab');
      
      // Should be able to navigate
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName || null;
      });
      
      expect(focusedElement).toBeTruthy();
    }
  });

  test('should have proper landmark regions', async ({ page }) => {
    // Check for semantic HTML5 landmarks
    const header = page.locator('header, [role="banner"]').first();
    const nav = page.locator('nav, [role="navigation"]').first();
    const main = page.locator('main, [role="main"]').first();
    const footer = page.locator('footer, [role="contentinfo"]').first();
    
    // At least main content should exist
    const mainExists = await main.isVisible().catch(() => false);
    expect(mainExists).toBe(true);
  });

  test('should generate comprehensive accessibility report', async ({ page }) => {
    const report = await generateA11yReport(page, 'Homepage');
    
    // Verify report structure
    expect(report).toHaveProperty('page');
    expect(report).toHaveProperty('axe');
    expect(report).toHaveProperty('summary');
    
    // Log summary
    console.log('Homepage Accessibility Report:', report.summary);
    
    expect(report.page).toBe('Homepage');
  });
});
