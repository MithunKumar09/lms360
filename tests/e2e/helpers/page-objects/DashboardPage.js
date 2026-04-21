/**
 * Base Dashboard Page Object Model
 * 
 * Base class for dashboard pages with common functionality
 */

export class DashboardPage {
  constructor(page, dashboardPath) {
    this.page = page;
    this.dashboardPath = dashboardPath;
    
    // Common selectors for all dashboards
    this.selectors = {
      sidebar: '[data-testid="sidebar"], .sidebar, nav[aria-label*="navigation"]',
      userMenu: '[data-testid="user-menu"], button:has-text("Profile"), .user-menu',
      logoutButton: 'button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]',
      pageTitle: 'h1, [data-testid="page-title"], .page-title',
      loadingSpinner: '.spinner, .loading, [data-testid="loading"]',
    };
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await this.page.goto(this.dashboardPath);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if dashboard is loaded
   * @returns {Promise<boolean>}
   */
  async isLoaded() {
    try {
      // Wait for page title or main content
      await this.page.waitForSelector(this.selectors.pageTitle, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get page title
   * @returns {Promise<string|null>}
   */
  async getPageTitle() {
    const title = this.page.locator(this.selectors.pageTitle).first();
    if (await title.isVisible().catch(() => false)) {
      return await title.textContent();
    }
    return null;
  }

  /**
   * Check if sidebar is visible
   * @returns {Promise<boolean>}
   */
  async isSidebarVisible() {
    const sidebar = this.page.locator(this.selectors.sidebar).first();
    return await sidebar.isVisible().catch(() => false);
  }

  /**
   * Click logout button
   */
  async logout() {
    // Try to open user menu first if it exists
    const userMenu = this.page.locator(this.selectors.userMenu).first();
    if (await userMenu.isVisible().catch(() => false)) {
      await userMenu.click();
      await this.page.waitForTimeout(500); // Wait for menu to open
    }
    
    const logoutButton = this.page.locator(this.selectors.logoutButton).first();
    await logoutButton.waitFor({ state: 'visible', timeout: 5000 });
    await logoutButton.click();
    
    // Wait for redirect to login
    await this.page.waitForURL(/\/login/, { timeout: 10000 });
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoading() {
    // Wait for loading spinner to disappear
    const spinner = this.page.locator(this.selectors.loadingSpinner).first();
    try {
      await spinner.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      // Spinner might not exist, which is fine
    }
    
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a section in the dashboard
   * @param {string} sectionPath - Path to section
   */
  async navigateToSection(sectionPath) {
    const fullPath = `${this.dashboardPath}${sectionPath}`;
    await this.page.goto(fullPath);
    await this.waitForLoading();
  }
}
