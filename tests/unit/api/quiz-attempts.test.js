/**
 * Unit Tests for Quiz Attempts API
 * 
 * Tests GET endpoint with role-based scoping
 */

import { GET } from '@/app/api/quiz-attempts/route.js';
import { createMockRequest, createMockSession, expectApiResponse } from '../../setup/test-helpers.js';

jest.mock('@/lib/auth/guards.js', () => ({
  requireRole: jest.fn(),
}));

jest.mock('@/lib/db/index.js', () => ({
  query: jest.fn(),
}));

import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

describe('Quiz Attempts API', () => {
  let mockSession;
  const testUserId = 'test-student-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = createMockSession({ role: 'student', userId: testUserId });
    requireRole.mockResolvedValue(mockSession);
  });

  describe('GET /api/quiz-attempts', () => {
    it('should return attempts for student (own attempts only)', async () => {
      const mockAttempts = [
        {
          id: '1',
          quiz_id: 'quiz-1',
          student_id: testUserId,
          marks_obtained: 80,
          percentage_score: 80,
          is_passed: true,
          status: 'submitted',
        },
      ];

      query.mockResolvedValueOnce({ rows: [{ total: '1' }] });
      query.mockResolvedValueOnce({
        rows: mockAttempts.map(a => ({
          ...a,
          total_marks: 100,
          started_at: new Date(),
          submitted_at: new Date(),
          created_at: new Date(),
          quiz_title: 'Test Quiz',
        })),
      });

      const request = createMockRequest(mockSession);
      request.url = 'http://localhost:3000/api/quiz-attempts?page=1&limit=20';

      const response = await GET(request);
      const data = await response.json();

      expectApiResponse(data, true);
      expect(data.attempts).toBeDefined();
      expect(Array.isArray(data.attempts)).toBe(true);
      // Verify student can only see their own attempts
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("qa.student_id = $"),
        expect.arrayContaining([testUserId])
      );
    });

    it('should return attempts for instructor (their quizzes only)', async () => {
      const instructorSession = createMockSession({ role: 'instructor' });
      requireRole.mockResolvedValueOnce(instructorSession);

      query.mockResolvedValueOnce({ rows: [{ total: '0' }] });
      query.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest(instructorSession);
      request.url = 'http://localhost:3000/api/quiz-attempts';

      await GET(request);

      // Verify instructor filter includes their quizzes
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("q.created_by = $"),
        expect.any(Array)
      );
    });

    it('should filter by quizId', async () => {
      query.mockResolvedValueOnce({ rows: [{ total: '0' }] });
      query.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest(mockSession);
      request.url = 'http://localhost:3000/api/quiz-attempts?quizId=test-quiz-id';

      await GET(request);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("qa.quiz_id = $"),
        expect.arrayContaining(['test-quiz-id'])
      );
    });
  });
});

