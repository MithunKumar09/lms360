/**
 * Company Job Postings API Route
 * 
 * Handles job posting operations for company users.
 * 
 * GET /api/company/job-postings - List company's job postings
 * POST /api/company/job-postings - Create new job posting
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { createPosting, getPostings } from '@/lib/db/placement/postings.js';

/**
 * GET /api/company/job-postings
 * List company's job postings
 * 
 * Query parameters:
 * - status: Filter by status (default: 'active')
 * - postingType: Filter by type ('internship', 'job', 'contract')
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 10)
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const orgId = session.user.orgId;
    const { searchParams } = new URL(request.url);
    
    const filters = {
      companyUserId: userId,
      status: searchParams.get('status') || null, // Allow all statuses for company view
      postingType: searchParams.get('postingType') || null,
      organizationId: orgId || null,
      search: searchParams.get('search') || null,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10')
    };
    
    const result = await getPostings(filters);
    
    return NextResponse.json({
      success: true,
      data: result.postings,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting company job postings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get job postings'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/company/job-postings
 * Create new job posting
 * 
 * Body:
 * - title: Job title (required)
 * - companyName: Company name (required)
 * - postingType: 'internship', 'job', or 'contract' (required)
 * - location: Location (optional)
 * - description: Description (optional)
 * - requirements: Requirements (optional)
 * - responsibilities: Responsibilities (optional)
 * - salaryMin: Minimum salary (optional)
 * - salaryMax: Maximum salary (optional)
 * - salaryCurrency: Currency code (default: 'INR')
 * - salaryDisplay: Display string for salary (optional)
 * - requiredSkills: Array of skill names (optional)
 * - preferredQualifications: Preferred qualifications (optional)
 * - experienceLevel: Experience level (optional)
 * - applicationDeadline: Application deadline (optional)
 * - applicationLink: External application link (optional)
 * - minReadinessScore: Minimum readiness score (optional)
 * - requiredCourses: Array of course IDs (optional)
 * - requiredSkillsList: Array of required skill names (optional)
 * - status: Status ('draft', 'active', 'closed', 'expired') (default: 'draft')
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const orgId = session.user.orgId;
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.companyName || !body.postingType) {
      return NextResponse.json(
        { success: false, error: 'Title, companyName, and postingType are required' },
        { status: 400 }
      );
    }
    
    // Validate postingType
    if (!['internship', 'job', 'contract'].includes(body.postingType)) {
      return NextResponse.json(
        { success: false, error: 'postingType must be internship, job, or contract' },
        { status: 400 }
      );
    }
    
    // Validate status
    if (body.status && !['draft', 'active', 'closed', 'expired'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'status must be draft, active, closed, or expired' },
        { status: 400 }
      );
    }
    
    // Create posting
    const posting = await createPosting({
      ...body,
      postedBy: userId,
      companyUserId: userId,
      organizationId: orgId || null,
      status: body.status || 'draft'
    });
    
    return NextResponse.json({
      success: true,
      data: posting
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating company job posting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create job posting'
      },
      { status: error.status || 500 }
    );
  }
}