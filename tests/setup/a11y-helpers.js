/**
 * Accessibility Testing Helpers
 * 
 * Utilities for automated accessibility testing using axe-core
 * Provides helpers for WCAG compliance testing
 */

import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

/**
 * Setup accessibility testing for a page
 * Injects axe-core into the page context
 * 
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function setupA11y(page) {
  await injectAxe(page);
}

/**
 * Run accessibility check on current page
 * 
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {object} [options] - Axe options
 * @param {string[]} [options.tags] - WCAG tags to check (default: ['wcag2a', 'wcag2aa', 'wcag21aa'])
 * @param {object} [options.rules] - Specific rules to check or exclude
 * @param {boolean} [options.includedImpacts] - Impact levels to include
 * @returns {Promise<object>} - Accessibility violations
 */
export async function testA11y(page, options = {}) {
  const defaultOptions = {
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    ...options,
  };

  try {
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      ...defaultOptions,
    });
    return { violations: [], passed: true };
  } catch (error) {
    // Get violations for reporting
    const violations = await getViolations(page, defaultOptions);
    return { violations, passed: false, error };
  }
}

/**
 * Run accessibility check with custom rules
 * 
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {object} [customRules] - Custom rules configuration
 * @returns {Promise<object>} - Accessibility violations
 */
export async function testA11yWithRules(page, customRules = {}) {
  return await testA11y(page, {
    rules: customRules,
  });
}

/**
 * Check for specific accessibility violations
 * 
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string[]} ruleIds - Specific rule IDs to check
 * @returns {Promise<object>} - Violations for specified rules
 */
export async function testA11ySpecificRules(page, ruleIds) {
  const rules = {};
  ruleIds.forEach(ruleId => {
    rules[ruleId] = { enabled: true };
  });

  return await testA11y(page, { rules });
}

/**
 * Check keyboard navigation
 * 
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - Element selector to test
 * @returns {Promise<boolean>} - Whether element is keyboard accessible
 */
export async function testKeyboardNavigation(page, selector) {
  const element = page.locator(selector).first();
  
  // Check if element is focusable
  const isFocusable = await element.evaluate((el) => {
    const tabIndex = el.tabIndex;
    return tabIndex >= 0 || (el instanceof HTMLAnchorElement && el.href) || 
           (el instanceof HTMLButtonElement) || 
           (el instanceof HTMLInputElement) ||
           (el instanceof HTMLSelectElement) ||
           (el instanceof HTMLTextAreaElement);
  });

  if (isFocusable) {
    // Try to focus the element
    await element.focus();
    const isFocused = await element.evaluate((el) => document.activeElement === el);
    return isFocused;
  }

  return false;
}

/**
 * Check ARIA labels and roles
 * 
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - Element selector to check
 * @returns {Promise<object>} - ARIA attributes
 */
export async function checkAriaAttributes(page, selector) {
  const element = page.locator(selector).first();
  
  return await element.evaluate((el) => {
    return {
      role: el.getAttribute('role'),
      ariaLabel: el.getAttribute('aria-label'),
      ariaLabelledBy: el.getAttribute('aria-labelledby'),
      ariaDescribedBy: el.getAttribute('aria-describedby'),
      ariaHidden: el.getAttribute('aria-hidden'),
      ariaExpanded: el.getAttribute('aria-expanded'),
      ariaControls: el.getAttribute('aria-controls'),
    };
  });
}

/**
 * Check color contrast (basic check)
 * Note: Full contrast checking requires axe-core or specialized tools
 * 
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - Element selector to check
 * @returns {Promise<boolean>} - Whether contrast is likely sufficient
 */
export async function checkColorContrast(page, selector) {
  // This is a placeholder - full contrast checking is complex
  // Axe-core handles this automatically in testA11y
  const element = page.locator(selector).first();
  const isVisible = await element.isVisible().catch(() => false);
  return isVisible;
}

/**
 * Check if images have alt text
 * 
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<object>} - Images without alt text
 */
