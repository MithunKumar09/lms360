/**
 * Integration Tests for Lesson Access Control
 * 
 * Tests payment verification for lesson access
 */

import { GET } from '@/app/api/courses/[id]/lessons/[lessonId]/route.js';
import { checkLessonAccess } from '@/lib/middleware/checkLessonAccess.js';
import { query } from '@/lib/db/index.js';
import { hasPaidAccess } from '@/lib/utils/paymentAccess.js';

// Mock dependencies
jest.mock('@/lib/db/index.js', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/utils/paymentAccess.js', () => ({
  hasPaidAccess: jest.fn(),
}));

jest.mock('@/app/api/auth/[...nextauth]/route.js', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/db/lessons/index.js', () => ({
  getLesson: jest.fn(),
  getAdjacentLessons: jest.fn(),
  getWatchProgress: jest.fn(),
}));

import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { getLesson } from '@/lib/db/lessons/index.js';

describe('Lesson Access Control Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkLessonAccess', () => {
    it('should allow access to free courses', async () => {
      const mockCourse = {
        id: 'course-123',
        price: 0,
        regular_price: 0,
        status: 'published',
      };

      query.mockResolvedValueOnce({ rows: [mockCourse] });

      const result = await checkLessonAccess('user-123', 'course-123', 'lesson-123');

      expect(result.hasAccess).toBe(true);
      expect(result.reason).toBe('Free course');
    });

    it('should allow access to course creator', async () => {
      const mockCourse = {
        id: 'course-123',
        price: 1000,
        regular_price: 1000,
        status: 'published',
        created_by: 'user-123', // User is creator
      };

      query.mockResolvedValueOnce({ rows: [mockCourse] });

      const result = await checkLessonAccess('user-123', 'course-123', 'lesson-123');

      expect(result.hasAccess).toBe(true);
      expect(result.reason).toBe('Course creator');
    });

    it('should allow access to preview lessons', async () => {
      const mockCourse = {
        id: 'course-123',
        price: 1000,
        regular_price: 1000,
        status: 'published',
        created_by: 'other-user',
      };

      const mockLesson = {
        id: 'lesson-123',
        is_preview: true,
      };

      query.mockResolvedValueOnce({ rows: [mockCourse] });
      query.mockResolvedValueOnce({ rows: [mockLesson] });

      const result = await checkLessonAccess('user-123', 'course-123', 'lesson-123');

      expect(result.hasAccess).toBe(true);
      expect(result.reason).toBe('Preview lesson');
    });

    it('should deny access if payment required and not paid', async () => {
      const mockCourse = {
        id: 'course-123',
        price: 1000,
        regular_price: 1000,
        status: 'published',
        created_by: 'other-user',
      };

      const mockLesson = {
        id: 'lesson-123',
        is_preview: false,
      };

      query.mockResolvedValueOnce({ rows: [mockCourse] });
      query.mockResolvedValueOnce({ rows: [mockLesson] });
      hasPaidAccess.mockResolvedValueOnce(false);

      const result = await checkLessonAccess('user-123', 'course-123', 'lesson-123');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Payment required');
      expect(result.statusCode).toBe(402);
    });

    it('should allow access if payment verified', async () => {
      const mockCourse = {
        id: 'course-123',
        price: 1000,
        regular_price: 1000,
        status: 'published',
        created_by: 'other-user',
      };

      const mockLesson = {
        id: 'lesson-123',
        is_preview: false,
      };

      query.mockResolvedValueOnce({ rows: [mockCourse] });
      query.mockResolvedValueOnce({ rows: [mockLesson] });
      hasPaidAccess.mockResolvedValueOnce(true);

      const result = await checkLessonAccess('user-123', 'course-123', 'lesson-123');

      expect(result.hasAccess).toBe(true);
      expect(result.reason).toBe('Paid access');
    });
  });

  describe('GET /api/courses/[id]/lessons/[lessonId]', () => {
    it('should return lesson if user has access', async () => {
      const mockSession = {
        user: { id: 'user-123' },
      };

      const mockCourse = {
        id: 'course-123',
        price: 0, // Free course
        status: 'published',
      };

      const mockLesson = {
        id: 'lesson-123',
        course_id: 'course-123',
        title: 'Test Lesson',
        duration: 300,
        is_preview: false,
      };

      auth.mockResolvedValueOnce(mockSession);
      query.mockResolvedValueOnce({ rows: [mockCourse] });
      query.mockResolvedValueOnce({ rows: [mockLesson] });
      getLesson.mockResolvedValueOnce(mockLesson);
      hasPaidAccess.mockResolvedValueOnce(true);

      const request = {
        headers: new Headers(),
      };

      const params = {
        id: 'course-123',
        lessonId: 'lesson-123',
      };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.lesson).toBeDefined();
    });

    it('should return 402 if payment required', async () => {
      const mockSession = {
        user: { id: 'user-123' },
      };

      const mockCourse = {
        id: 'course-123',
        price: 1000,
        regular_price: 1000,
        status: 'published',
        created_by: 'other-user',
      };

      auth.mockResolvedValueOnce(mockSession);
      query.mockResolvedValueOnce({ rows: [mockCourse] });
      query.mockResolvedValueOnce({ rows: [{ is_preview: false }] });
      hasPaidAccess.mockResolvedValueOnce(false);

      const request = {
        headers: new Headers(),
      };

      const params = {
        id: 'course-123',
        lessonId: 'lesson-123',
      };

      const response = await GET(request, { params });

      expect(response.status).toBe(402);
    });
  });
});

