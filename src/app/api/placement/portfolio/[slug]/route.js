/**
 * Public Portfolio API Route
 * 
 * GET /api/placement/portfolio/[slug] - Get public portfolio by slug
 */

import { NextResponse } from 'next/server';
import { getPortfolioBySlug } from '@/lib/db/placement/portfolios.js';

/**
 * GET /api/placement/portfolio/[slug]
 * Get public portfolio by slug (no authentication required)
 */
export async function GET(request, { params }) {
  try {
    const { slug } = params;
    
    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Portfolio slug is required' },
        { status: 400 }
      );
    }
    
    const portfolio = await getPortfolioBySlug(slug);
    
    if (!portfolio) {
      return NextResponse.json(
        { success: false, error: 'Portfolio not found or not public' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    console.error('Error getting public portfolio:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get portfolio'
      },
      { status: error.status || 500 }
    );
  }
}
