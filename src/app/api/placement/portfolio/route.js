/**
 * Portfolio API Route
 * 
 * GET /api/placement/portfolio - Get user's portfolio
 * PUT /api/placement/portfolio - Update portfolio
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getPortfolio, upsertPortfolio, updatePortfolio } from '@/lib/db/placement/portfolios.js';

/**
 * GET /api/placement/portfolio
 * Get the active portfolio for the authenticated user
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;
    
    const portfolio = await getPortfolio(userId);
    
    if (!portfolio) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No portfolio found. Generate one to get started.'
      });
    }
    
    return NextResponse.json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    console.error('Error getting portfolio:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get portfolio'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/placement/portfolio
 * Update or create portfolio
 * 
 * Body:
 * {
 *   portfolioData: object,
 *   isPublic?: boolean,
 *   slug?: string
 * }
 */
export async function PUT(request) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;
    const body = await request.json();
    
    const { portfolioData, isPublic, slug } = body;
    
    // Validation
    if (!portfolioData || typeof portfolioData !== 'object') {
      return NextResponse.json(
        { success: false, error: 'portfolioData is required and must be an object' },
        { status: 400 }
      );
    }

    if (isPublic !== undefined && typeof isPublic !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isPublic must be a boolean if provided' },
        { status: 400 }
      );
    }

    if (slug && (typeof slug !== 'string' || slug.trim() === '' || slug.length > 100)) {
      return NextResponse.json(
        { success: false, error: 'slug must be a valid string with maximum 100 characters if provided' },
        { status: 400 }
      );
    }
    
    // Check if portfolio exists
    const existingPortfolio = await getPortfolio(userId);
    
    let portfolio;
    if (existingPortfolio) {
      // Update existing portfolio
      portfolio = await updatePortfolio(existingPortfolio.id, userId, {
        portfolioData,
        isPublic,
        slug
      });
    } else {
      // Create new portfolio
      portfolio = await upsertPortfolio(userId, {
        portfolioData,
        isPublic: isPublic || false,
        slug
      });
    }
    
    return NextResponse.json({
      success: true,
      data: portfolio,
      message: 'Portfolio saved successfully'
    });
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update portfolio'
      },
      { status: error.status || 500 }
    );
  }
}
