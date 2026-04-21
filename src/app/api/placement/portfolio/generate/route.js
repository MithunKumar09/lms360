/**
 * Portfolio Generation API Route
 * 
 * POST /api/placement/portfolio/generate - Auto-generate portfolio from user data
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { generatePortfolio } from '@/lib/db/placement/portfolios.js';

/**
 * POST /api/placement/portfolio/generate
 * Auto-generate portfolio from user's profile, courses, assignments, certificates
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;
    
    const portfolio = await generatePortfolio(userId);
    
    return NextResponse.json({
      success: true,
      data: portfolio,
      message: 'Portfolio generated successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating portfolio:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate portfolio'
      },
      { status: error.status || 500 }
    );
  }
}
