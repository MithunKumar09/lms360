/**
 * Payment Flow Load Test
 * 
 * Tests payment-related endpoints under load:
 * - Checkout creation
 * - Order creation
 * - Payment processing simulation
 * 
 * Note: This test simulates payment flow without actual payment processing
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, lightLoad, httpOptions, getAuthenticatedOptions } from '../config.js';

/**
 * Custom metrics
 */
const errorRate = new Rate('errors');
const paymentErrorRate = new Rate('payment_errors');

/**
 * Test options - use light load for payment testing
 */
export const options = {
  ...lightLoad,
  thresholds: {
    ...lightLoad.thresholds,
    // Stricter thresholds for payment endpoints
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.005'], // Less than 0.5% failure rate
  },
};

/**
 * Setup function
 */
export function setup() {
  // Authenticate as a test user
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: __ENV.TEST_USER_EMAIL || 'student@test.com',
    password: __ENV.TEST_USER_PASSWORD || 'testpassword123',
  }), httpOptions);

  let authToken = '';
  if (loginResponse.status === 200) {
    const loginData = loginResponse.json();
    authToken = loginData.sessionToken || loginData.token || '';
  }

  // Get a test course ID
  const coursesResponse = http.get(`${BASE_URL}/api/courses?limit=1`, httpOptions);
  let courseId = __ENV.TEST_COURSE_ID || null;
  
  if (coursesResponse.status === 200) {
    try {
      const coursesData = coursesResponse.json();
      if (coursesData.courses && coursesData.courses.length > 0) {
        courseId = coursesData.courses[0].id;
      }
    } catch (e) {
      // Use default or env variable
    }
  }

  return { authToken, courseId };
}

/**
 * Main test function
 */
export default function (data) {
  const { authToken, courseId } = data;
  
  if (!authToken || !courseId) {
    console.log('Skipping payment test - missing auth token or course ID');
    return;
  }

  const authenticatedOptions = getAuthenticatedOptions(authToken);

  // Test 1: Get course details
  let response = http.get(`${BASE_URL}/api/courses/${courseId}`, httpOptions);
  const courseCheck = check(response, {
    'course details status is 200': (r) => r.status === 200,
    'course details response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!courseCheck);
  sleep(1);

  // Test 2: Create checkout/order (simulation)
  const checkoutPayload = JSON.stringify({
    courseId: courseId,
    // Add other required fields based on your API
  });

  response = http.post(`${BASE_URL}/api/checkout/create-order`, checkoutPayload, authenticatedOptions);
  const checkoutCheck = check(response, {
    'checkout creation status is 200 or 400': (r) => r.status === 200 || r.status === 400, // 400 if validation fails
    'checkout response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  paymentErrorRate.add(!checkoutCheck);
  errorRate.add(!checkoutCheck);
  sleep(2);

  // Test 3: Validate coupon (if applicable)
  const couponPayload = JSON.stringify({
    couponCode: __ENV.TEST_COUPON_CODE || 'TEST10',
    courseId: courseId,
  });

  response = http.post(`${BASE_URL}/api/coupons/validate`, couponPayload, authenticatedOptions);
  const couponCheck = check(response, {
    'coupon validation status is 200 or 400': (r) => r.status === 200 || r.status === 400,
    'coupon response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!couponCheck);
  sleep(1);

  // Test 4: Get order status (if order was created)
  // This would require storing order ID from previous step
  // For now, just test the endpoint structure
  response = http.get(`${BASE_URL}/api/payments/orders`, authenticatedOptions);
  const ordersCheck = check(response, {
    'orders endpoint status is 200 or 403': (r) => r.status === 200 || r.status === 403,
    'orders response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!ordersCheck);
  sleep(1);
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('Payment flow load test completed');
}
