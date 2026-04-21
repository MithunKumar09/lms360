/**
 * Unit Tests for Parent Access Settings
 * 
 * Tests feature enable/disable via parent_access_settings table
 */

import { GET } from '@/app/api/parent/students/[studentId]/activity/route.js';
import { GET as GETEngagement } from '@/app/api/parent/students/[studentId]/engagement/route.js';
import { createMockRequest, createMockSession } from '../../../setup/test-helpers.js';
import { 
  canViewActivityLog,
  canViewAchievements,
  getParentAccessSettings,
  getParentStudentLinkPermissions,
} from '@/lib/auth/parentPermissions.js';

// Mock auth guards
jest.mock('@/lib/auth/guards.js', () => ({
  requireRole: jest.fn(),
}));

// Mock parent permissions
jest.mock('@/lib/auth/parentPermissions.js', () => ({
  canViewActivityLog: jest.fn(),
  canViewAchievements: jest.fn(),
  getParentAccessSettings: jest.fn(),
  getParentStudentLinkPermissions: jest.fn(),
  verifyParentStudentRelationship: jest.fn(),
}));

// Mock database
const mockQuery = jest.fn();
jest.mock('@/lib/db/index.js', () => ({
  query: (...args) => mockQuery(...args),
}));

import { requireRole } from '@/lib/auth/guards.js';

describe('Parent Access Settings API', () => {
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

  describe('Activity Log Access Control', () => {
    it('should allow access when can_view_activity_log is enabled', async () => {
      canViewActivityLog.mockResolvedValueOnce(true);
      getParentAccessSettings.mockResolvedValueOnce({
        can_view_activity_log: true,
        can_view_engagement_stats: true,
      });

      const mockActivityData = {
        activity: {
          dailyLog: [
            { date: '2024-01-01', activitiesCount: 5, timeSpent: 3600, isActive: true },
          ],
        },
        engagement: {
          currentStreak: 5,
          totalTimeSpent: 18000,
          activeDaysCount: 7,
        },
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockActivityData }],
      });

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testStudentId}/activity` });
      const response = await GET(request, { params: { studentId: testStudentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(canViewActivityLog).toHaveBeenCalledWith(
        'parent',
        testParentId,
        testStudentId,
        testOrgId
      );
    });

    it('should deny access when can_view_activity_log is disabled', async () => {
      canViewActivityLog.mockResolvedValueOnce(false);

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testStudentId}/activity` });
      const response = await GET(request, { params: { studentId: testStudentId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Access denied');
    });

    it('should filter engagement stats when can_view_engagement_stats is disabled', async () => {
      canViewActivityLog.mockResolvedValueOnce(true);
      getParentAccessSettings.mockResolvedValueOnce({
        can_view_activity_log: true,
        can_view_engagement_stats: false, // Disabled
      });
      getParentStudentLinkPermissions.mockResolvedValueOnce({
        can_view_engagement_stats: false,
      });

      const mockActivityData = {
        activity: {
          dailyLog: [
            { date: '2024-01-01', activitiesCount: 5, timeSpent: 3600, isActive: true },
          ],
        },
        engagement: {
          currentStreak: 5,
          totalTimeSpent: 18000,
          activeDaysCount: 7,
        },
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockActivityData }],
      });

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testStudentId}/activity` });
      const response = await GET(request, { params: { studentId: testStudentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Engagement stats should be filtered out or null
      expect(data.engagement).toBeUndefined();
    });
  });

  describe('Engagement Stats Access Control', () => {
    it('should allow access when can_view_engagement_stats is enabled', async () => {
      getParentAccessSettings.mockResolvedValueOnce({
        can_view_engagement_stats: true,
      });
      getParentStudentLinkPermissions.mockResolvedValueOnce({
        can_view_engagement_stats: true,
      });

      const mockEngagementData = {
        currentStreak: 5,
        totalTimeSpent: 18000,
        activeDaysCount: 7,
        weeklyActivityCount: 25,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockEngagementData }],
      });

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testStudentId}/engagement` });
      const response = await GETEngagement(request, { params: { studentId: testStudentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.engagement).toBeDefined();
    });

    it('should deny access when can_view_engagement_stats is disabled', async () => {
      getParentAccessSettings.mockResolvedValueOnce({
        can_view_engagement_stats: false,
      });
      getParentStudentLinkPermissions.mockResolvedValueOnce({
        can_view_engagement_stats: false,
      });

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testStudentId}/engagement` });
      const response = await GETEngagement(request, { params: { studentId: testStudentId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Access denied');
    });
  });

  describe('Achievements Access Control', () => {
    it('should filter certificates when can_view_certificates is disabled', async () => {
      const { GET: GETAchievements } = await import('@/app/api/parent/students/[studentId]/achievements/route.js');
      
      canViewAchievements.mockResolvedValueOnce(true);
      getParentAccessSettings.mockResolvedValueOnce({
        can_view_achievements: true,
        can_view_certificates: false, // Disabled
      });
      getParentStudentLinkPermissions.mockResolvedValueOnce({
        can_view_certificates: false,
      });

      const mockAchievementsData = {
        badges: [
          { id: '1', name: 'First Course', icon: '🏅', earnedAt: '2024-01-01' },
        ],
        certificates: [
          { id: '1', name: 'Course Completion', issuedAt: '2024-01-01' },
        ],
        rewards: [],
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockAchievementsData }],
      });

      const request = createMockRequest(mockSession, { method: 'GET', url: `/api/parent/students/${testStudentId}/achievements` });
      const response = await GETAchievements(request, { params: { studentId: testStudentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Certificates should be filtered out
      expect(data.achievements.certificates).toHaveLength(0);
      // Badges should still be present
      expect(data.achievements.badges).toHaveLength(1);
    });
  });
});
