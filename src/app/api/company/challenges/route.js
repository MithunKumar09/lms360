/**
 * Company Challenges API Route
 * 
 * Handles challenge operations for company users.
 * 
 * GET /api/company/challenges - List company's challenges
 * POST /api/company/challenges - Create new challenge
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { createChallenge, getChallenges } from '@/lib/db/company/challenges.js';

/**
 * GET /api/company/challenges
 * List company's challenges
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const orgId = session.user.orgId;
    const { searchParams } = new URL(request.url);
    
    const filters = {
      companyUserId: userId,
      organizationId: orgId || null,
      challengeType: searchParams.get('challengeType') || null,
      status: searchParams.get('status') || null,
      isPublic: searchParams.get('isPublic') ? searchParams.get('isPublic') === 'true' : null,
      search: searchParams.get('search') || null,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10')
    };
    
    const result = await getChallenges(filters);
    
    return NextResponse.json({
      success: true,
      data: result.challenges,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting company challenges:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get challenges'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/company/challenges
 * Create new challenge
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const orgId = session.user.orgId;
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.challengeType || !body.startDate || !body.endDate || !body.submissionDeadline) {
      return NextResponse.json(
        { success: false, error: 'Title, challengeType, startDate, endDate, and submissionDeadline are required' },
        { status: 400 }
      );
    }
    
    // Validate challengeType
    const validTypes = ['hackathon', 'coding_challenge', 'case_competition', 'aptitude_test', 'project_submission'];
    if (!validTypes.includes(body.challengeType)) {
      return NextResponse.json(
        { success: false, error: `challengeType must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate status
    if (body.status && !['draft', 'published', 'open', 'closed', 'evaluating', 'completed'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }
    
    // Create challenge
    const challenge = await createChallenge({
      ...body,
      companyUserId: userId,
      organizationId: orgId || null
    });
    
    return NextResponse.json({
      success: true,
      data: challenge
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating company challenge:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create challenge'
      },
      { status: error.status || 500 }
    );
  }
}