/**
 * Test Helpers
 * 
 * Common utilities for testing:
 * - Mock authentication/session
 * - Mock API clients
 * - Test data factories
 * - Assertion helpers
 */

/**
 * Mock session for testing
 */
export function createMockSession(overrides = {}) {
  return {
    user: {
      id: overrides.userId || 'test-user-id',
      email: overrides.email || 'test@example.com',
      role: overrides.role || 'student',
      orgId: overrides.orgId || null,
      org_id: overrides.orgId || null,
      name: overrides.name || 'Test User',
      ...overrides.user,
    },
    expires: overrides.expires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

/**
 * Mock Next.js request with session
 * 
 * @param {Object} session - Mock session object (optional, defaults to createMockSession())
 * @param {Object} overrides - Additional request properties (method, url, headers, etc.)
 * @returns {Object} Mock Request object
 */
export function createMockRequest(session = null, overrides = {}) {
  const mockSession = session || createMockSession();
  
  return {
    headers: new Headers(overrides.headers || {}),
    cookies: {
      get: jest.fn(),
      set: jest.fn(),
      ...overrides.cookies,
    },
    method: overrides.method || 'GET',
    url: overrides.url || '/',
    ...overrides,
    // Add session to request (how Next.js auth works)
    _session: mockSession,
  };
}

/**
 * Mock Next.js response
 */
export function createMockResponse() {
  const res = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
  };
  return res;
}

/**
 * Mock React Query hooks
 */
export function createMockQueryResult(data, overrides = {}) {
  return {
    data: overrides.data !== undefined ? overrides.data : data,
    isLoading: overrides.isLoading || false,
    isError: overrides.isError || false,
    error: overrides.error || null,
    isSuccess: overrides.isSuccess !== undefined ? overrides.isSuccess : !overrides.isError,
    refetch: jest.fn(),
    ...overrides,
  };
}

/**
 * Mock React Query mutation
 */
export function createMockMutation(overrides = {}) {
  return {
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    reset: jest.fn(),
    isPending: overrides.isPending || false,
    isError: overrides.isError || false,
    isSuccess: overrides.isSuccess || false,
    error: overrides.error || null,
    data: overrides.data || null,
    ...overrides,
  };
}

/**
 * Wait for async operations
 */
export function waitFor(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for element to appear (for component tests)
 */
export async function waitForElement(container, selector, timeout = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = container.querySelector(selector);
    if (element) return element;
    await waitFor(100);
  }
  throw new Error(`Element ${selector} not found within ${timeout}ms`);
}

/**
 * Create test quiz data factory
 */
export function createQuizData(overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    title: overrides.title || 'Test Quiz',
    description: overrides.description || 'Test Description',
    quizType: overrides.quizType || 'main_course',
    courseId: overrides.courseId || null,
    orgId: overrides.orgId || null,
    totalMarks: overrides.totalMarks || 100,
    passingMarks: overrides.passingMarks || 50,
    timeLimitMinutes: overrides.timeLimitMinutes || 30,
    maxAttempts: overrides.maxAttempts || 1,
    status: overrides.status || 'draft',
    questions: overrides.questions || [],
    ...overrides,
  };
}

/**
 * Create test question data factory
 */
export function createQuestionData(overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    questionText: overrides.questionText || 'Test Question?',
    questionType: overrides.questionType || 'multiple_choice',
    marks: overrides.marks || 10,
    orderIndex: overrides.orderIndex || 1,
    options: overrides.options || [],
    ...overrides,
  };
}

/**
 * Create test attempt data factory
 */
export function createAttemptData(overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    quizId: overrides.quizId || crypto.randomUUID(),
    studentId: overrides.studentId || crypto.randomUUID(),
    marksObtained: overrides.marksObtained || 0,
    totalMarks: overrides.totalMarks || 100,
    percentageScore: overrides.percentageScore || 0,
    isPassed: overrides.isPassed || false,
    status: overrides.status || 'submitted',
    startedAt: overrides.startedAt || new Date().toISOString(),
    submittedAt: overrides.submittedAt || new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock API client
 */
export function createMockApiClient() {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  };
}

/**
 * Assert API response structure
 */
export function expectApiResponse(response, expectedSuccess = true) {
  expect(response).toHaveProperty('success');
  expect(response.success).toBe(expectedSuccess);
  
  if (expectedSuccess) {
    expect(response).not.toHaveProperty('error');
  } else {
    expect(response).toHaveProperty('error');
    expect(typeof response.error).toBe('string');
  }
}

/**
 * Assert pagination structure
 */
export function expectPagination(pagination) {
  expect(pagination).toHaveProperty('page');
  expect(pagination).toHaveProperty('limit');
  expect(pagination).toHaveProperty('total');
  expect(pagination).toHaveProperty('totalPages');
  expect(typeof pagination.page).toBe('number');
  expect(typeof pagination.limit).toBe('number');
  expect(typeof pagination.total).toBe('number');
  expect(typeof pagination.totalPages).toBe('number');
}

export default {
  createMockSession,
  createMockRequest,
  createMockResponse,
  createMockQueryResult,
  createMockMutation,
  waitFor,
  waitForElement,
  createQuizData,
  createQuestionData,
  createAttemptData,
  createMockApiClient,
  expectApiResponse,
  expectPagination,
};

