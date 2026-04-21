/**
 * Company Talent Pool Students Search API Route
 * 
 * GET /api/company/talent-pool/students - Search students (requires approved access)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { hasApprovedAccess } from '@/lib/db/company/talent-pool.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/company/talent-pool/students
 * Search students in talent pool (requires approved access)
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    
    // Check if company has approved access
    const hasAccess = await hasApprovedAccess(userId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Talent pool access not approved. Please request access first.' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || null;
    const minReadinessScore = searchParams.get('minReadinessScore') ? parseFloat(searchParams.get('minReadinessScore')) : null;
    const completedCourses = searchParams.get('completedCourses') ? searchParams.get('completedCourses').split(',') : [];
    const requiredSkills = searchParams.get('requiredSkills') ? searchParams.get('requiredSkills').split(',') : [];
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;
    
    // Build query conditions
    const conditions = [`u.role = 'student'`];
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      conditions.push(`(
        u.first_name ILIKE $${paramIndex} OR
        u.last_name ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Filter by readiness score
    if (minReadinessScore !== null) {
      conditions.push(`(
        SELECT readiness_score FROM placement_readiness WHERE user_id = u.id
      ) >= $${paramIndex}`);
      params.push(minReadinessScore);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // Get total count (simplified - would need proper JOINs for course/skill filters)
    const countResult = await query(
      `SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);
    
    // Get students with basic info
    params.push(pageSize, offset);
    const result = await query(
      `SELECT DISTINCT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        (SELECT readiness_score FROM placement_readiness WHERE user_id = u.id) as readiness_score
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );
    
    const students = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      readinessScore: row.readiness_score ? parseFloat(row.readiness_score) : null
    }));
    
    return NextResponse.json({
      success: true,
      data: students,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error searching talent pool students:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to search students'
      },
      { status: error.status || 500 }
    );
  }
}
