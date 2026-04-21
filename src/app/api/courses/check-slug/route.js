import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';

/**
 * Check if a course slug already exists
 * GET /api/courses/check-slug?slug=course-slug
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const excludeCourseId = searchParams.get('excludeCourseId');

    if (!slug || slug.trim() === '') {
      return NextResponse.json(
        {
          available: true,
          message: 'Slug is required',
        },
        { status: 400 }
      );
    }

    // Check if slug exists in database, excluding the current course if in edit mode
    let queryText = 'SELECT id, title FROM courses WHERE slug = $1';
    let queryParams = [slug.trim()];
    
    if (excludeCourseId && excludeCourseId.trim() !== '') {
      queryText += ' AND id != $2';
      queryParams.push(excludeCourseId.trim());
    }
    
    queryText += ' LIMIT 1';
    
    const result = await query(queryText, queryParams);

    const exists = result.rows.length > 0;

    if (exists) {
      const existingCourse = result.rows[0];
      return NextResponse.json({
        available: false,
        exists: true,
        message: `A course with this slug already exists: "${existingCourse.title}"`,
        existingCourse: {
          id: existingCourse.id,
          title: existingCourse.title,
        },
      });
    }

    return NextResponse.json({
      available: true,
      exists: false,
      message: 'This slug is available',
    });
  } catch (error) {
    console.error('Error checking slug availability:', error);
    return NextResponse.json(
      {
        available: true, // Default to available on error to not block user
        error: 'Failed to check slug availability',
      },
      { status: 500 }
    );
  }
}

