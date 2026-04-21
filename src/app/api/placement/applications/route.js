/**
 * Applications API Route
 * 
 * GET /api/placement/applications - Get user applications
 * POST /api/placement/applications - Create new application
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getUserApplications, createApplication, getApplicationStats } from '@/lib/db/placement/applications.js';
import { checkEligibility } from '@/lib/db/placement/postings.js';

/**
 * GET /api/placement/applications
 * Get applications for the authenticated user
 * 
 * Query parameters:
 * - status: Filter by status
 * - postingType: Filter by posting type ('internship' or 'job')
 * - page: Page number
 * - pageSize: Items per page
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || null,
      postingType: searchParams.get('postingType') || null,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10')
    };
    
    const result = await getUserApplications(userId, filters);
    const stats = await getApplicationStats(userId);
    
    return NextResponse.json({
      success: true,
      data: result.applications,
      pagination: result.pagination,
      stats
    });
  } catch (error) {
    console.error('Error getting applications:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get applications'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/placement/applications
 * Create a new application
 * 
 * Body:
 * {
 *   postingId: string,
 *   coverLetter?: string,
 *   resumeVersionId?: string,
 *   expectedSalary?: number,
 *   notes?: string
 * }
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;
    const body = await request.json();
    
    const { postingId, coverLetter, resumeVersionId, expectedSalary, notes } = body;
    
    // Validation
    if (!postingId || typeof postingId !== 'string' || postingId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'postingId is required and must be a valid string' },
        { status: 400 }
      );
    }

    if (coverLetter && (typeof coverLetter !== 'string' || coverLetter.length > 5000)) {
      return NextResponse.json(
        { success: false, error: 'Cover letter must be a string with maximum 5000 characters' },
        { status: 400 }
      );
    }

    if (resumeVersionId && (typeof resumeVersionId !== 'string' || resumeVersionId.trim() === '')) {
      return NextResponse.json(
        { success: false, error: 'resumeVersionId must be a valid string if provided' },
        { status: 400 }
      );
    }

    if (expectedSalary !== undefined && expectedSalary !== null) {
      if (typeof expectedSalary !== 'number' || expectedSalary < 0) {
        return NextResponse.json(
          { success: false, error: 'expectedSalary must be a positive number if provided' },
          { status: 400 }
        );
      }
    }

    if (notes && (typeof notes !== 'string' || notes.length > 1000)) {
      return NextResponse.json(
        { success: false, error: 'Notes must be a string with maximum 1000 characters' },
        { status: 400 }
      );
    }
    
    // Check eligibility
    const eligibility = await checkEligibility(userId, postingId);
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          success: false,
          error: eligibility.reason || 'Not eligible for this position'
        },
        { status: 403 }
      );
    }
    
    // Create application
    const application = await createApplication({
      userId,
      postingId,
      coverLetter,
      resumeVersionId,
      expectedSalary,
      notes
    });
    
    return NextResponse.json({
      success: true,
      data: application,
      message: 'Application submitted successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating application:', error);
    
    // Handle duplicate application error
    if (error.message.includes('already applied')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create application'
      },
      { status: error.status || 500 }
    );
  }
}
