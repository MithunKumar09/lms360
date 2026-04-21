/**
 * Unit Tests for Parent Permissions
 * 
 * Tests permission checks for:
 * - can_view_progress
 * - can_view_attendance
 * - can_view_achievements
 * - can_view_activity_log
 * - can_view_engagement_stats
 */

import { GET } from '@/app/api/parent/students/[studentId]/progress/route.js';
import { createMockRequest, createMockSession } from '../../../setup/test-helpers.js';
import { canViewStudentProgress } from '@/lib/auth/parentPermissions.js';

// Mock auth guards
jest.mock('@/lib/auth/guards.js', () => ({
  requireRole: jest.fn(),
}));

// Mock parent permissions
jest.mock('@/lib/auth/parentPermissions.js', () => ({
  canViewStudentProgress: jest.fn(),
  canViewAttendance: jest.fn(),
  canViewAchievements: jest.fn(),
  canViewActivityLog: jest.fn(),
  getParentAccessSettings: jest.fn(),
  getParentStudentLinkPermissions: jest.fn(),
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

describe('Parent Permissions API', () => {
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

  describe('GET /api/parent/students/[studentId]/progress', () => {
    it('should allow access when can_view_progress is true', async () => {
      verifyParentAccessToStudent.mockResolvedValueOnce(true);
      canViewStudentProgress.mockResolvedValueOnce(true);

      const mockProgressData = {
        totalEnrollments: 5,
        averageCompletion: 75,
        attendancePercentage: 90,
        overallGrade: 'A',
        readinessScore: 85,
        milestonesCompleted: 10,
      };

      getStudentProgressOverview.mockResolvedValueOnce(mockProgressData);

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testStudentId}/progress` });
      const response = await GET(request, { params: { studentId: testStudentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(canViewStudentProgress).toHaveBeenCalledWith(
        'parent',
        testParentId,
        testStudentId,
        testOrgId
      );
    });

    it('should deny access when can_view_progress is false', async () => {
      canViewStudentProgress.mockResolvedValueOnce(false);

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testStudentId}/progress` });
      const response = await GET(request, { params: { studentId: testStudentId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Access denied');
      expect(canViewStudentProgress).toHaveBeenCalledWith(
        'parent',
        testParentId,
        testStudentId,
        testOrgId
      );
    });

    it('should check parent-student relationship exists', async () => {
      canViewStudentProgress.mockResolvedValueOnce(true);
      
      // Mock no relationship found
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testStudentId}/progress` });
      const response = await GET(request, { params: { studentId: testStudentId } });
      const data = await response.json();

      // Should still check permission first, but if no data found, return appropriate response
      expect(canViewStudentProgress).toHaveBeenCalled();
    });
  });

  describe('Permission Priority Resolution', () => {
    it('should prioritize per-student settings over per-parent settings', async () => {
      const { getParentAccessSettings } = require('@/lib/auth/parentPermissions.js');
      
      // Mock per-student override
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ can_view_progress: false }], // Per-student override
        })
        .mockResolvedValueOnce({
          rows: [{ can_view_progress: true }], // Per-parent default (should be ignored)
        });

      const settings = await getParentAccessSettings(testParentId, testStudentId, testOrgId);

      expect(settings.can_view_progress).toBe(false);
    });

    it('should fall back to per-parent settings when no per-student override', async () => {
      const { getParentAccessSettings } = require('@/lib/auth/parentPermissions.js');
      
      // Mock no per-student override, but per-parent default exists
      mockQuery
        .mockResolvedValueOnce({
          rows: [], // No per-student override
        })
        .mockResolvedValueOnce({
          rows: [{ can_view_progress: false }], // Per-parent default
        });

      const settings = await getParentAccessSettings(testParentId, testStudentId, testOrgId);

      expect(settings.can_view_progress).toBe(false);
    });

    it('should fall back to org-wide settings when no per-parent settings', async () => {
      const { getParentAccessSettings } = require('@/lib/auth/parentPermissions.js');
      
      // Mock no per-student or per-parent, but org-wide default exists
      mockQuery
        .mockResolvedValueOnce({
          rows: [], // No per-student override
        })
        .mockResolvedValueOnce({
          rows: [], // No per-parent default
        })
        .mockResolvedValueOnce({
          rows: [{ can_view_progress: true }], // Org-wide default
        });

      const settings = await getParentAccessSettings(testParentId, testStudentId, testOrgId);

      expect(settings.can_view_progress).toBe(true);
    });

    it('should default to all enabled when no settings exist', async () => {
      const { getParentAccessSettings } = require('@/lib/auth/parentPermissions.js');
      
      // Mock no settings at all
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // No per-student
        .mockResolvedValueOnce({ rows: [] }) // No per-parent
        .mockResolvedValueOnce({ rows: [] }); // No org-wide

      const settings = await getParentAccessSettings(testParentId, testStudentId, testOrgId);

      expect(settings.can_view_progress).toBe(true);
      expect(settings.can_view_attendance).toBe(true);
      expect(settings.can_view_achievements).toBe(true);
      expect(settings.can_view_activity_log).toBe(true);
      expect(settings.can_view_engagement_stats).toBe(true);
    });
  });
});
