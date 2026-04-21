/**
 * Mentor Feedback API Route
 * 
 * GET /api/mentors/feedback - Get feedback for mentor
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/mentors/feedback
 * Get feedback for mentor with optional filters
 * 
 * Query Parameters:
 * - cohort_id: Filter by cohort
 * - student_id: Filter by student
 * - status: Filter by status (submitted, reviewed, archived)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 */
export async function GET(request) {
  try {
    console.log('💬 [MENTOR FEEDBACK LIST] ===== GET FEEDBACK STARTED =====');
    
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const cohortId = searchParams.get('cohort_id') || null;
    const studentId = searchParams.get('student_id') || null;
    const status = searchParams.get('status') || null;

    // Build WHERE conditions
    const whereConditions = ['mf.mentor_id = $1'];
    const queryParams = [mentorId];
    let paramIndex = 2;

    // Filter by cohort
    if (cohortId) {
      whereConditions.push(`mf.cohort_id = $${paramIndex}`);
      queryParams.push(cohortId);
      paramIndex++;
    }

    // Filter by student
    if (studentId) {
      whereConditions.push(`mf.student_id = $${paramIndex}`);
      queryParams.push(studentId);
      paramIndex++;
    }

    // Filter by status
    if (status) {
      const validStatuses = ['submitted', 'reviewed', 'archived'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `status must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      whereConditions.push(`mf.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM mentor_feedback mf
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get feedback with student info
    const feedbackQuery = `
      SELECT 
        mf.id,
        mf.student_id,
        mf.mentor_id,
        mf.cohort_id,
        mf.rating,
        mf.category,
        mf.message,
        mf.status,
        mf.reviewed_by,
        mf.reviewed_at,
        mf.created_at,
        mf.updated_at,
        u.id as student_user_id,
        u.first_name as student_first_name,
        u.last_name as student_last_name,
        u.email as student_email,
        u.avatar_url as student_avatar_url,
        c.code as cohort_code
      FROM mentor_feedback mf
      INNER JOIN users u ON mf.student_id = u.id
      LEFT JOIN cohorts c ON mf.cohort_id = c.id
      ${whereClause}
      ORDER BY mf.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const feedbackResult = await query(feedbackQuery, queryParams);

    const feedbacks = feedbackResult.rows.map(row => ({
      id: row.id,
      studentId: row.student_id,
      mentorId: row.mentor_id,
      cohortId: row.cohort_id,
      rating: row.rating,
      category: row.category,
      message: row.message,
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      student: {
        id: row.student_user_id,
        firstName: row.student_first_name,
        lastName: row.student_last_name,
        email: row.student_email,
        avatarUrl: row.student_avatar_url,
      },
      cohort: row.cohort_code ? {
        code: row.cohort_code,
      } : null,
    }));

    // Calculate average rating
    const avgRatingQuery = `
      SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as total_count
      FROM mentor_feedback mf
      WHERE mf.mentor_id = $1
    `;
    const avgRatingResult = await query(avgRatingQuery, [mentorId]);
    const avgRating = avgRatingResult.rows[0]?.avg_rating ? parseFloat(avgRatingResult.rows[0].avg_rating) : null;
    const totalFeedbackCount = parseInt(avgRatingResult.rows[0]?.total_count || '0', 10);

    console.log('💬 [MENTOR FEEDBACK LIST] ✅ Feedback fetched:', feedbacks.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          feedbacks,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
          summary: {
            averageRating: avgRating,
            totalCount: totalFeedbackCount,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('💬 [MENTOR FEEDBACK LIST] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch feedback' 
      },
      { status: 500 }
    );
  }
}
