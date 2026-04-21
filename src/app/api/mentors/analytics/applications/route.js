/**
 * Mentor Application Analytics API Route
 * 
 * GET /api/mentors/analytics/applications - Get application analytics data
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/mentors/analytics/applications
 * Get comprehensive application analytics
 */
export async function GET(request) {
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days: 7, 30, 90, 365
    const jobId = searchParams.get('job_id'); // Filter by specific job

    const days = parseInt(period, 10);
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Build query parameters
    const dateFromISO = dateFrom.toISOString();
    const queryParams = jobId ? [mentorId, dateFromISO, jobId] : [mentorId, dateFromISO];

    // Get all analytics in parallel
    const [
      overviewStats,
      trendsData,
      popularJobs,
      patternsData,
      statusDistribution,
    ] = await Promise.all([
      // Overview statistics
      query(
        `SELECT 
          COUNT(*)::int as total_applications,
          COUNT(DISTINCT ja.job_id)::int as jobs_with_applications,
          COUNT(DISTINCT ja.user_id)::int as unique_applicants,
          COUNT(CASE WHEN ja.application_status = 'pending' THEN 1 END)::int as pending_applications,
          COUNT(CASE WHEN ja.application_status = 'reviewed' THEN 1 END)::int as reviewed_applications,
          COUNT(CASE WHEN ja.application_status = 'shortlisted' THEN 1 END)::int as shortlisted_applications,
          COUNT(CASE WHEN ja.application_status = 'rejected' THEN 1 END)::int as rejected_applications,
          COUNT(CASE WHEN ja.application_status = 'accepted' THEN 1 END)::int as accepted_applications
         FROM job_applications ja
         JOIN jobs j ON ja.job_id = j.id
         WHERE j.created_by = $1
           AND ja.applied_at >= $2
           ${jobId ? 'AND j.id = $3' : ''}`,
        queryParams
      ),

      // Trends over time (daily)
      query(
        `SELECT 
          DATE(applied_at) as date,
          COUNT(*)::int as count
         FROM job_applications ja
         JOIN jobs j ON ja.job_id = j.id
         WHERE j.created_by = $1
           AND ja.applied_at >= $2
           ${jobId ? 'AND j.id = $3' : ''}
         GROUP BY DATE(applied_at)
         ORDER BY date ASC`,
        queryParams
      ),

      // Popular jobs (top 10 by applications)
      query(
        `SELECT 
          j.id,
          j.title,
          j.company,
          j.location,
          j.job_type,
          COUNT(ja.id)::int as application_count,
          COUNT(CASE WHEN ja.application_status = 'pending' THEN 1 END)::int as pending_count,
          COUNT(CASE WHEN ja.application_status = 'shortlisted' THEN 1 END)::int as shortlisted_count,
          COUNT(CASE WHEN ja.application_status = 'accepted' THEN 1 END)::int as accepted_count
         FROM jobs j
         LEFT JOIN job_applications ja ON ja.job_id = j.id
         WHERE j.created_by = $1
           ${jobId ? 'AND j.id = $3' : ''}
         GROUP BY j.id, j.title, j.company, j.location, j.job_type
         ORDER BY application_count DESC
         LIMIT 10`,
        queryParams
      ),

      // Application patterns (hour of day, day of week)
      query(
        `SELECT 
          EXTRACT(HOUR FROM applied_at)::int as hour_of_day,
          COUNT(*)::int as count
         FROM job_applications ja
         JOIN jobs j ON ja.job_id = j.id
         WHERE j.created_by = $1
           AND ja.applied_at >= $2
           ${jobId ? 'AND j.id = $3' : ''}
         GROUP BY EXTRACT(HOUR FROM applied_at)
         ORDER BY hour_of_day ASC`,
        queryParams
      ),

      // Status distribution
      query(
        `SELECT 
          application_status,
          COUNT(*)::int as count
         FROM job_applications ja
         JOIN jobs j ON ja.job_id = j.id
         WHERE j.created_by = $1
           AND ja.applied_at >= $2
           ${jobId ? 'AND j.id = $3' : ''}
         GROUP BY application_status
         ORDER BY count DESC`,
        queryParams
      ),
    ]);

    // Format overview statistics
    const stats = overviewStats.rows[0] || {
      total_applications: 0,
      jobs_with_applications: 0,
      unique_applicants: 0,
      pending_applications: 0,
      reviewed_applications: 0,
      shortlisted_applications: 0,
      rejected_applications: 0,
      accepted_applications: 0,
    };

    // Format trends data
    const trends = trendsData.rows.map(row => ({
      date: row.date,
      count: row.count,
    }));

    // Format popular jobs
    const popularJobsData = popularJobs.rows.map(row => ({
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location,
      job_type: row.job_type,
      application_count: row.application_count,
      pending_count: row.pending_count,
      shortlisted_count: row.shortlisted_count,
      accepted_count: row.accepted_count,
    }));

    // Format patterns data (hour of day)
    const patterns = patternsData.rows.map(row => ({
      hour_of_day: row.hour_of_day,
      count: row.count,
    }));

    // Calculate day of week patterns
    const dayOfWeekPatterns = await query(
      `SELECT 
        EXTRACT(DOW FROM applied_at)::int as day_of_week,
        COUNT(*)::int as count
       FROM job_applications ja
       JOIN jobs j ON ja.job_id = j.id
       WHERE j.created_by = $1
         AND ja.applied_at >= $2
         ${jobId ? 'AND j.id = $3' : ''}
       GROUP BY EXTRACT(DOW FROM applied_at)
       ORDER BY day_of_week ASC`,
      queryParams
    );

    const dayOfWeek = dayOfWeekPatterns.rows.map(row => ({
      day_of_week: row.day_of_week, // 0 = Sunday, 1 = Monday, etc.
      count: row.count,
    }));

    // Format status distribution
    const statusDist = statusDistribution.rows.map(row => ({
      status: row.application_status,
      count: row.count,
    }));

    // Calculate average applications per job
    const avgApplications = stats.jobs_with_applications > 0
      ? (stats.total_applications / stats.jobs_with_applications).toFixed(2)
      : 0;

    // Calculate status percentages
    const total = stats.total_applications;
    const statusPercentages = {
      pending: total > 0 ? ((stats.pending_applications / total) * 100).toFixed(1) : '0.0',
      reviewed: total > 0 ? ((stats.reviewed_applications / total) * 100).toFixed(1) : '0.0',
      shortlisted: total > 0 ? ((stats.shortlisted_applications / total) * 100).toFixed(1) : '0.0',
      rejected: total > 0 ? ((stats.rejected_applications / total) * 100).toFixed(1) : '0.0',
      accepted: total > 0 ? ((stats.accepted_applications / total) * 100).toFixed(1) : '0.0',
    };

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_applications: stats.total_applications,
          jobs_with_applications: stats.jobs_with_applications,
          unique_applicants: stats.unique_applicants,
          avg_applications_per_job: parseFloat(avgApplications),
          status_breakdown: {
            pending: stats.pending_applications,
            reviewed: stats.reviewed_applications,
            shortlisted: stats.shortlisted_applications,
            rejected: stats.rejected_applications,
            accepted: stats.accepted_applications,
          },
          status_percentages: statusPercentages,
        },
        trends: {
          daily: trends,
          period: days,
          date_from: dateFrom.toISOString(),
        },
        popular: {
          jobs: popularJobsData,
        },
        patterns: {
          hour_of_day: patterns,
          day_of_week: dayOfWeek,
        },
        status_distribution: statusDist,
      },
    });
  } catch (error) {
    console.error('Get application analytics error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch application analytics' },
      { status: 500 }
    );
  }
}
