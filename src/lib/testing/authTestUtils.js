/**
 * Authentication Test Utilities
 * 
 * Utilities for testing authentication flows, API endpoints, and error scenarios.
 * Can be used in integration tests or manual testing scripts.
 */

import apiClient from '@/lib/api/client.js';
import { getEndpoint } from '@/lib/api/endpoints.js';

/**
 * Test credentials
 */
export const TEST_CREDENTIALS = {
  superadmin: {
    email: 'mithunkumarkulal33@gmail.com',
    password: '##/*%qwerty098765',
  },
};

/**
 * Test authentication flow
 * 
 * @param {Object} credentials - Login credentials
 * @returns {Promise<Object>} Test result
 */
export async function testLoginFlow(credentials = TEST_CREDENTIALS.superadmin) {
  const results = {
    success: false,
    steps: [],
    errors: [],
    tokens: null,
  };

  try {
    // Step 1: Login
    results.steps.push('Attempting login...');
    const loginResponse = await apiClient.post(getEndpoint('auth.login'), {
      email: credentials.email,
      password: credentials.password,
    });

    if (loginResponse.requiresMfa) {
      results.steps.push('MFA required - flow would continue to MFA verification');
      results.mfaRequired = true;
      return results;
    }

    if (!loginResponse.success) {
      results.errors.push(`Login failed: ${loginResponse.error}`);
      return results;
    }

    results.steps.push('Login successful');
    results.tokens = {
      sessionToken: loginResponse.sessionToken,
      refreshToken: loginResponse.refreshToken,
      expiresAt: loginResponse.expiresAt,
    };

    // Step 2: Check session
    results.steps.push('Checking session...');
    const sessionResponse = await apiClient.get(getEndpoint('auth.session'));
    if (sessionResponse.authenticated) {
      results.steps.push('Session verified');
    } else {
      results.errors.push('Session check failed');
    }

    results.success = true;
  } catch (error) {
    results.errors.push(`Test failed: ${error.message}`);
  }

  return results;
}

/**
 * Test MFA flow
 * 
 * @param {Object} credentials - Login credentials
 * @param {string} totpCode - TOTP code for verification
 * @returns {Promise<Object>} Test result
 */
export async function testMfaFlow(credentials = TEST_CREDENTIALS.superadmin, totpCode) {
  const results = {
    success: false,
    steps: [],
    errors: [],
  };

  try {
    // Step 1: Login (should require MFA)
    results.steps.push('Attempting login (should require MFA)...');
    const loginResponse = await apiClient.post(getEndpoint('auth.login'), {
      email: credentials.email,
      password: credentials.password,
    });

    if (!loginResponse.requiresMfa) {
      results.errors.push('MFA was not required');
      return results;
    }

    results.steps.push('MFA required as expected');

    // Step 2: Verify MFA
    if (totpCode) {
      results.steps.push('Verifying MFA code...');
      const mfaResponse = await apiClient.post(getEndpoint('mfa.verify'), {
        email: credentials.email,
        code: totpCode,
        isBackupCode: false,
      });

      if (mfaResponse.success) {
        results.steps.push('MFA verification successful');
        results.tokens = {
          sessionToken: mfaResponse.sessionToken,
          refreshToken: mfaResponse.refreshToken,
          expiresAt: mfaResponse.expiresAt,
        };
        results.success = true;
      } else {
        results.errors.push(`MFA verification failed: ${mfaResponse.error}`);
      }
    } else {
      results.steps.push('MFA code not provided - skipping verification');
    }
  } catch (error) {
    results.errors.push(`Test failed: ${error.message}`);
  }

  return results;
}

/**
 * Test token refresh
 * 
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} Test result
 */
export async function testTokenRefresh(refreshToken) {
  const results = {
    success: false,
    steps: [],
    errors: [],
    newTokens: null,
  };

  try {
    results.steps.push('Attempting token refresh...');
    const refreshResponse = await apiClient.post(getEndpoint('auth.refresh'), {
      refreshToken,
    });

    if (refreshResponse.success) {
      results.steps.push('Token refresh successful');
      results.newTokens = {
        accessToken: refreshResponse.accessToken,
        refreshToken: refreshResponse.refreshToken,
        expiresAt: refreshResponse.expiresAt,
      };
      results.success = true;
    } else {
      results.errors.push(`Token refresh failed: ${refreshResponse.error}`);
    }
  } catch (error) {
    results.errors.push(`Test failed: ${error.message}`);
  }

  return results;
}

/**
 * Test error scenarios
 * 
 * @returns {Promise<Object>} Test results
 */
export async function testErrorScenarios() {
  const results = {
    tests: [],
    passed: 0,
    failed: 0,
  };

  // Test 1: Invalid credentials
  try {
    const response = await apiClient.post(getEndpoint('auth.login'), {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    });
    if (!response.success && response.error) {
      results.tests.push({ name: 'Invalid credentials', status: 'passed' });
      results.passed++;
    } else {
      results.tests.push({ name: 'Invalid credentials', status: 'failed', error: 'Should have failed' });
      results.failed++;
    }
  } catch (error) {
    results.tests.push({ name: 'Invalid credentials', status: 'passed' });
    results.passed++;
  }

  // Test 2: Missing email
  try {
    const response = await apiClient.post(getEndpoint('auth.login'), {
      password: 'password123',
    });
    if (!response.success) {
      results.tests.push({ name: 'Missing email validation', status: 'passed' });
      results.passed++;
    } else {
      results.tests.push({ name: 'Missing email validation', status: 'failed' });
      results.failed++;
    }
  } catch (error) {
    results.tests.push({ name: 'Missing email validation', status: 'passed' });
    results.passed++;
  }

  // Test 3: Missing password
  try {
    const response = await apiClient.post(getEndpoint('auth.login'), {
      email: 'test@example.com',
    });
    if (!response.success) {
      results.tests.push({ name: 'Missing password validation', status: 'passed' });
      results.passed++;
    } else {
      results.tests.push({ name: 'Missing password validation', status: 'failed' });
      results.failed++;
    }
  } catch (error) {
    results.tests.push({ name: 'Missing password validation', status: 'passed' });
    results.passed++;
  }

  return results;
}

/**
 * Test route protection
 * 
 * @param {string} route - Route to test
 * @returns {Promise<Object>} Test result
 */
export async function testRouteProtection(route) {
  const results = {
    success: false,
    steps: [],
    errors: [],
  };

  try {
    results.steps.push(`Testing route protection for: ${route}`);
    
    // Try to access without authentication
    const response = await fetch(`/api${route}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      results.steps.push('Route protection working - unauthorized access blocked');
      results.success = true;
    } else if (response.status === 200) {
      results.errors.push('Route protection failed - unauthorized access allowed');
    } else {
      results.errors.push(`Unexpected status: ${response.status}`);
    }
  } catch (error) {
    results.errors.push(`Test failed: ${error.message}`);
  }

  return results;
}

export default {
  testLoginFlow,
  testMfaFlow,
  testTokenRefresh,
  testErrorScenarios,
  testRouteProtection,
  TEST_CREDENTIALS,
};


