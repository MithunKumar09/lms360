import { NextResponse } from 'next/server';
import { getHomeBlogs } from '@/lib/db/blogs.js';

/**
 * GET /api/blogs/home
 * Get blogs for home page (global published blogs only)
 * Public endpoint - no authentication required
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '3', 10);

    // Validate limit
    if (limit < 1 || limit > 20) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 20' },
        { status: 400 }
      );
    }

    const blogs = await getHomeBlogs(limit);

    return NextResponse.json(
      { success: true, blogs },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error in GET /api/blogs/home:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
