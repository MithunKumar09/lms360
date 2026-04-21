/**
 * Company Job Posting Details API Route
 * 
 * Handles single job posting operations for company users.
 * 
 * GET /api/company/job-postings/[id] - Get job posting details
 * PUT /api/company/job-postings/[id] - Update job posting
 * DELETE /api/company/job-postings/[id] - Delete job posting
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getPosting, updatePosting, deletePosting } from '@/lib/db/placement/postings.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/company/job-postings/[id]
 * Get job posting details (company must own it)
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
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
    
    // Verify company owns this posting
    if (posting.companyUserId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: posting
    });
  } catch (error) {
    console.error('Error getting company job posting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get job posting'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/company/job-postings/[id]
 * Update job posting (company must own it)
 */
export async function PUT(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const { id: postingId } = params;
    
    if (!postingId) {
      return NextResponse.json(
        { success: false, error: 'Posting ID is required' },
        { status: 400 }
      );
    }
    
    // Verify company owns this posting
    const posting = await getPosting(postingId);
    if (!posting) {
      return NextResponse.json(
        { success: false, error: 'Posting not found' },
        { status: 404 }
      );
    }
    
    if (posting.companyUserId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Validate postingType if provided
    if (body.postingType && !['internship', 'job', 'contract'].includes(body.postingType)) {
      return NextResponse.json(
        { success: false, error: 'postingType must be internship, job, or contract' },
        { status: 400 }
      );
    }
    
    // Validate status if provided
    if (body.status && !['draft', 'active', 'closed', 'expired'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'status must be draft, active, closed, or expired' },
        { status: 400 }
      );
    }
    
    // Update posting (don't allow changing companyUserId or postedBy)
    const { companyUserId, postedBy, ...updates } = body;
    const updatedPosting = await updatePosting(postingId, updates);
    
    return NextResponse.json({
      success: true,
      data: updatedPosting
    });
  } catch (error) {
    console.error('Error updating company job posting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update job posting'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/company/job-postings/[id]
 * Delete job posting (company must own it)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const { id: postingId } = params;
    
    if (!postingId) {
      return NextResponse.json(
        { success: false, error: 'Posting ID is required' },
        { status: 400 }
      );
    }
    
    // Verify company owns this posting
    const posting = await getPosting(postingId);
    if (!posting) {
      return NextResponse.json(
        { success: false, error: 'Posting not found' },
        { status: 404 }
      );
    }
    
    if (posting.companyUserId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
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
    console.error('Error deleting company job posting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete job posting'
      },
      { status: error.status || 500 }
    );
  }
}