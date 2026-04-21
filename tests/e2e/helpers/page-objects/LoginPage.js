/**
 * Login Page Object Model
 * 
 * Encapsulates login page interactions and selectors
 */

export class LoginPage {
  constructor(page) {
    this.page = page;
    
    // Selectors
    this.selectors = {
      emailInput: 'input[type="email"], input[name="email"]',
      passwordInput: 'input[type="password"], input[name="password"]',
      submitButton: 'button[type="submit"], button:has-text("Login"), button:has-text("Sign in")',
      errorMessage: '.error, [role="alert"], .alert-danger, .text-red-500, .text-error',
      successMessage: '.success, .alert-success, .text-green-500',
      rememberMeCheckbox: 'input[type="checkbox"][name*="remember"], input[type="checkbox"][id*="remember"]',
      forgotPasswordLink: 'a:has-text("Forgot"), a:has-text("forgot password")',
    };
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill email field
   * @param {string} email - Email address
   */
  async fillEmail(email) {
    const emailInput = this.page.locator(this.selectors.emailInput).first();
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(email);
  }

  /**
   * Fill password field
   * @param {string} password - Password
   */
  async fillPassword(password) {
    const passwordInput = this.page.locator(this.selectors.passwordInput).first();
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
    await passwordInput.fill(password);
  }

  /**
   * Click submit button
   */
  async clickSubmit() {
    const submitButton = this.page.locator(this.selectors.submitButton).first();
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitButton.click();
  }

  /**
   * Login with credentials
   * @param {string} email - Email address
   * @param {string} password - Password
   * @param {boolean} rememberMe - Remember me option
   */
  async login(email, password, rememberMe = false) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    
    if (rememberMe) {
      const checkbox = this.page.locator(this.selectors.rememberMeCheckbox).first();
      if (await checkbox.isVisible().catch(() => false)) {
        await checkbox.check();
      }
    }
    
    await this.clickSubmit();
  }

  /**
   * Check if error message is visible
   * @returns {Promise<boolean>}
   */
  async hasErrorMessage() {
    const errorElement = this.page.locator(this.selectors.errorMessage).first();
    return await errorElement.isVisible().catch(() => false);
  }

  /**
   * Get error message text
   * @returns {Promise<string|null>}
   */
  async getErrorMessage() {
    const errorElement = this.page.locator(this.selectors.errorMessage).first();
    if (await errorElement.isVisible().catch(() => false)) {
      return await errorElement.textContent();
    }
    return null;
  }

  /**
   * Check if success message is visible
   * @returns {Promise<boolean>}
   */
  async hasSuccessMessage() {
    const successElement = this.page.locator(this.selectors.successMessage).first();
    return await successElement.isVisible().catch(() => false);
  }

  /**
   * Wait for navigation after login
   * @param {string|RegExp} expectedUrl - Expected URL pattern
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForNavigation(expectedUrl = /\/dashboards\/|\/login/, timeout = 10000) {
    await this.page.waitForURL(expectedUrl, { timeout });
  }

  /**
   * Check if login form is visible
   * @returns {Promise<boolean>}
   */
  async isLoginFormVisible() {
    const emailInput = this.page.locator(this.selectors.emailInput).first();
    return await emailInput.isVisible().catch(() => false);
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword() {
    const link = this.page.locator(this.selectors.forgotPasswordLink).first();
    if (await link.isVisible().catch(() => false)) {
      await link.click();
    }
  }
}
