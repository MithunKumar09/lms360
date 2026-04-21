/**
 * Unit Tests for Parent API Access Restrictions
 * 
 * Tests that parents can ONLY access their linked children's data
 */

import { GET } from '@/app/api/parent/students/[studentId]/progress/route.js';
import { createMockRequest, createMockSession } from '../../../setup/test-helpers.js';
import { verifyParentStudentRelationship } from '@/lib/auth/parentPermissions.js';

// Mock auth guards
jest.mock('@/lib/auth/guards.js', () => ({
  requireRole: jest.fn(),
}));

// Mock parent permissions
jest.mock('@/lib/auth/parentPermissions.js', () => ({
  canViewStudentProgress: jest.fn(),
  verifyParentStudentRelationship: jest.fn(),
}));

// Mock database
const mockQuery = jest.fn();
jest.mock('@/lib/db/index.js', () => ({
  query: (...args) => mockQuery(...args),
}));

// Mock parent database functions
jest.mock('@/lib/db/parent/students.js', () => ({
  verifyParentAccessToStudent: jest.fn(),
}));

// Mock parent progress functions
jest.mock('@/lib/db/parent/progress.js', () => ({
  getStudentProgressOverview: jest.fn(),
}));

import { requireRole } from '@/lib/auth/guards.js';
import { verifyParentAccessToStudent } from '@/lib/db/parent/students.js';
import { getStudentProgressOverview } from '@/lib/db/parent/progress.js';

describe('Parent API Access Restrictions', () => {
  let mockSession;
  const testParentId = 'parent-user-id';
  const testOrgId = 'test-org-id';
  const testLinkedStudentId = 'linked-student-id';
  const testUnlinkedStudentId = 'unlinked-student-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = createMockSession({ 
      role: 'parent', 
      userId: testParentId, 
      orgId: testOrgId 
    });
    requireRole.mockResolvedValue(mockSession);
  });

  describe('Access to Linked Students', () => {
    it('should allow access to linked student data', async () => {
      const { canViewStudentProgress } = require('@/lib/auth/parentPermissions.js');
      
      verifyParentStudentRelationship.mockResolvedValueOnce(true);
      canViewStudentProgress.mockResolvedValueOnce(true);

      const mockProgressData = {
        totalEnrollments: 5,
        averageCompletion: 75,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockProgressData }],
      });

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testLinkedStudentId}/progress` });
      const response = await GET(request, { params: { studentId: testLinkedStudentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(verifyParentStudentRelationship).toHaveBeenCalledWith(
        testParentId,
        testLinkedStudentId,
        testOrgId
      );
    });

    it('should deny access to unlinked student data', async () => {
      const { canViewStudentProgress } = require('@/lib/auth/parentPermissions.js');
      
      verifyParentStudentRelationship.mockResolvedValueOnce(false);

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testUnlinkedStudentId}/progress` });
      const response = await GET(request, { params: { studentId: testUnlinkedStudentId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Access denied');
      expect(verifyParentStudentRelationship).toHaveBeenCalledWith(
        testParentId,
        testUnlinkedStudentId,
        testOrgId
      );
      // Should not check permissions if relationship doesn't exist
      expect(canViewStudentProgress).not.toHaveBeenCalled();
    });

    it('should verify relationship before checking permissions', async () => {
      const { canViewStudentProgress } = require('@/lib/auth/parentPermissions.js');
      
      // Relationship check fails first
      verifyParentStudentRelationship.mockResolvedValueOnce(false);

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testUnlinkedStudentId}/progress` });
      const response = await GET(request, { params: { studentId: testUnlinkedStudentId } });

      // Verify relationship check happens first
      expect(verifyParentStudentRelationship).toHaveBeenCalledBefore(canViewStudentProgress);
    });
  });

  describe('Cross-Organization Access Prevention', () => {
    it('should prevent access to students from different organizations', async () => {
      const differentOrgId = 'different-org-id';
      const differentOrgStudentId = 'different-org-student-id';

      verifyParentStudentRelationship.mockResolvedValueOnce(false);

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${differentOrgStudentId}/progress` });
      const response = await GET(request, { params: { studentId: differentOrgStudentId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(verifyParentStudentRelationship).toHaveBeenCalledWith(
        testParentId,
        differentOrgStudentId,
        testOrgId // Should use parent's orgId, not student's
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing studentId parameter', async () => {
      const request = createMockRequest('GET', '/api/parent/students//progress', mockSession);
      
      // This should be handled by Next.js routing, but test the API handler
      await expect(GET(request, { params: { studentId: null } })).rejects.toThrow();
    });

    it('should handle invalid studentId format', async () => {
      const invalidStudentId = 'invalid-format-123';
      
      verifyParentStudentRelationship.mockResolvedValueOnce(false);

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${invalidStudentId}/progress` });
      const response = await GET(request, { params: { studentId: invalidStudentId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should handle database errors during relationship verification', async () => {
      verifyParentStudentRelationship.mockRejectedValueOnce(new Error('Database error'));

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testLinkedStudentId}/progress` });
      const response = await GET(request, { params: { studentId: testLinkedStudentId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed');
    });
  });
});
