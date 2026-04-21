/**
 * Test Database Utilities
 * 
 * Provides database connection and utilities for testing
 * Uses transactions for test isolation
 */

import { query, getClient } from '@/lib/db/index.js';

let testClient = null;
let transactionStarted = false;

/**
 * Get a test database client
 * Creates a new client for each test suite
 */
export async function getTestClient() {
  if (!testClient) {
    testClient = await getClient();
  }
  return testClient;
}

/**
 * Start a transaction for test isolation
 * All queries in the test will be rolled back
 */
export async function startTransaction() {
  const client = await getTestClient();
  await client.query('BEGIN');
  transactionStarted = true;
}

/**
 * Rollback transaction (cleanup)
 */
export async function rollbackTransaction() {
  if (testClient && transactionStarted) {
    await testClient.query('ROLLBACK');
    transactionStarted = false;
  }
}

/**
 * Commit transaction (use sparingly in tests)
 */
export async function commitTransaction() {
  if (testClient && transactionStarted) {
    await testClient.query('COMMIT');
    transactionStarted = false;
  }
}

/**
 * Cleanup test database client
 */
export async function cleanupTestDb() {
  if (testClient) {
    if (transactionStarted) {
      await rollbackTransaction();
    }
    testClient.release();
    testClient = null;
  }
}

/**
 * Execute query in test transaction
 */
export async function testQuery(sql, params = []) {
  const client = await getTestClient();
  return await client.query(sql, params);
}

/**
 * Create test user
 */
export async function createTestUser(overrides = {}) {
  const userId = overrides.id || crypto.randomUUID();
  const email = overrides.email || `test-${Date.now()}@example.com`;
  const role = overrides.role || 'student';
  const orgId = overrides.orgId || null;

  await testQuery(
    `INSERT INTO users (id, email, role, org_id, first_name, last_name, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [
      userId,
      email,
      role,
      orgId,
      overrides.firstName || 'Test',
      overrides.lastName || 'User',
    ]
  );

  return { id: userId, email, role, orgId };
}

/**
 * Create test organization
 */
export async function createTestOrg(overrides = {}) {
  const orgId = overrides.id || crypto.randomUUID();
  const name = overrides.name || `Test Org ${Date.now()}`;

  await testQuery(
    `INSERT INTO organizations (id, name, created_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [orgId, name]
  );

  return { id: orgId, name };
}

/**
 * Create test course
 */
export async function createTestCourse(overrides = {}) {
  const courseId = overrides.id || crypto.randomUUID();
  const title = overrides.title || `Test Course ${Date.now()}`;
  const createdBy = overrides.createdBy || (await createTestUser({ role: 'instructor' })).id;
  const orgId = overrides.orgId || null;

  await testQuery(
    `INSERT INTO courses (id, title, created_by, org_id, status, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [courseId, title, createdBy, orgId, overrides.status || 'published']
  );

  return { id: courseId, title, createdBy, orgId };
}

/**
 * Create test quiz
 */
export async function createTestQuiz(overrides = {}) {
  const quizId = overrides.id || crypto.randomUUID();
  const title = overrides.title || `Test Quiz ${Date.now()}`;
  const createdBy = overrides.createdBy || (await createTestUser({ role: 'instructor' })).id;
  const courseId = overrides.courseId || null;
  const orgId = overrides.orgId || null;
  const quizType = overrides.quizType || 'main_course';

  await testQuery(
    `INSERT INTO quizzes (
      id, title, created_by, course_id, org_id, quiz_type,
      total_marks, passing_marks, max_attempts, status, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (id) DO NOTHING`,
    [
      quizId,
      title,
      createdBy,
      courseId,
      orgId,
      quizType,
      overrides.totalMarks || 100,
      overrides.passingMarks || 50,
      overrides.maxAttempts || 1,
      overrides.status || 'draft',
    ]
  );

  return { id: quizId, title, createdBy, courseId, orgId, quizType };
}

/**
 * Create test quiz question
 */
export async function createTestQuestion(quizId, overrides = {}) {
  const questionId = overrides.id || crypto.randomUUID();
  const questionText = overrides.questionText || `Test Question ${Date.now()}`;
  const questionType = overrides.questionType || 'multiple_choice';

  await testQuery(
    `INSERT INTO quiz_questions (
      id, quiz_id, question_text, question_type, marks, order_index, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (id) DO NOTHING`,
    [
      questionId,
      quizId,
      questionText,
      questionType,
      overrides.marks || 10,
      overrides.orderIndex || 1,
    ]
  );

  return { id: questionId, questionText, questionType };
}

/**
 * Create test quiz attempt
 */
export async function createTestAttempt(overrides = {}) {
  const attemptId = overrides.id || crypto.randomUUID();
  const quizId = overrides.quizId || (await createTestQuiz()).id;
  const studentId = overrides.studentId || (await createTestUser({ role: 'student' })).id;

  await testQuery(
    `INSERT INTO quiz_attempts (
      id, quiz_id, student_id, marks_obtained, percentage_score,
      is_passed, status, started_at, submitted_at, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
    ON CONFLICT (id) DO NOTHING`,
    [
      attemptId,
      quizId,
      studentId,
      overrides.marksObtained || 0,
      overrides.percentageScore || 0,
      overrides.isPassed || false,
      overrides.status || 'submitted',
    ]
  );

  return { id: attemptId, quizId, studentId };
}

/**
 * Cleanup all test data (use in afterAll)
 */
export async function cleanupAllTestData() {
  // Rollback transaction will handle cleanup if using transactions
  await rollbackTransaction();
}

export default {
  getTestClient,
  startTransaction,
  rollbackTransaction,
  commitTransaction,
  cleanupTestDb,
  testQuery,
  createTestUser,
  createTestOrg,
  createTestCourse,
  createTestQuiz,
  createTestQuestion,
  createTestAttempt,
  cleanupAllTestData,
};

