/**
 * Course Filters API Route
 * 
 * Public endpoint to fetch filter options (categories and skills) for the courses page.
 * No authentication required.
 * 
 * GET /api/courses/filters
 * Returns: { success: true, categories: [], skills: [] }
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';

export async function GET(request) {
  try {
    // Fetch active categories (status = 1)
    const categoriesQuery = `
      SELECT 
        id,
        name,
        description,
        thumbnail_url,
        status
      FROM course_categories
      WHERE status = 1
      ORDER BY name ASC
    `;

    // Fetch active skills (status = 1)
    const skillsQuery = `
      SELECT 
        id,
        name,
        category_id,
        subcategory_id,
        status
      FROM course_skills
      WHERE status = 1
      ORDER BY name ASC
    `;

    const [categoriesResult, skillsResult] = await Promise.all([
      query(categoriesQuery),
      query(skillsQuery)
    ]);

    const categories = (categoriesResult.rows || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      thumbnailUrl: row.thumbnail_url,
      status: row.status,
    }));

    const skills = (skillsResult.rows || []).map(row => ({
      id: row.id,
      name: row.name,
      categoryId: row.category_id,
      subcategoryId: row.subcategory_id,
      status: row.status,
    }));

    return NextResponse.json({
      success: true,
      categories,
      skills,
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error fetching course filters:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch course filters',
        categories: [],
        skills: [],
      },
      { status: 500 }
    );
  }
}

