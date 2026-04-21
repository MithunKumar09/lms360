/**
 * Course Draft API Route (Single Draft)
 * 
 * Handles operations for a specific draft.
 * 
 * GET /api/courses/drafts/[draftId] - Get specific draft
 * PUT /api/courses/drafts/[draftId] - Update draft
 * DELETE /api/courses/drafts/[draftId] - Delete draft
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import {
  getDraftById,
  updateDraft,
  deleteDraft,
} from '@/lib/db/courses/drafts.js';

/**
 * GET /api/courses/drafts/[draftId]
 * Get specific draft
 */
export async function GET(request, { params }) {
  try {
    // Authentication: superadmin, admin, or vendor
    const session = await requireRole(request, ['superadmin', 'admin', 'vendor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;
    const { draftId } = params;

    if (!draftId) {
      return NextResponse.json(
        { success: false, error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    const draft = await getDraftById(draftId, userId);

    if (!draft) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    // Permission check: Admin can only access drafts for their own organization
    // Vendor can only access their own drafts (org_id should be null)
    if (userRole === 'admin' && draft.org_id !== userOrgId) {
      return NextResponse.json(
        { success: false, error: 'You can only access drafts for your own organization' },
        { status: 403 }
      );
    }
    if (userRole === 'vendor' && draft.org_id !== null) {
      return NextResponse.json(
        { success: false, error: 'You can only access your own drafts' },
        { status: 403 }
      );
    }

    // Auto-assign organization for admin users
    if (userRole === 'admin' && draft.courseData) {
      draft.courseData.organizationId = userOrgId;
    }

    return NextResponse.json({
      success: true,
      id: draft.id,
      courseData: draft.courseData,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
    });
  } catch (error) {
    console.error('Error fetching draft:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch draft',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/courses/drafts/[draftId]
 * Update draft
 */
export async function PUT(request, { params }) {
  try {
    // Authentication: superadmin, admin, or vendor
    const session = await requireRole(request, ['superadmin', 'admin', 'vendor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;
    const { draftId } = params;

    if (!draftId) {
      return NextResponse.json(
        { success: false, error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { courseData } = body;

    if (!courseData) {
      return NextResponse.json(
        { success: false, error: 'Course data is required' },
        { status: 400 }
      );
    }

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

    const draft = await updateDraft(draftId, { courseData }, userId);

    if (!draft) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id: draft.id,
      courseData: draft.courseData,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
      message: 'Draft updated successfully',
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update draft',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/courses/drafts/[draftId]
 * Delete draft
 */
export async function DELETE(request, { params }) {
  try {
    // Authentication: superadmin, admin, or vendor
    const session = await requireRole(request, ['superadmin', 'admin', 'vendor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;
    const { draftId } = params;

    if (!draftId) {
      return NextResponse.json(
        { success: false, error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    // Check if draft exists and user has permission
    const existingDraft = await getDraftById(draftId, userId);
    if (!existingDraft) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    // Permission check: Admin can only delete drafts for their own organization
    // Vendor can only delete their own drafts (org_id should be null)
    if (userRole === 'admin' && existingDraft.org_id !== userOrgId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete drafts for your own organization' },
        { status: 403 }
      );
    }
    if (userRole === 'vendor' && existingDraft.org_id !== null) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own drafts' },
        { status: 403 }
      );
    }

    const deleted = await deleteDraft(draftId, userId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete draft',
      },
      { status: error.status || 500 }
    );
  }
}

