/**
 * Unit Tests for Parent Dashboard Edge Cases
 * 
 * Tests edge cases and error scenarios
 */

import { GET } from '@/app/api/parent/students/route.js';
import { GET as GETProgress } from '@/app/api/parent/students/[studentId]/progress/route.js';
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

import { requireRole } from '@/lib/auth/guards.js';

describe('Parent Dashboard Edge Cases', () => {
  let mockSession;
  const testParentId = 'parent-user-id';
  const testOrgId = 'test-org-id';
  const testStudentId = 'student-1-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = createMockSession({ 
      role: 'parent', 
      userId: testParentId, 
      orgId: testOrgId 
    });
    requireRole.mockResolvedValue(mockSession);
  });

  describe('Missing Organization Context', () => {
    it('should reject parent without orgId', async () => {
      const parentWithoutOrg = createMockSession({ 
        role: 'parent', 
        userId: testParentId, 
        orgId: null 
      });
      requireRole.mockResolvedValueOnce(parentWithoutOrg);

      const request = createMockRequest(parentWithoutOrg, { method: 'GET', url: '/api/parent/students' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('organization');
    });
  });

  describe('Invalid Student IDs', () => {
    it('should handle empty studentId', async () => {
      const { canViewStudentProgress, verifyParentStudentRelationship } = require('@/lib/auth/parentPermissions.js');
      verifyParentStudentRelationship.mockResolvedValueOnce(false);

      const request = createMockRequest(mockSession, { method: 'GET', url: '/api/parent/students//progress' });
      const response = await GETProgress(request, { params: { studentId: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Student ID is required');
    });

    it('should handle null studentId', async () => {
      const request = createMockRequest(mockSession, { method: 'GET', url: '/api/parent/students/null/progress' });
      const response = await GETProgress(request, { params: { studentId: null } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle malformed studentId', async () => {
      const { verifyParentStudentRelationship } = require('@/lib/auth/parentPermissions.js');
      verifyParentStudentRelationship.mockResolvedValueOnce(false);

      const malformedId = 'invalid-format-123-!@#';
      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${malformedId}/progress` });
      const response = await GETProgress(request, { params: { studentId: malformedId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection timeout'));

      const request = createMockRequest(mockSession, { method: 'GET', url: '/api/parent/students' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed');
    });

    it('should handle query syntax errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('syntax error at or near "SELECT"'));

      const request = createMockRequest(mockSession, { method: 'GET', url: '/api/parent/students' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle permission check errors', async () => {
      const { canViewStudentProgress } = require('@/lib/auth/parentPermissions.js');
      canViewStudentProgress.mockRejectedValueOnce(new Error('Permission check failed'));

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testStudentId}/progress` });
      const response = await GETProgress(request, { params: { studentId: testStudentId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('Concurrent Access Scenarios', () => {
    it('should handle multiple simultaneous requests for same student', async () => {
      const { canViewStudentProgress, verifyParentStudentRelationship } = require('@/lib/auth/parentPermissions.js');
      verifyParentStudentRelationship.mockResolvedValue(true);
      canViewStudentProgress.mockResolvedValue(true);

      mockQuery.mockResolvedValue({
        rows: [{
          totalEnrollments: 5,
          averageCompletion: 75,
        }],
      });

      const request1 = createMockRequest('GET', `/api/parent/students/${testStudentId}/progress`, mockSession);
      const request2 = createMockRequest('GET', `/api/parent/students/${testStudentId}/progress`, mockSession);

      const [response1, response2] = await Promise.all([
        GETProgress(request1, { params: { studentId: testStudentId } }),
        GETProgress(request2, { params: { studentId: testStudentId } }),
      ]);

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.success).toBe(true);
      expect(data2.success).toBe(true);
    });
  });

  describe('Permission State Changes', () => {
    it('should reflect permission changes immediately', async () => {
      const { canViewStudentProgress, verifyParentStudentRelationship } = require('@/lib/auth/parentPermissions.js');
      
      // First request: permission enabled
      verifyParentStudentRelationship.mockResolvedValueOnce(true);
      canViewStudentProgress.mockResolvedValueOnce(true);

      mockQuery.mockResolvedValueOnce({
        rows: [{ totalEnrollments: 5 }],
      });

      const request1 = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testStudentId}/progress` });
      const response1 = await GETProgress(request1, { params: { studentId: testStudentId } });
      const data1 = await response1.json();

      expect(data1.success).toBe(true);

      // Second request: permission disabled (admin changed settings)
      verifyParentStudentRelationship.mockResolvedValueOnce(true);
      canViewStudentProgress.mockResolvedValueOnce(false);

      const request2 = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testStudentId}/progress` });
      const response2 = await GETProgress(request2, { params: { studentId: testStudentId } });
      const data2 = await response2.json();

      expect(data2.success).toBe(false);
      expect(data2.error).toContain('Access denied');
    });
  });

  describe('Large Dataset Handling', () => {
    it('should handle parent with many linked students', async () => {
      const manyStudents = Array.from({ length: 100 }, (_, i) => ({
        id: `student-${i}`,
        first_name: `Student${i}`,
        last_name: 'Doe',
        email: `student${i}@example.com`,
      }));

      mockQuery.mockResolvedValueOnce({
        rows: manyStudents,
      });

      const request = createMockRequest(mockSession, { method: 'GET', url: '/api/parent/students' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.students).toHaveLength(100);
    });
  });
});
