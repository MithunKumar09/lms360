/**
 * Wishlist API Route
 * 
 * Handles wishlist operations.
 * 
 * GET /api/wishlist - List user's wishlist
 * POST /api/wishlist - Add course to wishlist
 * DELETE /api/wishlist/:courseId - Remove course from wishlist
 * DELETE /api/wishlist/clear - Clear wishlist
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/wishlist
 * 
 * Get user's wishlist.
 */
export async function GET(request) {
  try {
    // Authentication required
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          wishlistItems: [],
          items: [],
          count: 0,
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check if wishlist table exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'wishlist'
      ) as table_exists
    `;
    
    const tableCheck = await query(checkQuery);
    const hasWishlistTable = tableCheck.rows[0]?.table_exists;

    if (!hasWishlistTable) {
      // Wishlist table doesn't exist yet, return empty wishlist
      return NextResponse.json({
        success: true,
        wishlistItems: [],
        items: [],
        count: 0,
        message: 'Wishlist feature not yet implemented in database',
      });
    }

    // Get wishlist items with course details
    const wishlistQuery = `
      SELECT 
        w.id,
        w.course_id,
        w.created_at as added_at,
        c.id as course_id,
        c.title,
        c.slug,
        c.description,
        c.intro_video_url,
        c.regular_price,
        c.discounted_price,
        c.course_type_id,
        -- Get category
        (
          SELECT json_build_object('id', cat.id, 'name', cat.name)
          FROM course_categories cat
          WHERE cat.id = c.category_id
          LIMIT 1
        ) as category,
        -- Get course type
        (
          SELECT json_build_object('id', ct.id, 'name', ct.name)
          FROM course_types ct
          WHERE ct.id = c.course_type_id
        ) as course_type,
        -- Get instructors
        (
          SELECT json_agg(
            json_build_object(
              'id', u.id,
              'name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email),
              'email', u.email,
              'profile_url', u.avatar_url,
              'avatar_url', u.avatar_url
            )
          )
          FROM course_instructors ci
          JOIN users u ON ci.instructor_id = u.id
          WHERE ci.course_id = c.id
        ) as instructors,
        -- Get rating statistics
        (
          SELECT json_build_object(
            'averageRating', COALESCE(AVG(rating)::NUMERIC(10,2), 0),
            'totalReviews', COUNT(*)
          )
          FROM course_reviews
          WHERE course_id = c.id
        ) as ratings
      FROM wishlist w
      JOIN courses c ON w.course_id = c.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `;

    const result = await query(wishlistQuery, [userId]);
    const courseIds = result.rows.map(row => row.course_id);
    
    // Fetch modules, chapters, and lessons to calculate lesson count and duration
    let modulesMap = {};
    if (courseIds.length > 0) {
      const placeholders = courseIds.map((_, idx) => `$${idx + 1}`).join(', ');
      const modulesQuery = `
        SELECT 
          cm.course_id,
          cl.id as lesson_id,
          cl.duration
        FROM course_modules cm
        LEFT JOIN course_chapters cc ON cc.module_id = cm.id
        LEFT JOIN course_lessons cl ON cl.chapter_id = cc.id
        WHERE cm.course_id IN (${placeholders})
      `;
      
      const modulesResult = await query(modulesQuery, courseIds);
      
      // Calculate lesson count and total duration per course
      modulesResult.rows.forEach(row => {
        if (!modulesMap[row.course_id]) {
          modulesMap[row.course_id] = {
            lessonCount: 0,
            totalDuration: 0
          };
        }
        if (row.lesson_id) {
          modulesMap[row.course_id].lessonCount++;
          modulesMap[row.course_id].totalDuration += row.duration || 0;
        }
      });
    }

    const items = result.rows.map((row) => {
      const courseModules = modulesMap[row.course_id] || { lessonCount: 0, totalDuration: 0 };
      const lessonCount = courseModules.lessonCount || 0;
      const totalDurationMinutes = courseModules.totalDuration || 0;
      
      // Format duration
      const hours = Math.floor(totalDurationMinutes / 60);
      const minutes = totalDurationMinutes % 60;
      const formattedDuration = hours > 0 
        ? `${hours} hr ${minutes} min` 
        : `${minutes} min`;
      
      // Format lesson count
      const formattedLessonCount = `${lessonCount} ${lessonCount === 1 ? 'Lesson' : 'Lessons'}`;
      
      // Determine if course is free based on course type name
      const courseTypeName = row.course_type?.name?.toLowerCase() || '';
      const isFree = courseTypeName === 'free' || 
                     (!row.regular_price || row.regular_price === 0) && 
                     (!row.discounted_price || row.discounted_price === 0);
      
      // Calculate effective price (use discounted_price if available, otherwise regular_price)
      // For free courses, set price to null/0
      const effectivePrice = isFree 
        ? null 
        : (row.discounted_price && row.discounted_price > 0 
          ? row.discounted_price 
          : (row.regular_price && row.regular_price > 0 ? row.regular_price : null));
      
      // Get first instructor for display
      const instructors = row.instructors || [];
      const firstInstructor = instructors.length > 0 ? instructors[0] : null;
      
      // Map instructor data to include both formats for compatibility
      const mappedInstructors = instructors.map(inst => ({
        ...inst,
        avatarUrl: inst.avatar_url || inst.profile_url,
        profileUrl: inst.profile_url || inst.avatar_url,
      }));
      
      // Get rating data
      const ratings = row.ratings || {};
      const averageRating = parseFloat(ratings.averageRating || 0);
      const totalReviews = parseInt(ratings.totalReviews || 0, 10);
      
      return {
        id: row.course_id,
        courseId: row.course_id,
        title: row.title,
        slug: row.slug,
        description: row.description,
        price: effectivePrice,
        regularPrice: isFree ? null : row.regular_price,
        discountedPrice: isFree ? null : row.discounted_price,
        thumbnailUrl: null, // thumbnail_url column doesn't exist in courses table - will use placeholder in frontend
        categoryName: row.category?.name || null,
        categoryId: row.category?.id || null,
        courseTypeName: row.course_type?.name || null,
        courseTypeId: row.course_type?.id || null,
        isFree: isFree,
        // Instructor data
        instructors: mappedInstructors,
        instructorName: firstInstructor?.name || null,
        instructorAvatar: firstInstructor?.avatar_url || firstInstructor?.profile_url || null,
        // Rating data
        averageRating: averageRating,
        totalReviews: totalReviews,
        // Lesson and duration data
        lessonCount: lessonCount,
        formattedLessonCount: formattedLessonCount,
        totalDuration: totalDurationMinutes,
        formattedDuration: formattedDuration,
        addedAt: row.added_at,
      };
    });

    return NextResponse.json({
      success: true,
      wishlistItems: items,
      items,
      count: items.length,
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch wishlist',
        wishlistItems: [],
        items: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wishlist
 * 
 * Add course to wishlist.
 */
export async function POST(request) {
  try {
    // Authentication required
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course ID is required',
        },
        { status: 400 }
      );
    }

    // Check if wishlist table exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'wishlist'
      ) as table_exists
    `;
    
    const tableCheck = await query(checkQuery);
    const hasWishlistTable = tableCheck.rows[0]?.table_exists;

    if (!hasWishlistTable) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wishlist feature not yet implemented in database',
        },
        { status: 501 }
      );
    }

    // Check if already in wishlist
    const checkWishlistQuery = `
      SELECT id FROM wishlist
      WHERE user_id = $1 AND course_id = $2
    `;
    const existing = await query(checkWishlistQuery, [userId, courseId]);

    if (existing.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Course already in wishlist',
        alreadyExists: true,
      });
    }

    // Add to wishlist
    const insertQuery = `
      INSERT INTO wishlist (user_id, course_id, created_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      RETURNING id, created_at
    `;

    const result = await query(insertQuery, [userId, courseId]);

    return NextResponse.json({
      success: true,
      message: 'Course added to wishlist',
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to add to wishlist',
      },
      { status: 500 }
    );
  }
}

