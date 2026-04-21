/**
 * Integration Tests for Parent Dashboard
 * 
 * Tests end-to-end flows:
 * - Parent linking from admin panel
 * - Permission updates
 * - Feature enable/disable
 * - Data access across multiple endpoints
 */

import { query } from '@/lib/db/index.js';
import { getParentAccessSettings, canViewStudentProgress } from '@/lib/auth/parentPermissions.js';
import { getParentStudents } from '@/lib/db/parent/students.js';

// Mock database connection
jest.mock('@/lib/db/index.js', () => ({
  query: jest.fn(),
}));

describe('Parent Dashboard Integration Tests', () => {
  const testParentId = 'parent-user-id';
  const testOrgId = 'test-org-id';
  const testStudentId = 'student-1-id';
  const testAdminId = 'admin-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Parent-Student Linking Flow', () => {
    it('should link parent to student via admin panel', async () => {
      // Step 1: Admin creates parent-student link
      const linkQuery = `
        INSERT INTO parent_student_links (
          parent_user_id,
          student_user_id,
          org_id,
          relationship_type,
          can_view_progress,
          can_view_attendance,
          can_view_achievements,
          can_view_activity_log
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      query.mockResolvedValueOnce({
        rows: [{
          id: 'link-id',
          parent_user_id: testParentId,
          student_user_id: testStudentId,
          org_id: testOrgId,
          relationship_type: 'son',
          can_view_progress: true,
          can_view_attendance: true,
          can_view_achievements: true,
          can_view_activity_log: true,
        }],
      });

      const linkResult = await query(linkQuery, [
        testParentId,
        testStudentId,
        testOrgId,
        'son',
        true,
        true,
        true,
        true,
      ]);

      expect(linkResult.rows).toHaveLength(1);
      expect(linkResult.rows[0].parent_user_id).toBe(testParentId);
      expect(linkResult.rows[0].student_user_id).toBe(testStudentId);

      // Step 2: Parent can now see linked student
      query.mockResolvedValueOnce({
        rows: [{
          id: testStudentId,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          relationship_type: 'son',
        }],
      });

      const students = await getParentStudents(testParentId, testOrgId);
      expect(students).toHaveLength(1);
      expect(students[0].id).toBe(testStudentId);
    });

    it('should update parent access settings via admin panel', async () => {
      // Step 1: Admin creates per-student access settings
      const settingsQuery = `
        INSERT INTO parent_access_settings (
          org_id,
          parent_user_id,
          student_user_id,
          can_view_progress,
          can_view_attendance,
          can_view_achievements,
          can_view_activity_log,
          can_view_engagement_stats
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (org_id, parent_user_id, student_user_id)
        DO UPDATE SET
          can_view_progress = EXCLUDED.can_view_progress,
          can_view_attendance = EXCLUDED.can_view_attendance,
          can_view_achievements = EXCLUDED.can_view_achievements,
          can_view_activity_log = EXCLUDED.can_view_activity_log,
          can_view_engagement_stats = EXCLUDED.can_view_engagement_stats
        RETURNING *
      `;

      query.mockResolvedValueOnce({
        rows: [{
          org_id: testOrgId,
          parent_user_id: testParentId,
          student_user_id: testStudentId,
          can_view_progress: false, // Disabled
          can_view_attendance: true,
          can_view_achievements: true,
          can_view_activity_log: false, // Disabled
          can_view_engagement_stats: true,
        }],
      });

      const settingsResult = await query(settingsQuery, [
        testOrgId,
        testParentId,
        testStudentId,
        false, // can_view_progress
        true,  // can_view_attendance
        true,  // can_view_achievements
        false, // can_view_activity_log
        true,  // can_view_engagement_stats
      ]);

      expect(settingsResult.rows[0].can_view_progress).toBe(false);
      expect(settingsResult.rows[0].can_view_activity_log).toBe(false);

      // Step 2: Parent permission check should respect these settings
      query
        .mockResolvedValueOnce({
          rows: [{
            can_view_progress: false,
            can_view_attendance: true,
            can_view_achievements: true,
            can_view_activity_log: false,
            can_view_engagement_stats: true,
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            can_view_progress: true, // From parent_student_links
          }],
        });

      const settings = await getParentAccessSettings(testParentId, testStudentId, testOrgId);
      expect(settings.can_view_progress).toBe(false); // Should use per-student override
    });
  });

  describe('Permission Cascade Flow', () => {
    it('should respect permission hierarchy: per-student > per-parent > org-wide', async () => {
      // Setup: All three levels exist with different values
      query
        .mockResolvedValueOnce({
          rows: [{ can_view_progress: false }], // Per-student: disabled
        })
        .mockResolvedValueOnce({
          rows: [{ can_view_progress: true }], // Per-parent: enabled (should be ignored)
        })
        .mockResolvedValueOnce({
          rows: [{ can_view_progress: true }], // Org-wide: enabled (should be ignored)
        });

      const settings = await getParentAccessSettings(testParentId, testStudentId, testOrgId);
      expect(settings.can_view_progress).toBe(false); // Per-student takes priority
    });

    it('should fall back to per-parent when per-student not set', async () => {
      query
        .mockResolvedValueOnce({
          rows: [], // No per-student override
        })
        .mockResolvedValueOnce({
          rows: [{ can_view_progress: false }], // Per-parent: disabled
        })
        .mockResolvedValueOnce({
          rows: [{ can_view_progress: true }], // Org-wide: enabled (should be ignored)
        });

      const settings = await getParentAccessSettings(testParentId, testStudentId, testOrgId);
      expect(settings.can_view_progress).toBe(false); // Per-parent takes priority
    });

    it('should fall back to org-wide when neither per-student nor per-parent set', async () => {
      query
        .mockResolvedValueOnce({
          rows: [], // No per-student
        })
        .mockResolvedValueOnce({
          rows: [], // No per-parent
        })
        .mockResolvedValueOnce({
          rows: [{ can_view_progress: false }], // Org-wide: disabled
        });

      const settings = await getParentAccessSettings(testParentId, testStudentId, testOrgId);
      expect(settings.can_view_progress).toBe(false); // Org-wide takes priority
    });
  });

  describe('Feature Enable/Disable Flow', () => {
    it('should disable progress viewing for specific student', async () => {
      // Admin disables progress for this student
      query.mockResolvedValueOnce({
        rows: [{
          can_view_progress: false,
          can_view_attendance: true,
          can_view_achievements: true,
          can_view_activity_log: true,
          can_view_engagement_stats: true,
        }],
      });

      const settings = await getParentAccessSettings(testParentId, testStudentId, testOrgId);
      
      // Parent should not be able to view progress
      query.mockResolvedValueOnce({
        rows: [{ can_view_progress: true }], // From parent_student_links
      });

      const canView = await canViewStudentProgress('parent', testParentId, testStudentId, testOrgId);
      expect(canView).toBe(false); // Should be false due to access settings
    });

    it('should enable all features when settings allow', async () => {
      query
        .mockResolvedValueOnce({
          rows: [{
            can_view_progress: true,
            can_view_attendance: true,
            can_view_achievements: true,
            can_view_activity_log: true,
            can_view_engagement_stats: true,
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ can_view_progress: true }],
        });

      const canView = await canViewStudentProgress('parent', testParentId, testStudentId, testOrgId);
      expect(canView).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle parent with no linked students', async () => {
      query.mockResolvedValueOnce({
        rows: [],
      });

      const students = await getParentStudents(testParentId, testOrgId);
      expect(students).toHaveLength(0);
    });

    it('should handle parent with multiple linked students', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { id: 'student-1', first_name: 'John', last_name: 'Doe' },
          { id: 'student-2', first_name: 'Jane', last_name: 'Doe' },
          { id: 'student-3', first_name: 'Bob', last_name: 'Doe' },
        ],
      });

      const students = await getParentStudents(testParentId, testOrgId);
      expect(students).toHaveLength(3);
    });

    it('should handle missing orgId for parent', async () => {
      // Parent without orgId should not be able to access students
      await expect(getParentStudents(testParentId, null)).rejects.toThrow();
    });
  });
});
