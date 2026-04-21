/**
 * Parent Student Achievements API Route
 * 
 * GET /api/parent/students/[studentId]/achievements - Get student achievements and certificates
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { canViewAchievements, getParentAccessSettings, getParentStudentLinkPermissions } from '@/lib/auth/parentPermissions.js';
import { verifyParentAccessToStudent } from '@/lib/db/parent/students.js';
import { getStudentAchievements } from '@/lib/db/parent/achievements.js';

export async function GET(request, { params }) {
  try {
    // Authentication: Only parents
    const session = await requireRole(request, ['parent']);
    const parentId = session.user.id;
    const orgId = session.user.orgId;
    const { studentId } = params;

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parent must be associated with an organization',
        },
        { status: 400 }
      );
    }

    if (!studentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Student ID is required',
        },
        { status: 400 }
      );
    }

    // Verify parent has access to this student
    const hasAccess = await verifyParentAccessToStudent(parentId, studentId, orgId);
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Student is not linked to this parent',
        },
        { status: 403 }
      );
    }

    // Check permission using integrated permission system
    const hasAchievementPermission = await canViewAchievements(session.user.role, parentId, studentId, orgId);
    
    // Check certificate view separately (uses same logic but different permission)
    const linkPermissions = await getParentStudentLinkPermissions(parentId, studentId, orgId);
    const accessSettings = await getParentAccessSettings(parentId, studentId, orgId);
    const canViewCertificates = linkPermissions?.can_view_certificates !== false && accessSettings.can_view_certificates;

    if (!hasAchievementPermission && !canViewCertificates) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Achievements and certificates view is disabled for this parent',
        },
        { status: 403 }
      );
    }

    // Get student achievements
    const achievements = await getStudentAchievements(studentId);

    // Filter based on permissions
    const filteredAchievements = {
      badges: hasAchievementPermission ? achievements.badges : [],
      certificates: canViewCertificates ? achievements.certificates : [],
      rewards: hasAchievementPermission ? achievements.rewards : [],
      timeline: (hasAchievementPermission || canViewCertificates) ? achievements.timeline : [],
    };

    return NextResponse.json({
      success: true,
      achievements: filteredAchievements,
    });
  } catch (error) {
    console.error('Error fetching student achievements:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch student achievements',
      },
      { status: error.status || 500 }
    );
  }
}
