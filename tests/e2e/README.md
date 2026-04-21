# E2E Testing with Playwright

This directory contains end-to-end tests using Playwright for browser automation.

## Overview

Playwright is a modern testing framework that enables reliable end-to-end testing across multiple browsers (Chromium, Firefox, WebKit).

## Prerequisites

1. **Install Dependencies**
   ```bash
   npm install
   npx playwright install
   ```

2. **Environment Setup**
   - Ensure Next.js dev server can run on `http://localhost:3000`
   - Set up test user credentials (optional, for authentication tests)

## Running Tests

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Tests in UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Run Tests in Debug Mode
```bash
npm run test:e2e:debug
```

### Run Tests in Headed Browser (See Browser)
```bash
npm run test:e2e:headed
```

### View Test Report
```bash
npm run test:e2e:report
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/auth/login.spec.js
```

### Run Tests Matching Pattern
```bash
npx playwright test --grep "login"
```

### Run Tests in Specific Browser
```bash
npx playwright test --project=chromium
```

## Test Structure

```
tests/e2e/
├── auth/                    # Authentication tests
│   └── login.spec.js
├── payment/                 # Payment flow tests
│   └── checkout-flow.spec.js
├── dashboards/              # Dashboard tests
│   └── student-dashboard.spec.js
├── helpers/                 # Test helpers
│   └── page-objects/        # Page Object Models
│       ├── LoginPage.js
│       ├── DashboardPage.js
│       └── StudentDashboardPage.js
└── fixtures/                # Test data (optional)
```

## Page Object Models

We use the Page Object Model pattern to encapsulate page interactions:

- **LoginPage**: Login form interactions
- **DashboardPage**: Base dashboard functionality
- **StudentDashboardPage**: Student-specific dashboard features

## Test Helpers

Common utilities are available in `tests/setup/playwright-helpers.js`:

- `authenticateUser()` - Login helper
- `waitForNavigation()` - Navigation helper
- `fillFormField()` - Form field helper
- `clickAndWait()` - Click with wait
- `clearBrowserStorage()` - Clear cookies and storage

## Environment Variables

### Optional Environment Variables

- `PLAYWRIGHT_BASE_URL` - Override base URL (default: `http://localhost:3000`)
- `TEST_USER_EMAIL` - Test user email for authentication tests
- `TEST_USER_PASSWORD` - Test user password for authentication tests
- `TEST_COURSE_ID` - Test course ID for course-related tests
- `TEST_COUPON_CODE` - Test coupon code for payment tests

### Setting Environment Variables

Create a `.env.test` file or set them before running tests:

```bash
# Windows
set TEST_USER_EMAIL=student@test.com
set TEST_USER_PASSWORD=testpassword123
npm run test:e2e

# Linux/Mac
export TEST_USER_EMAIL=student@test.com
export TEST_USER_PASSWORD=testpassword123
npm run test:e2e
```

## Test Data Setup

### Authentication Tests

For authentication tests to work properly, you need:

1. **Test User Account**
   - Create a test user in your database
   - Set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` environment variables
   - Ensure the user has appropriate role (e.g., 'student')

2. **Database Setup**
   - Tests assume a test database is available
   - Use test data seeders if available

### Payment Tests

Payment tests require:

1. **Razorpay Test Keys**
   - Set up Razorpay test account
   - Configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in environment
   - Use Razorpay test mode

2. **Test Course**
   - Create a paid course in test database
   - Set `TEST_COURSE_ID` environment variable

3. **Test Coupon** (optional)
   - Create a test coupon code
   - Set `TEST_COUPON_CODE` environment variable

## Writing Tests

### Basic Test Structure

```javascript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../helpers/page-objects/LoginPage.js';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Test implementation
    await page.goto('/some-page');
    await expect(page.locator('h1')).toHaveText('Expected Text');
  });
});
```

### Using Page Objects

```javascript
import { LoginPage } from '../helpers/page-objects/LoginPage.js';

test('should login successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password');
  await loginPage.waitForNavigation(/\/dashboards\//);
});
```

### Using Helpers

```javascript
import { authenticateUser } from '../../setup/playwright-helpers.js';

test('should access dashboard', async ({ page }) => {
  await authenticateUser(page, 'user@example.com', 'password');
  await page.goto('/dashboards/student-dashboard');
  // Test dashboard
});
```

## Best Practices

1. **Use Page Objects**: Encapsulate page interactions in Page Object Models
2. **Use Helpers**: Reuse common utilities from `playwright-helpers.js`
3. **Clear State**: Use `clearBrowserStorage()` in `beforeEach` hooks
4. **Wait Properly**: Use Playwright's built-in waiting mechanisms
5. **Isolate Tests**: Each test should be independent
6. **Handle Async**: Always await async operations
7. **Skip When Needed**: Use `test.skip()` for tests requiring unavailable setup

## Debugging

### Debug Mode

Run tests in debug mode to step through execution:

```bash
npm run test:e2e:debug
```

### Screenshots and Videos

- Screenshots are automatically taken on test failure
- Videos are recorded for retried tests
- View them in `test-results/` directory

### Trace Viewer

Playwright automatically captures traces on first retry. View them:

```bash
npx playwright show-trace test-results/trace.zip
```

## Common Issues

### Tests Timeout

- Increase timeout in `playwright.config.js`
- Check if dev server is running
- Verify network requests complete

### Authentication Fails

- Verify test user credentials are correct
- Check if user exists in database
- Ensure user has correct role

### Element Not Found

- Use `waitForSelector()` before interacting
- Check if element selector is correct
- Verify page has loaded completely

### Dev Server Not Starting

- Ensure port 3000 is available
- Check `npm run dev` works manually
- Verify Next.js is properly configured

## CI/CD Integration

While CI/CD workflows are not included in this phase, tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E Tests
  run: npm run test:e2e
```

## Next Steps

- Add more test coverage for critical user flows
- Implement visual regression testing
- Add accessibility testing with axe-core
- Set up test data fixtures
- Configure CI/CD integration

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
