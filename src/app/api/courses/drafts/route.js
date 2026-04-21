/**
 * Course Drafts API Route
 * 
 * Handles draft operations for course creation.
 * 
 * GET /api/courses/drafts - Get user's drafts
 * POST /api/courses/drafts - Save/create draft
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import {
  createDraft,
  getLatestDraft,
  getUserDrafts,
} from '@/lib/db/courses/drafts.js';

/**
 * GET /api/courses/drafts
 * Get user's drafts (latest or all)
 */
export async function GET(request) {
  try {
    // Authentication: superadmin, admin, or vendor
    const session = await requireRole(request, ['superadmin', 'admin', 'vendor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const latest = searchParams.get('latest') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (latest) {
      // Get latest draft
      // For admin, filter by orgId; for vendor, use null (no org); for superadmin, use null (global)
      const draft = await getLatestDraft(
        userId,
        userRole === 'admin' ? userOrgId : null
      );

      if (!draft) {
        return NextResponse.json({
          success: true,
          draft: null,
          message: 'No draft found',
        });
      }

      // Permission check: Admin can only access drafts for their own organization
      // Vendor can only access their own drafts (org_id should be null)
      if (userRole === 'admin' && draft.org_id !== userOrgId) {
        return NextResponse.json({
          success: true,
          draft: null,
          message: 'No draft found',
        });
      }
      if (userRole === 'vendor' && draft.org_id !== null) {
        return NextResponse.json({
          success: true,
          draft: null,
          message: 'No draft found',
        });
      }

      // Auto-assign organization for admin users
      if (userRole === 'admin' && draft.courseData) {
        draft.courseData.organizationId = userOrgId;
      }

      return NextResponse.json({
        success: true,
        draft: {
          id: draft.id,
          courseData: draft.courseData,
          createdAt: draft.created_at,
          updatedAt: draft.updated_at,
        },
      });
    } else {
      // Get all drafts with pagination
      // For admin, filter by orgId; for vendor, use null (no org); for superadmin, use null (global)
      const result = await getUserDrafts(
        userId,
        userRole === 'admin' ? userOrgId : null,
        { limit, offset }
      );

      // Filter drafts by role permissions
      let filteredDrafts = result.drafts;
      if (userRole === 'admin') {
        filteredDrafts = result.drafts.filter(draft => draft.org_id === userOrgId);
      } else if (userRole === 'vendor') {
        filteredDrafts = result.drafts.filter(draft => draft.org_id === null);
      }

      // Auto-assign organization for admin users in each draft
      const drafts = filteredDrafts.map((draft) => {
        if (userRole === 'admin' && draft.courseData) {
          draft.courseData.organizationId = userOrgId;
        }
        return {
          id: draft.id,
          courseData: draft.courseData,
          createdAt: draft.created_at,
          updatedAt: draft.updated_at,
        };
      });

      return NextResponse.json({
        success: true,
        drafts,
        pagination: result.pagination,
      });
    }
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch drafts',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/courses/drafts
 * Save/create draft
 */
export async function POST(request) {
  try {
    // Authentication: superadmin, admin, or vendor
    const session = await requireRole(request, ['superadmin', 'admin', 'vendor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;

    const body = await request.json();
    const { id: draftId, courseData, courseId = null } = body;

    if (!courseData) {
      return NextResponse.json(
        { success: false, error: 'Course data is required' },
        { status: 400 }
      );
    }

    // Permission check: Admin can only create courses for their own organization
    if (userRole === 'admin') {
      // Force admin's organization
      courseData.organizationId = userOrgId;
      
      // Prevent admin from creating courses for other organizations
      if (courseData.organizationId && courseData.organizationId !== userOrgId) {
        return NextResponse.json(
          { success: false, error: 'You can only create courses for your own organization' },
          { status: 403 }
        );
      }
    } else if (userRole === 'vendor') {
      // Vendor: Create courses without organization (global courses)
      // Clear organization-related fields that vendors shouldn't set
      courseData.organizationId = null;
      courseData.instructorIds = [];
      courseData.classIds = [];
      courseData.subjectIds = [];
    }

    // Superadmin can create courses for any organization or globally (null)
    // No restrictions needed for superadmin

    let draft;

    if (draftId) {
      // Update existing draft
      const { updateDraft, getDraftById } = await import('@/lib/db/courses/drafts.js');
      
      // Check if draft exists and user has permission
      const existingDraft = await getDraftById(draftId, userId);
      if (!existingDraft) {
        return NextResponse.json(
          { success: false, error: 'Draft not found' },
          { status: 404 }
        );
      }

      // Permission check: Admin can only update drafts for their own organization
      // Vendor can only update their own drafts (org_id should be null)
      if (userRole === 'admin' && existingDraft.org_id !== userOrgId) {
        return NextResponse.json(
          { success: false, error: 'You can only update drafts for your own organization' },
          { status: 403 }
        );
      }
      if (userRole === 'vendor' && existingDraft.org_id !== null) {
        return NextResponse.json(
          { success: false, error: 'You can only update your own drafts' },
          { status: 403 }
        );
      }

      draft = await updateDraft(
        draftId,
        { courseData },
        userId
      );
    } else {
      // Create new draft
      // For admin, use their orgId; for vendor, use null (no org); for superadmin, use courseData.organizationId or null
      const finalOrgId = userRole === 'admin' 
        ? userOrgId 
        : (userRole === 'vendor' 
          ? null 
          : (courseData.organizationId || null));
      
      draft = await createDraft({
        userId,
        courseId,
        courseData,
        orgId: finalOrgId,
      });
    }

    return NextResponse.json({
      success: true,
      id: draft.id,
      courseData: draft.courseData || draft.course_data,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
      message: draftId ? 'Draft updated successfully' : 'Draft saved successfully',
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to save draft',
      },
      { status: error.status || 500 }
    );
  }
}

