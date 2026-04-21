/**
 * k6 Performance Testing Configuration
 * 
 * Shared configuration for k6 load tests
 * Defines common thresholds, stages, and options
 */

/**
 * Base URL for API endpoints
 * Can be overridden with K6_BASE_URL environment variable
 */
export const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';

/**
 * Default thresholds for all tests
 * These define acceptable performance metrics
 * 
 * Note: Thresholds are lenient for development to account for:
 * - Next.js cold start compilation (can take 20+ seconds)
 * - Development server performance
 * - Database query optimization needed
 */
export const defaultThresholds = {
  // HTTP request duration (lenient for dev - adjust for production)
  // First requests can be very slow due to Next.js compilation
  http_req_duration: ['p(95)<10000', 'p(99)<20000'], // 10s/20s for dev
  
  // HTTP request failure rate (allow some failures in dev)
  // Note: 4xx errors from search/optional endpoints are acceptable
  http_req_failed: ['rate<0.2'], // 20% max failure rate (lenient for dev)
  
  // Iteration duration (lenient for cold starts)
  iteration_duration: ['p(95)<30000'], // 30 seconds max
  
  // Data received (response size)
  data_received: ['rate>0'],
  
  // Data sent (request size)
  data_sent: ['rate>0'],
};

/**
 * Light load scenario (for quick smoke tests)
 * Ramp up to 10 users over 30 seconds, maintain for 1 minute
 */
export const lightLoad = {
  stages: [
    { duration: '10s', target: 1 }, // Warmup - allow server compilation
    { duration: '30s', target: 5 }, // Gradual ramp
    { duration: '1m', target: 5 }, // Maintain
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    ...defaultThresholds,
    // Even more lenient for smoke tests
    http_req_duration: ['p(95)<30000'],
    http_req_failed: ['rate<0.2'], // 20% max for smoke
  },
};

/**
 * Medium load scenario (for normal load testing)
 * Ramp up to 50 users over 1 minute, maintain for 2 minutes
 */
export const mediumLoad = {
  stages: [
    { duration: '10s', target: 1 }, // Warmup
    { duration: '30s', target: 10 }, // Gradual ramp
    { duration: '1m', target: 30 }, // Increase load
    { duration: '2m', target: 30 }, // Maintain
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: defaultThresholds,
};

/**
 * Heavy load scenario (for stress testing)
 * Ramp up to 100 users over 2 minutes, maintain for 3 minutes
 */
export const heavyLoad = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: defaultThresholds,
};

/**
 * Spike test scenario (for testing sudden traffic spikes)
 * Rapid ramp up to 200 users, then rapid decrease
 */
export const spikeTest = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '10s', target: 200 },
    { duration: '30s', target: 200 },
    { duration: '10s', target: 10 },
    { duration: '30s', target: 10 },
  ],
  thresholds: {
    ...defaultThresholds,
    // Allow higher failure rate during spike
    http_req_failed: ['rate<0.05'],
  },
};

/**
 * Common HTTP options
 */
export const httpOptions = {
  timeout: '30s',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

/**
 * Get authentication token (if needed)
 * This is a placeholder - implement based on your auth flow
 */
export function getAuthToken() {
  // Return token from environment or generate one
  // In real scenario, you'd authenticate first
  return __ENV.AUTH_TOKEN || '';
}

/**
 * Create authenticated HTTP options
 */
export function getAuthenticatedOptions(token) {
  return {
    ...httpOptions,
    headers: {
      ...httpOptions.headers,
      'Authorization': `Bearer ${token}`,
    },
  };
}
