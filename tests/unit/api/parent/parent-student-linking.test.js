/**
 * Unit Tests for Parent-Student Linking
 * 
 * Tests parent-student relationship validation and access control
 */

import { GET } from '@/app/api/parent/students/route.js';
import { createMockRequest, createMockSession } from '../../../setup/test-helpers.js';

// Mock auth guards
jest.mock('@/lib/auth/guards.js', () => ({
  requireRole: jest.fn(),
}));

// Mock database
const mockQuery = jest.fn();
jest.mock('@/lib/db/index.js', () => ({
  query: (...args) => mockQuery(...args),
}));

// Mock parent database functions
jest.mock('@/lib/db/parent/students.js', () => ({
  getParentStudents: jest.fn(),
  verifyParentAccessToStudent: jest.fn(),
}));

import { requireRole } from '@/lib/auth/guards.js';
import { getParentStudents } from '@/lib/db/parent/students.js';

describe('Parent-Student Linking API', () => {
  let mockSession;
  const testParentId = 'parent-user-id';
  const testOrgId = 'test-org-id';
  const testStudentId1 = 'student-1-id';
  const testStudentId2 = 'student-2-id';
  const testStudentId3 = 'student-3-id'; // Not linked

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = createMockSession({ 
      role: 'parent', 
      userId: testParentId, 
      orgId: testOrgId 
    });
    requireRole.mockResolvedValue(mockSession);
  });

  describe('GET /api/parent/students', () => {
    it('should return only linked children for the parent', async () => {
      // Mock database response - only linked students
      const mockLinkedStudents = [
        {
          id: testStudentId1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          relationship_type: 'son',
          can_view_progress: true,
          can_view_attendance: true,
          can_view_achievements: true,
          can_view_activity_log: true,
        },
        {
          id: testStudentId2,
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane.doe@example.com',
          relationship_type: 'daughter',
          can_view_progress: true,
          can_view_attendance: false,
          can_view_achievements: true,
          can_view_activity_log: true,
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockLinkedStudents,
      });

      const request = createMockRequest(mockSession, { method: 'GET', url: '/api/parent/students' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.students).toHaveLength(2);
      expect(data.students[0].id).toBe(testStudentId1);
      expect(data.students[1].id).toBe(testStudentId2);
      
      // Verify query was called with correct parameters
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('parent_student_links'),
        expect.arrayContaining([testParentId, testOrgId])
      );
    });

    it('should not return unlinked students', async () => {
      // Mock database response - empty (no linked students)
      getParentStudents.mockResolvedValueOnce([]);

      const request = createMockRequest(mockSession, { method: 'GET', url: '/api/parent/students' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.students).toHaveLength(0);
    });

    it('should require parent role', async () => {
      // Mock non-parent role
      const nonParentSession = createMockSession({ 
        role: 'student', 
        userId: 'student-id', 
        orgId: testOrgId 
      });
      requireRole.mockRejectedValueOnce(new Error('Access denied'));

      const request = createMockRequest('GET', '/api/parent/students');
      
      await expect(GET(request)).rejects.toThrow('Access denied');
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = createMockRequest(mockSession, { method: 'GET', url: '/api/parent/students' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to fetch linked children');
    });

    it('should include permission flags in student data', async () => {
      const mockLinkedStudents = [
        {
          id: testStudentId1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          relationship_type: 'son',
          can_view_progress: true,
          can_view_attendance: true,
          can_view_achievements: false,
          can_view_activity_log: true,
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockLinkedStudents,
      });

      const request = createMockRequest(mockSession, { method: 'GET', url: '/api/parent/students' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.students[0]).toHaveProperty('can_view_progress', true);
      expect(data.students[0]).toHaveProperty('can_view_attendance', true);
      expect(data.students[0]).toHaveProperty('can_view_achievements', false);
      expect(data.students[0]).toHaveProperty('can_view_activity_log', true);
    });
  });
});
