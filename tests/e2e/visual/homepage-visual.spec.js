/**
 * Homepage Visual Regression Tests
 * 
 * Tests visual appearance of the homepage to catch UI regressions
 * Uses Playwright's built-in visual comparison
 */

import { test, expect } from '@playwright/test';

test.describe('Homepage Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should match homepage screenshot', async ({ page }) => {
    // Take screenshot of full page
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
    });
  });

  test('should match homepage hero section', async ({ page }) => {
    // Wait for hero section to load
    const hero = page.locator('[data-testid="hero"], .hero, section:first-of-type').first();
    await hero.waitFor({ state: 'visible', timeout: 5000 });
    
    // Take screenshot of hero section
    await expect(hero).toHaveScreenshot('homepage-hero.png');
  });

  test('should match homepage navigation', async ({ page }) => {
    // Wait for navigation
    const nav = page.locator('nav, header, [role="navigation"]').first();
    await nav.waitFor({ state: 'visible', timeout: 5000 });
    
    // Take screenshot of navigation
    await expect(nav).toHaveScreenshot('homepage-navigation.png');
  });

  test('should match homepage on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000); // Wait for layout to adjust
    
    // Take screenshot
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
    });
  });

  test('should match homepage on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
    });
  });

  test('should match homepage on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
    });
  });
});
