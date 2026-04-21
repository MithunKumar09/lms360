/**
 * Unit Tests for Quizzes API
 * 
 * Tests GET, POST endpoints with quizType, miniCourseId, cohortIds support
 */

import { GET, POST } from '@/app/api/quizzes/route.js';
import { createMockRequest, createMockSession, expectApiResponse, expectPagination } from '../../setup/test-helpers.js';

// Mock auth guards
jest.mock('@/lib/auth/guards.js', () => ({
  requireRole: jest.fn(),
}));

// Mock database
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('@/lib/db/index.js', () => ({
  query: jest.fn(),
  getClient: jest.fn(() => Promise.resolve(mockClient)),
}));

import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

describe('Quizzes API', () => {
  let mockSession;
  const testOrgId = 'test-org-id';
  const testUserId = 'test-user-id';
  const testCourseId = 'test-course-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.query.mockClear();
    mockClient.release.mockClear();
    mockSession = createMockSession({ role: 'instructor', userId: testUserId, orgId: testOrgId });
    requireRole.mockResolvedValue(mockSession);
  });

  describe('GET /api/quizzes', () => {
    it('should return quizzes for instructor', async () => {
      const mockQuizzes = [
        {
          id: '1',
          title: 'Test Quiz',
          course_id: testCourseId,
          quiz_type: 'main_course',
          status: 'draft',
        },
      ];

      query.mockResolvedValueOnce({ rows: [{ total: '1' }] });
      query.mockResolvedValueOnce({
        rows: mockQuizzes.map(q => ({
          ...q,
          org_id: testOrgId,
          created_by: testUserId,
          mini_course_id: null,
          admin_id: null,
          cohort_ids: null,
          description: 'Test Description',
          instructions: null,
          total_marks: 100,
          passing_marks: 50,
          time_limit_minutes: 30,
          max_attempts: 1,
          show_results_immediately: false,
          show_correct_answers: false,
          randomize_questions: false,
          randomize_options: false,
          start_date: null,
          end_date: null,
          created_at: new Date(),
          updated_at: new Date(),
          course_title: 'Test Course',
          course_slug: 'test-course',
          org_name: 'Test Org',
          mini_course_title: null,
          mini_course_cover_photo: null,
        })),
      });

      const request = createMockRequest(mockSession);
      request.url = 'http://localhost:3000/api/quizzes?page=1&limit=20';

      const response = await GET(request);
      const data = await response.json();

      expectApiResponse(data, true);
      expect(data.quizzes).toBeDefined();
      expect(Array.isArray(data.quizzes)).toBe(true);
      expectPagination(data.pagination);
    });

    it('should filter by quizType', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] }) // Count query
        .mockResolvedValueOnce({ rows: [] }); // Quizzes query

      const request = createMockRequest(mockSession);
      request.url = 'http://localhost:3000/api/quizzes?quizType=main_course';

      await GET(request);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("q.quiz_type = $"),
        expect.arrayContaining(['main_course'])
      );
    });

    it('should filter by miniCourseId', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] }) // Count query
        .mockResolvedValueOnce({ rows: [] }); // Quizzes query

      const request = createMockRequest(mockSession);
      request.url = 'http://localhost:3000/api/quizzes?miniCourseId=test-id';

      await GET(request);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("q.mini_course_id = $"),
        expect.arrayContaining(['test-id'])
      );
    });

    it('should support student view filtering', async () => {
      const studentSession = createMockSession({ role: 'student' });
      requireRole.mockResolvedValueOnce(studentSession);

      query
        .mockResolvedValueOnce({ rows: [] }) // Enrolled courses query (empty - no enrolled courses)
        .mockResolvedValueOnce({ rows: [{ total: '0' }] }) // Count query
        .mockResolvedValueOnce({ rows: [] }); // Quizzes query

      const request = createMockRequest(studentSession);
      request.url = 'http://localhost:3000/api/quizzes?studentView=true';

      await GET(request);

      // Should filter to published quizzes only
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("q.status = 'published'"),
        expect.any(Array)
      );
    });
  });

  describe('POST /api/quizzes', () => {
    it('should create main_course quiz', async () => {
      const newQuiz = {
        courseId: testCourseId,
        quizType: 'main_course',
        title: 'New Quiz',
        description: 'Test Description',
        totalMarks: 100,
        passingMarks: 50,
        questions: [
          {
            questionText: 'Test Question?',
            questionType: 'multiple_choice',
            marks: 10,
            options: [
              { optionText: 'Option 1', isCorrect: true },
              { optionText: 'Option 2', isCorrect: false },
            ],
          },
        ],
      };

      // Mock course check query (for instructor role validation)
      query.mockResolvedValueOnce({
        rows: [{
          id: testCourseId,
          created_by: testUserId,
          org_id: testOrgId,
        }],
      });

      // Mock transaction: BEGIN, INSERT quiz, INSERT question, INSERT options, COMMIT
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 'new-quiz-id',
            created_at: new Date(),
            updated_at: new Date(),
          }],
        }) // INSERT quiz
        .mockResolvedValueOnce({
          rows: [{ id: 'question-id' }],
        }) // INSERT question
        .mockResolvedValueOnce({}) // INSERT option 1
        .mockResolvedValueOnce({}) // INSERT option 2
        .mockResolvedValueOnce({}); // COMMIT

      const request = createMockRequest(mockSession);
      request.json = jest.fn().mockResolvedValue(newQuiz);

      const response = await POST(request);
      const data = await response.json();

      expectApiResponse(data, true);
      expect(data.quiz).toBeDefined();
      expect(data.quiz.quizType).toBe('main_course');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should require courseId for main_course type', async () => {
      const invalidQuiz = {
        quizType: 'main_course',
        title: 'Test Quiz',
        // Missing courseId
        questions: [],
      };

      const request = createMockRequest(mockSession);
      request.json = jest.fn().mockResolvedValue(invalidQuiz);

      const response = await POST(request);
      let data;
      if (typeof response.json === 'function') {
        data = await response.json();
      } else {
        data = JSON.parse(await response.text());
      }

      expectApiResponse(data, false);
      expect(data.error).toContain('Course ID is required');
    });

    it('should create global quiz for admin', async () => {
      const adminSession = createMockSession({ role: 'admin', orgId: testOrgId });
      requireRole.mockResolvedValueOnce(adminSession);

      const globalQuiz = {
        quizType: 'global',
        title: 'Global Quiz',
        description: 'Test',
        adminId: adminSession.user.id,
        questions: [
          {
            questionText: 'Test Question?',
            questionType: 'short_answer',
            marks: 10,
          },
        ],
      };

      // Mock transaction
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 'global-quiz-id',
            created_at: new Date(),
            updated_at: new Date(),
          }],
        }) // INSERT quiz
        .mockResolvedValueOnce({
          rows: [{ id: 'question-id' }],
        }) // INSERT question
        .mockResolvedValueOnce({}); // COMMIT

      const request = createMockRequest(adminSession);
      request.json = jest.fn().mockResolvedValue(globalQuiz);

      const response = await POST(request);
      const data = await response.json();

      expectApiResponse(data, true);
      expect(data.quiz.quizType).toBe('global');
    });

    it('should validate questions array', async () => {
      const invalidQuiz = {
        courseId: testCourseId,
        quizType: 'main_course',
        title: 'Test Quiz',
        questions: null, // Invalid
      };

      const request = createMockRequest(mockSession);
      request.json = jest.fn().mockResolvedValue(invalidQuiz);

      const response = await POST(request);
      const data = await response.json();

      expectApiResponse(data, false);
    });
  });
});

