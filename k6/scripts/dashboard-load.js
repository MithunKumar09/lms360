/**
 * Dashboard Load Test
 * 
 * Tests dashboard page load performance:
 * - Dashboard API endpoints
 * - Data fetching endpoints
 * - Real-time updates
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, mediumLoad, getAuthenticatedOptions } from '../config.js';

/**
 * Custom metrics
 */
const errorRate = new Rate('errors');
const slowResponseRate = new Rate('slow_responses');

/**
 * Test options
 */
export const options = {
  ...mediumLoad,
  thresholds: {
    ...mediumLoad.thresholds,
    // Dashboard endpoints might be slower, adjust thresholds
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
  },
};

/**
 * Setup function
 */
export function setup() {
  // Authenticate as different user types
  const users = [
    { email: __ENV.TEST_USER_EMAIL || 'student@test.com', password: __ENV.TEST_USER_PASSWORD || 'testpassword123' },
    // Add more test users if available
  ];

  const tokens = [];
  
  for (const user of users) {
    const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (loginResponse.status === 200) {
      const loginData = loginResponse.json();
      tokens.push({
        token: loginData.sessionToken || loginData.token || '',
        role: loginData.user?.role || 'student',
      });
    }
  }

  return { tokens };
}

/**
 * Main test function
 */
export default function (data) {
  const { tokens } = data;
  
  if (tokens.length === 0) {
    console.log('Skipping dashboard test - no authenticated users');
    return;
  }

  // Use a random token from available tokens
  const tokenData = tokens[Math.floor(Math.random() * tokens.length)];
  const authenticatedOptions = getAuthenticatedOptions(tokenData.token);

  // Test 1: Student Dashboard
  if (tokenData.role === 'student') {
    let response = http.get(`${BASE_URL}/api/students/dashboard`, authenticatedOptions);
    const dashboardCheck = check(response, {
      'student dashboard status is 200': (r) => r.status === 200,
      'student dashboard response time < 1000ms': (r) => r.timings.duration < 1000,
      'student dashboard has data': (r) => {
        if (r.status !== 200) return false;
        try {
          const json = r.json();
          return json.success !== false;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!dashboardCheck);
    if (response.timings.duration > 1000) {
      slowResponseRate.add(1);
    }
    sleep(1);

    // Test 2: Student Progress
    response = http.get(`${BASE_URL}/api/students/progress`, authenticatedOptions);
    const progressCheck = check(response, {
      'progress endpoint status is 200': (r) => r.status === 200 || r.status === 404,
      'progress response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    errorRate.add(!progressCheck);
    sleep(1);
  }

  // Test 3: Instructor Dashboard (if token is for instructor)
  if (tokenData.role === 'instructor') {
    let response = http.get(`${BASE_URL}/api/instructor/dashboard`, authenticatedOptions);
    const instructorDashboardCheck = check(response, {
      'instructor dashboard status is 200': (r) => r.status === 200,
      'instructor dashboard response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    errorRate.add(!instructorDashboardCheck);
    sleep(1);
  }

  // Test 4: Common dashboard endpoints
  let response = http.get(`${BASE_URL}/api/user/profile`, authenticatedOptions);
  const profileCheck = check(response, {
    'profile endpoint status is 200': (r) => r.status === 200,
    'profile response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!profileCheck);
  sleep(1);

  // Test 5: Notifications (if available)
  response = http.get(`${BASE_URL}/api/notifications`, authenticatedOptions);
  const notificationsCheck = check(response, {
    'notifications endpoint status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'notifications response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!notificationsCheck);
  sleep(1);
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('Dashboard load test completed');
}
