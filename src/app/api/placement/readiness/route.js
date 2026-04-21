/**
 * Placement Readiness API Route
 * 
 * GET /api/placement/readiness - Get placement readiness score
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getReadiness, calculateReadinessScore } from '@/lib/db/placement/readiness.js';

/**
 * GET /api/placement/readiness
 * Get placement readiness score for the authenticated user
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;
    
    // Get existing readiness or calculate if not exists
    let readiness = await getReadiness(userId);
    
    if (!readiness) {
      // Calculate if doesn't exist
      readiness = await calculateReadinessScore(userId);
    } else {
      // Recalculate if older than 24 hours
      const lastCalculated = new Date(readiness.lastCalculatedAt);
      const now = new Date();
      const hoursSinceCalculation = (now - lastCalculated) / (1000 * 60 * 60);
      
      if (hoursSinceCalculation > 24) {
        readiness = await calculateReadinessScore(userId);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: readiness
    });
  } catch (error) {
    console.error('Error getting readiness:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get readiness score'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/placement/readiness/calculate
 * Force recalculation of readiness score (admin/instructor only)
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin', 'instructor']);
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }
    
    const readiness = await calculateReadinessScore(userId);
    
    return NextResponse.json({
      success: true,
      data: readiness,
      message: 'Readiness score recalculated successfully'
    });
  } catch (error) {
    console.error('Error calculating readiness:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to calculate readiness score'
      },
      { status: error.status || 500 }
    );
  }
}
