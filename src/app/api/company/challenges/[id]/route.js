/**
 * Company Challenge Details API Route
 * 
 * Handles single challenge operations for company users.
 * 
 * GET /api/company/challenges/[id] - Get challenge details
 * PUT /api/company/challenges/[id] - Update challenge
 * DELETE /api/company/challenges/[id] - Delete challenge
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getChallenge, updateChallenge, deleteChallenge, hasAccessToChallenge } from '@/lib/db/company/challenges.js';

/**
 * GET /api/company/challenges/[id]
 * Get challenge details (company must own it)
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['company', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const { id: challengeId } = params;
    
    if (!challengeId) {
      return NextResponse.json(
        { success: false, error: 'Challenge ID is required' },
        { status: 400 }
      );
    }
    
    const challenge = await getChallenge(challengeId);
    
    if (!challenge) {
      return NextResponse.json(
        { success: false, error: 'Challenge not found' },
        { status: 404 }
      );
    }
    
    // Company can only view own challenges, students can view public published challenges
    if (userRole === 'company') {
      if (challenge.companyUserId !== userId) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }
    } else if (userRole === 'student') {
      if (!challenge.isPublic || !['published', 'open'].includes(challenge.status)) {
        return NextResponse.json(
          { success: false, error: 'Challenge not available' },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      data: challenge
    });
  } catch (error) {
    console.error('Error getting company challenge:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get challenge'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/company/challenges/[id]
 * Update challenge (company must own it)
 */
export async function PUT(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const { id: challengeId } = params;
    
    if (!challengeId) {
      return NextResponse.json(
        { success: false, error: 'Challenge ID is required' },
        { status: 400 }
      );
    }
    
    // Verify company owns this challenge
    const hasAccess = await hasAccessToChallenge(challengeId, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Validate challengeType if provided
    if (body.challengeType) {
      const validTypes = ['hackathon', 'coding_challenge', 'case_competition', 'aptitude_test', 'project_submission'];
      if (!validTypes.includes(body.challengeType)) {
        return NextResponse.json(
          { success: false, error: `challengeType must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }
    
    // Validate status if provided
    if (body.status && !['draft', 'published', 'open', 'closed', 'evaluating', 'completed'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }
    
    // Update challenge (don't allow changing companyUserId)
    const { companyUserId, ...updates } = body;
    const updatedChallenge = await updateChallenge(challengeId, updates);
    
    return NextResponse.json({
      success: true,
      data: updatedChallenge
    });
  } catch (error) {
    console.error('Error updating company challenge:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update challenge'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/company/challenges/[id]
 * Delete challenge (company must own it)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const { id: challengeId } = params;
    
    if (!challengeId) {
      return NextResponse.json(
        { success: false, error: 'Challenge ID is required' },
        { status: 400 }
      );
    }
    
    // Verify company owns this challenge
    const hasAccess = await hasAccessToChallenge(challengeId, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    const deleted = await deleteChallenge(challengeId);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete challenge' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Challenge deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting company challenge:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete challenge'
      },
      { status: error.status || 500 }
    );
  }
}