export async function checkImageAltText(page) {
  const images = page.locator('img');
  const count = await images.count();
  const imagesWithoutAlt = [];

  for (let i = 0; i < count; i++) {
    const img = images.nth(i);
    const alt = await img.getAttribute('alt');
    const src = await img.getAttribute('src');
    
    if (!alt || alt.trim() === '') {
      imagesWithoutAlt.push({
        index: i,
        src: src || 'unknown',
      });
    }
  }

  return {
    total: count,
    withoutAlt: imagesWithoutAlt.length,
    violations: imagesWithoutAlt,
  };
}

/**
 * Check if form inputs have labels
 * 
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<object>} - Form inputs without labels
 */
export async function checkFormLabels(page) {
  const inputs = page.locator('input, select, textarea');
  const count = await inputs.count();
  const inputsWithoutLabels = [];

  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    const id = await input.getAttribute('id');
    const type = await input.getAttribute('type');
    const ariaLabel = await input.getAttribute('aria-label');
    const ariaLabelledBy = await input.getAttribute('aria-labelledby');
    
    // Check if label exists (by id or for attribute)
    let hasLabel = false;
    if (id) {
      const label = page.locator(`label[for="${id}"]`);
      hasLabel = await label.count() > 0;
    }
    
    // Check for aria-label or aria-labelledby
    if (ariaLabel || ariaLabelledBy) {
      hasLabel = true;
    }
    
    // Skip hidden inputs
    if (type === 'hidden') {
      continue;
    }
    
    if (!hasLabel) {
      inputsWithoutLabels.push({
        index: i,
        type: type || 'unknown',
        id: id || 'no-id',
      });
    }
  }

  return {
    total: count,
    withoutLabels: inputsWithoutLabels.length,
    violations: inputsWithoutLabels,
  };
}

/**
 * Check heading hierarchy
 * 
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<object>} - Heading structure
 */
export async function checkHeadingHierarchy(page) {
  const headings = page.locator('h1, h2, h3, h4, h5, h6');
  const count = await headings.count();
  const headingStructure = [];

  for (let i = 0; i < count; i++) {
    const heading = headings.nth(i);
    const tagName = await heading.evaluate((el) => el.tagName.toLowerCase());
    const text = await heading.textContent();
    headingStructure.push({
      level: parseInt(tagName.charAt(1)),
      tag: tagName,
      text: text?.trim().substring(0, 50) || '',
    });
  }

  // Check for proper hierarchy (h1 should come before h2, etc.)
  let hierarchyIssues = [];
  let previousLevel = 0;
  
  for (let i = 0; i < headingStructure.length; i++) {
    const current = headingStructure[i];
    if (i === 0 && current.level !== 1) {
      hierarchyIssues.push({
        index: i,
        issue: 'First heading should be h1',
        current: current.tag,
      });
    }
    if (current.level > previousLevel + 1) {
      hierarchyIssues.push({
        index: i,
        issue: `Heading level skipped from ${previousLevel} to ${current.level}`,
        current: current.tag,
      });
    }
    previousLevel = current.level;
  }

  return {
    headings: headingStructure,
    issues: hierarchyIssues,
    hasIssues: hierarchyIssues.length > 0,
  };
}

/**
 * Generate accessibility report
 * 
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} pageName - Name of the page being tested
 * @returns {Promise<object>} - Comprehensive accessibility report
 */
export async function generateA11yReport(page, pageName) {
  await setupA11y(page);
  
  const a11yResults = await testA11y(page);
  const images = await checkImageAltText(page);
  const forms = await checkFormLabels(page);
  const headings = await checkHeadingHierarchy(page);

  return {
    page: pageName,
    timestamp: new Date().toISOString(),
    axe: a11yResults,
    images,
    forms,
    headings,
    summary: {
      totalViolations: a11yResults.violations?.length || 0,
      imagesWithoutAlt: images.withoutAlt,
      inputsWithoutLabels: forms.withoutLabels,
      headingIssues: headings.issues.length,
    },
  };
}
