/**
 * Company Shortlist API Route
 * 
 * GET /api/company/talent-pool/shortlist - Get shortlisted students
 * POST /api/company/talent-pool/shortlist - Add student to shortlist
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { hasApprovedAccess } from '@/lib/db/company/talent-pool.js';
import { getShortlist, addToShortlist, removeFromShortlist } from '@/lib/db/company/talent-pool.js';

/**
 * GET /api/company/talent-pool/shortlist
 * Get shortlisted students
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    
    // Check if company has approved access
    const hasAccess = await hasApprovedAccess(userId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Talent pool access not approved' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const filters = {
      search: searchParams.get('search') || null,
      tags: searchParams.get('tags') ? searchParams.get('tags').split(',') : null,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10')
    };
    
    const result = await getShortlist(userId, filters);
    
    return NextResponse.json({
      success: true,
      data: result.students,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting shortlist:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get shortlist'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/company/talent-pool/shortlist
 * Add student to shortlist
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    
    // Check if company has approved access
    const hasAccess = await hasApprovedAccess(userId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Talent pool access not approved' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { studentId, notes, tags } = body;
    
    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'studentId is required' },
        { status: 400 }
      );
    }
    
    const shortlistEntry = await addToShortlist(userId, studentId, notes || null, tags || null);
    
    return NextResponse.json({
      success: true,
      data: shortlistEntry,
      message: 'Student added to shortlist'
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding to shortlist:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to add to shortlist'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/company/talent-pool/shortlist
 * Remove student from shortlist
 */
export async function DELETE(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    
    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'studentId is required' },
        { status: 400 }
      );
    }
    
    const removed = await removeFromShortlist(userId, studentId);
    
    if (!removed) {
      return NextResponse.json(
        { success: false, error: 'Student not in shortlist' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Student removed from shortlist'
    });
  } catch (error) {
    console.error('Error removing from shortlist:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to remove from shortlist'
      },
      { status: error.status || 500 }
    );
  }
}
