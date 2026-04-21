/**
 * Mentor Activity Feed API Route
 * 
 * GET /api/mentors/activity-feed - Get activity feed for mentor
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/mentors/activity-feed
 * Get activity feed for mentor with optional filters
 * 
 * Query Parameters:
 * - cohort_id: Filter by cohort
 * - student_id: Filter by student
 * - activity_type: Filter by activity type
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - since: ISO timestamp to get activities since this time
 */
export async function GET(request) {
  try {
    console.log('📰 [MENTOR ACTIVITY FEED] ===== GET ACTIVITY FEED STARTED =====');
    
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const cohortId = searchParams.get('cohort_id') || null;
    const studentId = searchParams.get('student_id') || null;
    const activityType = searchParams.get('activity_type') || null;
    const since = searchParams.get('since') || null;

    // Build WHERE conditions
    const whereConditions = ['maf.mentor_id = $1'];
    const queryParams = [mentorId];
    let paramIndex = 2;

    // Filter by cohort
    if (cohortId) {
      whereConditions.push(`maf.cohort_id = $${paramIndex}`);
      queryParams.push(cohortId);
      paramIndex++;
    }

    // Filter by student
    if (studentId) {
      whereConditions.push(`maf.student_id = $${paramIndex}`);
      queryParams.push(studentId);
      paramIndex++;
    }

    // Filter by activity type
    if (activityType) {
      whereConditions.push(`maf.activity_type = $${paramIndex}`);
      queryParams.push(activityType);
      paramIndex++;
    }

    // Filter by timestamp (since)
    if (since) {
      whereConditions.push(`maf.created_at >= $${paramIndex}`);
      queryParams.push(since);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM mentor_activity_feed maf
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get activities with user info
    const activitiesQuery = `
      SELECT 
        maf.id,
        maf.mentor_id,
        maf.student_id,
        maf.cohort_id,
        maf.activity_type,
        maf.activity_data,
        maf.created_at,
        maf.created_by,
        u.id as student_user_id,
        u.first_name as student_first_name,
        u.last_name as student_last_name,
        u.email as student_email,
        u.avatar_url as student_avatar_url,
        c.code as cohort_code
      FROM mentor_activity_feed maf
      LEFT JOIN users u ON maf.student_id = u.id
      LEFT JOIN cohorts c ON maf.cohort_id = c.id
      ${whereClause}
      ORDER BY maf.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const activitiesResult = await query(activitiesQuery, queryParams);

    const activities = activitiesResult.rows.map(row => ({
      id: row.id,
      mentorId: row.mentor_id,
      studentId: row.student_id,
      cohortId: row.cohort_id,
      activityType: row.activity_type,
      activityData: row.activity_data,
      createdAt: row.created_at,
      createdBy: row.created_by,
      student: row.student_user_id ? {
        id: row.student_user_id,
        firstName: row.student_first_name,
        lastName: row.student_last_name,
        email: row.student_email,
        avatarUrl: row.student_avatar_url,
      } : null,
      cohort: row.cohort_code ? {
        code: row.cohort_code,
      } : null,
    }));

    console.log('📰 [MENTOR ACTIVITY FEED] ✅ Activities fetched:', activities.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          activities,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📰 [MENTOR ACTIVITY FEED] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch activity feed' 
      },
      { status: 500 }
    );
  }
}
