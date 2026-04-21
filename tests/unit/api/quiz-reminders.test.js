/**
 * Unit Tests for Quiz Reminders API
 * 
 * Tests POST, GET, DELETE endpoints
 */

import { POST, GET } from '@/app/api/quiz-reminders/route.js';
import { DELETE } from '@/app/api/quiz-reminders/[id]/route.js';
import { createMockRequest, createMockSession, expectApiResponse } from '../../setup/test-helpers.js';

jest.mock('@/lib/auth/guards.js', () => ({
  requireRole: jest.fn(),
}));

jest.mock('@/lib/db/index.js', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

describe('Quiz Reminders API', () => {
  let mockSession;
  const testUserId = 'test-student-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = createMockSession({ role: 'student', userId: testUserId });
    requireRole.mockResolvedValue(mockSession);
  });

  describe('POST /api/quiz-reminders', () => {
    it('should create reminder with valid data', async () => {
      const newReminder = {
        quizId: 'test-quiz-id',
        reminderType: 'email',
        reminderTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      // Mock quiz check query (POST endpoint checks if quiz exists)
      query.mockResolvedValueOnce({
        rows: [{
          id: 'test-quiz-id',
          title: 'Test Quiz',
          status: 'published',
        }],
      });
      // Mock reminder insert query
      query.mockResolvedValueOnce({
        rows: [{
          id: 'new-reminder-id',
          quiz_id: newReminder.quizId,
          student_id: testUserId,
          reminder_type: newReminder.reminderType,
          reminder_time: newReminder.reminderTime,
          is_sent: false,
          sent_at: null,
          created_at: new Date(),
        }],
      });

      const request = createMockRequest(mockSession);
      request.json = jest.fn().mockResolvedValue(newReminder);

      const response = await POST(request);
      const data = await response.json();

      expectApiResponse(data, true);
      expect(data.reminder).toBeDefined();
    });

    it('should reject past reminder time', async () => {
      const invalidReminder = {
        quizId: 'test-quiz-id',
        reminderType: 'email',
        reminderTime: new Date(Date.now() - 1000).toISOString(), // Past time
      };

      const request = createMockRequest(mockSession);
      request.json = jest.fn().mockResolvedValue(invalidReminder);

      const response = await POST(request);
      const data = await response.json();

      expectApiResponse(data, false);
      expect(data.error).toContain('future');
    });

    it('should validate reminder type', async () => {
      const invalidReminder = {
        quizId: 'test-quiz-id',
        reminderType: 'invalid_type',
        reminderTime: new Date(Date.now() + 1000).toISOString(),
      };

      const request = createMockRequest(mockSession);
      request.json = jest.fn().mockResolvedValue(invalidReminder);

      const response = await POST(request);
      const data = await response.json();

      expectApiResponse(data, false);
    });
  });

  describe('GET /api/quiz-reminders', () => {
    it('should return reminders for student', async () => {
      const mockReminders = [
        {
          id: '1',
          quiz_id: 'quiz-1',
          student_id: testUserId,
          reminder_type: 'email',
          reminder_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
          is_sent: false,
        },
      ];

      query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // Count query
        .mockResolvedValueOnce({
          rows: mockReminders.map(r => ({
            ...r,
            quiz_title: 'Test Quiz',
            student_email: 'student@example.com',
            sent_at: null,
            created_at: new Date(),
          })),
        }); // Reminders query

      const request = createMockRequest(mockSession);
      request.url = 'http://localhost:3000/api/quiz-reminders';

      const response = await GET(request);
      const data = await response.json();

      expectApiResponse(data, true);
      expect(data.reminders).toBeDefined();
      expect(Array.isArray(data.reminders)).toBe(true);
    });
  });

  describe('DELETE /api/quiz-reminders/[id]', () => {
    it('should delete reminder owned by student', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 'reminder-id',
          quiz_id: 'quiz-id',
          student_id: testUserId,
          org_id: null,
          created_by: null,
          course_id: null,
        }],
      }); // First query: get reminder
      query.mockResolvedValueOnce({
        rows: [{ id: 'reminder-id' }],
      }); // Second query: delete reminder

      const request = createMockRequest(mockSession);
      const params = { id: 'reminder-id' };

      const response = await DELETE(request, { params });
      const data = await response.json();

      expectApiResponse(data, true);
    });

    it('should reject deletion of other student\'s reminder', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 'reminder-id',
          quiz_id: 'quiz-id',
          student_id: 'other-student-id',
          org_id: null,
          created_by: null,
          course_id: null,
        }],
      });

      const request = createMockRequest(mockSession);
      const params = { id: 'reminder-id' };

      const response = await DELETE(request, { params });
      const data = await response.json();

      expectApiResponse(data, false);
      expect(response.status).toBe(403);
    });
  });
});

