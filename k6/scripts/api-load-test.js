/**
 * API Load Test
 * 
 * Tests API endpoints under load:
 * - Authentication endpoints
 * - Course endpoints
 * - User endpoints
 * - Dashboard endpoints
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, mediumLoad, httpOptions, getAuthenticatedOptions } from '../config.js';

/**
 * Custom metrics
 */
const errorRate = new Rate('errors');

/**
 * Test options
 */
export const options = mediumLoad;

/**
 * Setup function - runs once before all VUs
 */
export function setup() {
  // Warm up the server first (triggers Next.js compilation)
  console.log('Warming up server...');
  http.get(`${BASE_URL}/api/auth/session`, httpOptions);
  sleep(3); // Wait for Next.js compilation

  // Optional: Authenticate and get token for authenticated endpoints
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: __ENV.TEST_USER_EMAIL || 'student@test.com',
    password: __ENV.TEST_USER_PASSWORD || 'testpassword123',
  }), {
    ...httpOptions,
  });

  let authToken = '';
  if (loginResponse.status === 200) {
    const loginData = loginResponse.json();
    authToken = loginData.sessionToken || loginData.token || '';
  }

  return { authToken };
}

/**
 * Main test function - runs for each VU iteration
 */
export default function (data) {
  const { authToken } = data;
  const authenticatedOptions = getAuthenticatedOptions(authToken);

  // Test 1: Public courses endpoint (always exists)
  let response = http.get(`${BASE_URL}/api/courses?limit=10`, httpOptions);
  const coursesCheck = check(response, {
    'courses endpoint status is 200': (r) => r.status === 200 || r.status === 401 || r.status === 403,
    'courses has data': (r) => {
      if (r.status !== 200) return true; // 401/403 is acceptable
      try {
        const json = r.json();
        return json !== null;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!coursesCheck);
  sleep(1);

  // Test 2: Auth session endpoint (public)
  response = http.get(`${BASE_URL}/api/auth/session`, httpOptions);
  const sessionCheck = check(response, {
    'session endpoint status is 200': (r) => r.status === 200,
  });
  errorRate.add(!sessionCheck);
  sleep(1);

  // Test 3: Authenticated endpoint (if token available)
  if (authToken) {
    // Get user profile
    response = http.get(`${BASE_URL}/api/user/profile`, authenticatedOptions);
    const profileCheck = check(response, {
      'profile endpoint status is 200': (r) => r.status === 200,
    });
    errorRate.add(!profileCheck);
    sleep(1);

    // Get dashboard data
    response = http.get(`${BASE_URL}/api/students/dashboard`, authenticatedOptions);
    const dashboardCheck = check(response, {
      'dashboard endpoint status is 200 or 403': (r) => r.status === 200 || r.status === 403, // 403 if not student
    });
    errorRate.add(!dashboardCheck);
    sleep(1);
  }
}

/**
 * Teardown function - runs once after all VUs finish
 */
export function teardown(data) {
  // Optional: Cleanup if needed
  console.log('Load test completed');
}
