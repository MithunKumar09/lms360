/**
 * Smoke Test
 * 
 * Quick smoke test to verify basic API functionality
 * Runs with minimal load to check if system is responsive
 * 
 * Note: First requests may be slow due to Next.js cold start compilation
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, httpOptions } from '../config.js';

/**
 * Test options - very light load with lenient thresholds for development
 */
export const options = {
  stages: [
    { duration: '5s', target: 1 }, // Warmup - allow server to compile
    { duration: '10s', target: 1 }, // Actual test
  ],
  thresholds: {
    // Very lenient for development (cold starts can be 20+ seconds)
    http_req_duration: ['p(95)<30000'], // 30 seconds max (handles cold start)
    http_req_failed: ['rate<0.5'], // Allow up to 50% failure (for cold start)
    checks: ['rate>0.5'], // At least 50% of checks should pass
  },
};

/**
 * Setup function - warm up the server
 */
export function setup() {
  // Warm up the server by making a request
  // This triggers Next.js compilation so subsequent requests are faster
  console.log('Warming up server...');
  const warmup = http.get(`${BASE_URL}/api/auth/session`, httpOptions);
  sleep(2); // Wait a bit for compilation
  return {};
}

/**
 * Main test function
 */
export default function () {
  // Test 1: Homepage (should always exist)
  let response = http.get(`${BASE_URL}/`, httpOptions);
  check(response, {
    'homepage loads': (r) => r.status === 200,
    'homepage responds (even if slow)': (r) => r.status === 200 || r.status < 500,
  });
  sleep(1);

  // Test 2: Public courses endpoint (should exist)
  response = http.get(`${BASE_URL}/api/courses?limit=5`, httpOptions);
  check(response, {
    'courses endpoint responds': (r) => r.status === 200 || r.status === 401 || r.status === 403,
    'courses returns valid response': (r) => {
      if (r.status !== 200) return true; // 401/403 is acceptable
      try {
        const json = r.json();
        return json !== null;
      } catch {
        return false;
      }
    },
  });
  sleep(1);

  // Test 3: Auth session endpoint (public, returns 200 even if not authenticated)
  response = http.get(`${BASE_URL}/api/auth/session`, httpOptions);
  check(response, {
    'session endpoint responds': (r) => r.status === 200,
    'session returns JSON': (r) => {
      if (r.status !== 200) return false;
      try {
        const json = r.json();
        return json !== null;
      } catch {
        return false;
      }
    },
  });
  sleep(1);
}
