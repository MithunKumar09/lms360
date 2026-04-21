/**
 * Popular Course Tags API Route
 * 
 * GET /api/courses/tags/popular - Get popular tags
 */

import { NextResponse } from 'next/server';
import { getPopularTags } from '@/lib/db/courses/tags.js';

/**
 * GET /api/courses/tags/popular
 * 
 * Get popular tags (most frequently used)
 * Query params: limit (default: 10)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Validate limit
    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 50' },
        { status: 400 }
      );
    }

    // Get popular tags
    const tags = await getPopularTags(limit);

    return NextResponse.json({
      success: true,
      tags
    });
  } catch (error) {
    console.error('Error fetching popular tags:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch popular tags'
      },
      { status: 500 }
    );
  }
}

