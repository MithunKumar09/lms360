/**
 * Admin Placement Posting Details API Route
 * 
 * GET /api/admin/placement/postings/[id] - Get posting details
 * PUT /api/admin/placement/postings/[id] - Update posting
 * DELETE /api/admin/placement/postings/[id] - Delete posting
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getPosting, updatePosting, deletePosting } from '@/lib/db/placement/postings.js';

/**
 * GET /api/admin/placement/postings/[id]
 * Get posting details
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const { id: postingId } = params;
    
    if (!postingId) {
      return NextResponse.json(
        { success: false, error: 'Posting ID is required' },
        { status: 400 }
      );
    }
    
    const posting = await getPosting(postingId);
    
    if (!posting) {
      return NextResponse.json(
        { success: false, error: 'Posting not found' },
        { status: 404 }
      );
    }
    
    // Check organization access (if not superadmin)
    if (session.user.role !== 'superadmin' && posting.organizationId !== session.user.orgId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: posting
    });
  } catch (error) {
    console.error('Error getting posting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get posting'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/admin/placement/postings/[id]
 * Update posting
 */
export async function PUT(request, { params }) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const { id: postingId } = params;
    const body = await request.json();
    
    if (!postingId) {
      return NextResponse.json(
        { success: false, error: 'Posting ID is required' },
        { status: 400 }
      );
    }
    
    // Verify posting exists and user has access
    const existingPosting = await getPosting(postingId);
    if (!existingPosting) {
      return NextResponse.json(
        { success: false, error: 'Posting not found' },
        { status: 404 }
      );
    }
    
    if (session.user.role !== 'superadmin' && existingPosting.organizationId !== session.user.orgId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Validation for update fields
    const { title, companyName, postingType, location, description, requirements, responsibilities, salaryMin, salaryMax, minReadinessScore, requiredSkills, requiredCourses, requiredSkillsList, status } = body;

    if (title !== undefined && (typeof title !== 'string' || title.trim() === '' || title.length > 255)) {
      return NextResponse.json(
        { success: false, error: 'title must be a string with maximum 255 characters if provided' },
        { status: 400 }
      );
    }

    if (companyName !== undefined && (typeof companyName !== 'string' || companyName.trim() === '' || companyName.length > 255)) {
      return NextResponse.json(
        { success: false, error: 'companyName must be a string with maximum 255 characters if provided' },
        { status: 400 }
      );
    }

    if (postingType !== undefined && !['internship', 'job', 'contract'].includes(postingType)) {
      return NextResponse.json(
        { success: false, error: 'postingType must be internship, job, or contract if provided' },
        { status: 400 }
      );
    }

    if (status !== undefined && !['draft', 'active', 'closed', 'expired'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'status must be draft, active, closed, or expired if provided' },
        { status: 400 }
      );
    }

    if (salaryMin !== undefined && salaryMin !== null && (typeof salaryMin !== 'number' || salaryMin < 0)) {
      return NextResponse.json(
        { success: false, error: 'salaryMin must be a positive number if provided' },
        { status: 400 }
      );
    }

    if (salaryMax !== undefined && salaryMax !== null && (typeof salaryMax !== 'number' || salaryMax < 0)) {
      return NextResponse.json(
        { success: false, error: 'salaryMax must be a positive number if provided' },
        { status: 400 }
      );
    }

    if (minReadinessScore !== undefined && minReadinessScore !== null && (typeof minReadinessScore !== 'number' || minReadinessScore < 0 || minReadinessScore > 100)) {
      return NextResponse.json(
        { success: false, error: 'minReadinessScore must be a number between 0 and 100 if provided' },
        { status: 400 }
      );
    }
    
    const posting = await updatePosting(postingId, body);
    
    return NextResponse.json({
      success: true,
      data: posting,
      message: 'Posting updated successfully'
    });
  } catch (error) {
    console.error('Error updating posting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update posting'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/admin/placement/postings/[id]
 * Delete posting
 */
export async function DELETE(request, { params }) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const { id: postingId } = params;
    
    if (!postingId) {
      return NextResponse.json(
        { success: false, error: 'Posting ID is required' },
        { status: 400 }
      );
    }
    
    // Verify posting exists and user has access
    const existingPosting = await getPosting(postingId);
    if (!existingPosting) {
      return NextResponse.json(
        { success: false, error: 'Posting not found' },
        { status: 404 }
      );
    }
    
    if (session.user.role !== 'superadmin' && existingPosting.organizationId !== session.user.orgId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const deleted = await deletePosting(postingId);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete posting' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Posting deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting posting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete posting'
      },
      { status: error.status || 500 }
    );
  }
}
