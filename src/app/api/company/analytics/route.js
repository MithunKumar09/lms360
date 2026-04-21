/**
 * Company Analytics API Route
 * 
 * Provides analytics and ROI measurement for company activities.
 * 
 * GET /api/company/analytics - Get company analytics and metrics
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/company/analytics
 * Get company analytics and ROI metrics
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Build date filter
    const dateFilter = startDate && endDate 
      ? `AND created_at >= $2 AND created_at <= $3`
      : '';
    const params = [userId];
    if (startDate) params.push(startDate);
    if (endDate) params.push(endDate);
    
    // Job Postings Analytics
    const jobPostingsStats = await query(
      `SELECT 
        COUNT(*) as total_postings,
        COUNT(*) FILTER (WHERE status = 'active') as active_postings,
        COUNT(*) FILTER (WHERE status = 'published') as published_postings,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_postings
      FROM job_postings
      WHERE company_user_id = $1 ${dateFilter}`,
      params
    );
    
    // Applications Analytics
    const applicationsStats = await query(
      `SELECT 
        COUNT(*) as total_applications,
        COUNT(*) FILTER (WHERE a.application_status = 'pending') as pending_applications,
        COUNT(*) FILTER (WHERE a.application_status = 'shortlisted') as shortlisted_applications,
        COUNT(*) FILTER (WHERE a.application_status = 'accepted') as accepted_applications,
        COUNT(*) FILTER (WHERE a.application_status = 'rejected') as rejected_applications
      FROM applications a
      INNER JOIN job_postings jp ON a.posting_id = jp.id
      WHERE jp.company_user_id = $1 ${dateFilter}`,
      params
    );
    
    // Virtual Internships Analytics
    const virtualInternshipStats = await query(
      `SELECT 
        COUNT(*) as total_programs,
        COUNT(*) FILTER (WHERE status = 'published') as published_programs,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_programs
      FROM virtual_internship_programs
      WHERE company_user_id = $1 ${dateFilter}`,
      params
    );
    
    // Virtual Internship Enrollments
    const enrollmentStats = await query(
      `SELECT 
        COUNT(*) as total_enrollments,
        COUNT(*) FILTER (WHERE enrollment_status = 'applied') as applied_enrollments,
        COUNT(*) FILTER (WHERE enrollment_status = 'accepted') as accepted_enrollments,
        COUNT(*) FILTER (WHERE enrollment_status = 'in_progress') as in_progress_enrollments,
        COUNT(*) FILTER (WHERE enrollment_status = 'completed') as completed_enrollments
      FROM virtual_internship_enrollments vie
      INNER JOIN virtual_internship_programs vip ON vie.program_id = vip.id
      WHERE vip.company_user_id = $1 ${dateFilter}`,
      params
    );
    
    // Challenges Analytics
    const challengesStats = await query(
      `SELECT 
        COUNT(*) as total_challenges,
        COUNT(*) FILTER (WHERE status = 'published') as published_challenges,
        COUNT(*) FILTER (WHERE status = 'open') as open_challenges,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_challenges
      FROM company_challenges
      WHERE company_user_id = $1 ${dateFilter}`,
      params
    );
    
    // Challenge Submissions
    const challengeSubmissionStats = await query(
      `SELECT 
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted_count,
        COUNT(*) FILTER (WHERE status = 'evaluated') as evaluated_count,
        COUNT(*) FILTER (WHERE status = 'passed') as passed_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count
      FROM company_challenge_submissions ccs
      INNER JOIN company_challenges cc ON ccs.challenge_id = cc.id
      WHERE cc.company_user_id = $1 ${dateFilter}`,
      params
    );
    
    // Events Analytics
    const eventsStats = await query(
      `SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE status = 'published') as published_events,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_events
      FROM events
      WHERE company_user_id = $1 ${dateFilter}`,
      params
    );
    
    // Event Registrations (if event_registrations table exists)
    let eventRegistrationsStats = { total_registrations: 0 };
    try {
      const eventRegResult = await query(
        `SELECT COUNT(*) as total_registrations
        FROM event_registrations er
        INNER JOIN events e ON er.event_id = e.id
        WHERE e.company_user_id = $1 ${dateFilter}`,
        params
      );
      eventRegistrationsStats = { total_registrations: parseInt(eventRegResult.rows[0]?.total_registrations || 0) };
    } catch (error) {
      // Table might not exist, ignore
    }
    
    // Recruitment Funnel (Applications)
    const recruitmentFunnel = await query(
      `SELECT 
        a.application_status,
        COUNT(*) as count
      FROM applications a
      INNER JOIN job_postings jp ON a.posting_id = jp.id
      WHERE jp.company_user_id = $1 ${dateFilter}
      GROUP BY a.application_status`,
      params
    );
    
    const funnel = recruitmentFunnel.rows.reduce((acc, row) => {
      acc[row.application_status] = parseInt(row.count);
      return acc;
    }, {});
    
    // Calculate ROI metrics (simplified)
    const jobPostingsData = jobPostingsStats.rows[0];
    const applicationsData = applicationsStats.rows[0];
    const enrollmentData = enrollmentStats.rows[0];
    
    const totalApplications = parseInt(applicationsData?.total_applications || 0);
    const totalHires = parseInt(applicationsData?.accepted_applications || 0);
    const applicationToHireRate = totalApplications > 0 
      ? ((totalHires / totalApplications) * 100).toFixed(2)
      : 0;
    
    return NextResponse.json({
      success: true,
      data: {
        jobPostings: {
          total: parseInt(jobPostingsData?.total_postings || 0),
          active: parseInt(jobPostingsData?.active_postings || 0),
          published: parseInt(jobPostingsData?.published_postings || 0),
          draft: parseInt(jobPostingsData?.draft_postings || 0)
        },
        applications: {
          total: parseInt(applicationsData?.total_applications || 0),
          pending: parseInt(applicationsData?.pending_applications || 0),
          shortlisted: parseInt(applicationsData?.shortlisted_applications || 0),
          accepted: parseInt(applicationsData?.accepted_applications || 0),
          rejected: parseInt(applicationsData?.rejected_applications || 0)
        },
        virtualInternships: {
          totalPrograms: parseInt(virtualInternshipStats.rows[0]?.total_programs || 0),
          publishedPrograms: parseInt(virtualInternshipStats.rows[0]?.published_programs || 0),
          draftPrograms: parseInt(virtualInternshipStats.rows[0]?.draft_programs || 0),
          totalEnrollments: parseInt(enrollmentData?.total_enrollments || 0),
          applied: parseInt(enrollmentData?.applied_enrollments || 0),
          accepted: parseInt(enrollmentData?.accepted_enrollments || 0),
          inProgress: parseInt(enrollmentData?.in_progress_enrollments || 0),
          completed: parseInt(enrollmentData?.completed_enrollments || 0)
        },
        challenges: {
          total: parseInt(challengesStats.rows[0]?.total_challenges || 0),
          published: parseInt(challengesStats.rows[0]?.published_challenges || 0),
          open: parseInt(challengesStats.rows[0]?.open_challenges || 0),
          completed: parseInt(challengesStats.rows[0]?.completed_challenges || 0),
          totalSubmissions: parseInt(challengeSubmissionStats.rows[0]?.total_submissions || 0),
          submitted: parseInt(challengeSubmissionStats.rows[0]?.submitted_count || 0),
          evaluated: parseInt(challengeSubmissionStats.rows[0]?.evaluated_count || 0),
          passed: parseInt(challengeSubmissionStats.rows[0]?.passed_count || 0),
          failed: parseInt(challengeSubmissionStats.rows[0]?.failed_count || 0)
        },
        events: {
          total: parseInt(eventsStats.rows[0]?.total_events || 0),
          published: parseInt(eventsStats.rows[0]?.published_events || 0),
          draft: parseInt(eventsStats.rows[0]?.draft_events || 0),
          totalRegistrations: eventRegistrationsStats.total_registrations
        },
        recruitmentFunnel: funnel,
        metrics: {
          applicationToHireRate: parseFloat(applicationToHireRate),
          totalHires: totalHires,
          totalApplications: totalApplications
        }
      }
    });
  } catch (error) {
    console.error('Error getting company analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get analytics'
      },
      { status: error.status || 500 }
    );
  }
}
