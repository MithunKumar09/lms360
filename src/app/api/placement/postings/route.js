/**
 * Job Postings API Route
 * 
 * GET /api/placement/postings - Get list of postings (with filters)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getPostings } from '@/lib/db/placement/postings.js';

/**
 * GET /api/placement/postings
 * Get list of job/internship postings with filters
 * 
 * Query parameters:
 * - postingType: 'internship' or 'job'
 * - status: 'active', 'draft', 'closed', 'expired' (default: 'active')
 * - search: Search term
 * - minReadinessScore: Filter by minimum readiness score
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 10)
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    const { searchParams } = new URL(request.url);
    
    const filters = {
      postingType: searchParams.get('postingType') || null,
      status: searchParams.get('status') || 'active',
      search: searchParams.get('search') || null,
      minReadinessScore: searchParams.get('minReadinessScore') 
        ? parseFloat(searchParams.get('minReadinessScore')) 
        : null,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10')
    };
    
    // Get user's readiness score for filtering
    const { getReadiness } = await import('@/lib/db/placement/readiness.js');
    const readiness = await getReadiness(session.user.id);
    const userReadinessScore = readiness?.readinessScore || 0;
    
    // Filter out postings with higher min_readiness_score than user's score
    const result = await getPostings(filters);
    
    // Filter postings client-side based on eligibility
    const eligiblePostings = result.postings.filter(posting => {
      if (posting.minReadinessScore !== null && userReadinessScore < posting.minReadinessScore) {
        return false;
      }
      return true;
    });
    
    return NextResponse.json({
      success: true,
      data: eligiblePostings,
      pagination: {
        ...result.pagination,
        total: eligiblePostings.length
      },
      userReadinessScore
    });
  } catch (error) {
    console.error('Error getting postings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get postings'
      },
      { status: error.status || 500 }
    );
  }
}
