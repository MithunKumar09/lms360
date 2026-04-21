/**
 * Vendor Dashboard Statistics Database Utilities
 * 
 * Provides vendor-specific dashboard statistics queries.
 * All queries filter by vendor's data (created_by = vendorId).
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/vendor/statistics
 */

import { query } from '../index.js';

/**
 * Get comprehensive vendor dashboard statistics
 * @param {string} vendorId - Vendor user UUID
 * @returns {Promise<Object>} Dashboard statistics object
 */
export async function getVendorDashboardStatistics(vendorId) {
  // Get course statistics
  const courseStatsQuery = `
    SELECT 
      COUNT(*) as total_courses,
      COUNT(*) FILTER (WHERE c.status = 'published') as published_courses,
      COUNT(*) FILTER (WHERE c.status = 'draft') as draft_courses,
      COUNT(DISTINCT ce.id) as total_enrollments,
      COUNT(DISTINCT ce.id) FILTER (WHERE ce.enrollment_status = 'active') as active_enrollments,
      COUNT(DISTINCT ce.id) FILTER (WHERE ce.enrollment_status = 'completed') as completed_enrollments
    FROM courses c
    LEFT JOIN course_enrollments ce ON ce.course_id = c.id
    WHERE c.created_by = $1
  `;
  const courseStatsResult = await query(courseStatsQuery, [vendorId]);
  const courseStats = (Array.isArray(courseStatsResult?.rows) && courseStatsResult.rows[0]) || {};

  // Get event statistics
  const eventStatsQuery = `
    SELECT 
      COUNT(*) as total_events,
      COUNT(*) FILTER (WHERE e.status = 'published') as published_events,
      COUNT(DISTINCT er.id) as total_registrations,
      COUNT(DISTINCT er.id) FILTER (WHERE er.registration_status = 'registered') as confirmed_registrations,
      COUNT(DISTINCT er.id) FILTER (WHERE er.registration_status = 'attended') as attended_registrations
    FROM events e
    LEFT JOIN event_registrations er ON er.event_id = e.id
    WHERE e.created_by = $1
  `;
  const eventStatsResult = await query(eventStatsQuery, [vendorId]);
  const eventStats = (Array.isArray(eventStatsResult?.rows) && eventStatsResult.rows[0]) || {};

  // Get workshop statistics
  const workshopStatsQuery = `
    SELECT 
      COUNT(*) as total_workshops,
      COUNT(*) FILTER (WHERE w.status = 'published') as published_workshops,
      COUNT(DISTINCT wr.id) as total_registrations,
      COUNT(DISTINCT wr.id) FILTER (WHERE wr.registration_status = 'registered') as confirmed_registrations,
      COUNT(DISTINCT wr.id) FILTER (WHERE wr.registration_status = 'attended') as attended_registrations
    FROM workshops w
    LEFT JOIN workshop_registrations wr ON wr.workshop_id = w.id
    WHERE w.created_by = $1
  `;
  const workshopStatsResult = await query(workshopStatsQuery, [vendorId]);
  const workshopStats = (Array.isArray(workshopStatsResult?.rows) && workshopStatsResult.rows[0]) || {};

  // Get assignment statistics
  const assignmentStatsQuery = `
    SELECT 
      COUNT(*) as total_assignments,
      COUNT(*) FILTER (WHERE a.status = 'published') as published_assignments,
      COUNT(DISTINCT asub.id) as total_submissions,
      COUNT(DISTINCT asub.id) FILTER (WHERE asub.status = 'graded') as graded_submissions
    FROM assignments a
    INNER JOIN courses c ON a.course_id = c.id
    LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id
    WHERE c.created_by = $1
  `;
  const assignmentStatsResult = await query(assignmentStatsQuery, [vendorId]);
  const assignmentStats = (Array.isArray(assignmentStatsResult?.rows) && assignmentStatsResult.rows[0]) || {};

  // Get quiz statistics
  const quizStatsQuery = `
    SELECT 
      COUNT(*) as total_quizzes,
      COUNT(*) FILTER (WHERE q.status = 'published') as published_quizzes,
      COUNT(DISTINCT qa.id) as total_attempts,
      COUNT(DISTINCT qa.id) FILTER (WHERE qa.status = 'submitted' AND qa.is_passed = true) as passed_attempts
    FROM quizzes q
    LEFT JOIN courses c ON q.course_id = c.id
    LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
    WHERE (q.course_id IS NULL AND q.created_by = $1) OR (q.course_id IS NOT NULL AND c.created_by = $1)
  `;
  const quizStatsResult = await query(quizStatsQuery, [vendorId]);
  const quizStats = (Array.isArray(quizStatsResult?.rows) && quizStatsResult.rows[0]) || {};

  // Get revenue statistics (from orders linked to events/workshops)
  // Event revenue - use 'captured' status for payments (paid status)
  const eventRevenueQuery = `
    SELECT COALESCE(SUM(o.final_amount), 0) as event_revenue
    FROM event_registrations er
    INNER JOIN events e ON er.event_id = e.id
    INNER JOIN orders o ON er.order_id = o.id
    INNER JOIN payments p ON p.order_id = o.id
    WHERE e.created_by = $1 AND p.status = 'captured'
  `;
  const eventRevenueResult = await query(eventRevenueQuery, [vendorId]);
  const eventRevenue = parseFloat(
    (Array.isArray(eventRevenueResult?.rows) && eventRevenueResult.rows[0]?.event_revenue) || 0
  );

  // Workshop revenue - use 'captured' status for payments (paid status)
  const workshopRevenueQuery = `
    SELECT COALESCE(SUM(o.final_amount), 0) as workshop_revenue
    FROM workshop_registrations wr
    INNER JOIN workshops w ON wr.workshop_id = w.id
    INNER JOIN orders o ON wr.order_id = o.id
    INNER JOIN payments p ON p.order_id = o.id
    WHERE w.created_by = $1 AND p.status = 'captured'
  `;
  const workshopRevenueResult = await query(workshopRevenueQuery, [vendorId]);
  const workshopRevenue = parseFloat(
    (Array.isArray(workshopRevenueResult?.rows) && workshopRevenueResult.rows[0]?.workshop_revenue) || 0
  );

  const totalRevenue = eventRevenue + workshopRevenue;

  return {
    courses: {
      total: parseInt(courseStats.total_courses, 10),
      published: parseInt(courseStats.published_courses, 10),
      draft: parseInt(courseStats.draft_courses, 10),
      enrollments: {
        total: parseInt(courseStats.total_enrollments, 10),
        active: parseInt(courseStats.active_enrollments, 10),
        completed: parseInt(courseStats.completed_enrollments, 10),
      },
    },
    events: {
      total: parseInt(eventStats.total_events, 10),
      published: parseInt(eventStats.published_events, 10),
      registrations: {
        total: parseInt(eventStats.total_registrations, 10),
        confirmed: parseInt(eventStats.confirmed_registrations, 10),
        attended: parseInt(eventStats.attended_registrations, 10),
      },
    },
    workshops: {
      total: parseInt(workshopStats.total_workshops, 10),
      published: parseInt(workshopStats.published_workshops, 10),
      registrations: {
        total: parseInt(workshopStats.total_registrations, 10),
        confirmed: parseInt(workshopStats.confirmed_registrations, 10),
        attended: parseInt(workshopStats.attended_registrations, 10),
      },
    },
    assignments: {
      total: parseInt(assignmentStats.total_assignments, 10),
      published: parseInt(assignmentStats.published_assignments, 10),
      submissions: {
        total: parseInt(assignmentStats.total_submissions, 10),
        graded: parseInt(assignmentStats.graded_submissions, 10),
      },
    },
    quizzes: {
      total: parseInt(quizStats.total_quizzes, 10),
      published: parseInt(quizStats.published_quizzes, 10),
      attempts: {
        total: parseInt(quizStats.total_attempts, 10),
        passed: parseInt(quizStats.passed_attempts, 10),
      },
    },
    revenue: {
      total: totalRevenue,
      fromEvents: eventRevenue,
      fromWorkshops: workshopRevenue,
    },
  };
}

/**
 * Get vendor monthly trends for line chart
 * Returns monthly data for enrollments, registrations, and revenue over the last 12 months
 * @param {string} vendorId - Vendor user UUID
 * @param {string} metric - Metric type: 'enrollments', 'registrations', or 'revenue'
 * @returns {Promise<Array>} Array of monthly data points
 */
export async function getVendorMonthlyTrends(vendorId, metric = 'enrollments') {
  const months = [];
  const now = new Date();
  
  // Generate last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleDateString('en-US', { month: 'short' }),
    });
  }

  let queryStr = '';
  
  if (metric === 'enrollments') {
    // Monthly course enrollments
    queryStr = `
      SELECT 
        EXTRACT(YEAR FROM ce.created_at) as year,
        EXTRACT(MONTH FROM ce.created_at) as month,
        COUNT(*) as count
      FROM course_enrollments ce
      INNER JOIN courses c ON ce.course_id = c.id
      WHERE c.created_by = $1
        AND ce.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
        AND ce.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      GROUP BY EXTRACT(YEAR FROM ce.created_at), EXTRACT(MONTH FROM ce.created_at)
      ORDER BY year, month
    `;
  } else if (metric === 'registrations') {
    // Monthly event + workshop registrations
    queryStr = `
      SELECT 
        EXTRACT(YEAR FROM created_at) as year,
        EXTRACT(MONTH FROM created_at) as month,
        COUNT(*) as count
      FROM (
        SELECT er.created_at
        FROM event_registrations er
        INNER JOIN events e ON er.event_id = e.id
        WHERE e.created_by = $1
          AND er.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
          AND er.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        UNION ALL
        SELECT wr.created_at
        FROM workshop_registrations wr
        INNER JOIN workshops w ON wr.workshop_id = w.id
        WHERE w.created_by = $1
          AND wr.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
          AND wr.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      ) combined
      GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY year, month
    `;
  } else if (metric === 'revenue') {
    // Monthly revenue from events and workshops
    queryStr = `
      SELECT 
        EXTRACT(YEAR FROM p.created_at) as year,
        EXTRACT(MONTH FROM p.created_at) as month,
        COALESCE(SUM(o.final_amount), 0) as count
      FROM payments p
      INNER JOIN orders o ON p.order_id = o.id
      WHERE p.status = 'captured'
        AND p.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
        AND p.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        AND (
          EXISTS (
            SELECT 1 FROM event_registrations er
            INNER JOIN events e ON er.event_id = e.id
            WHERE er.order_id = o.id AND e.created_by = $1
          )
          OR EXISTS (
            SELECT 1 FROM workshop_registrations wr
            INNER JOIN workshops w ON wr.workshop_id = w.id
            WHERE wr.order_id = o.id AND w.created_by = $1
          )
        )
      GROUP BY EXTRACT(YEAR FROM p.created_at), EXTRACT(MONTH FROM p.created_at)
      ORDER BY year, month
    `;
  }

  try {
    const result = await query(queryStr, [vendorId]);
    const dataMap = new Map();
    
    // Map query results
    if (Array.isArray(result?.rows)) {
      result.rows
        .filter(row => row && typeof row === 'object')
        .forEach(row => {
          const key = `${row.year}-${row.month}`;
          dataMap.set(key, parseFloat(row.count || 0));
        });
    }

    // Fill in months with 0 if no data
    return months.map(m => ({
      label: m.label,
      value: dataMap.get(`${m.year}-${m.month}`) || 0,
    }));
  } catch (error) {
    console.error('Error fetching vendor monthly trends:', error);
    throw error;
  }
}

/**
 * Get vendor distribution data for pie chart
 * Returns distribution based on type: 'enrollment_status', 'revenue_sources', or 'course_distribution'
 * @param {string} vendorId - Vendor user UUID
 * @param {string} type - Distribution type
 * @returns {Promise<Object>} Distribution data object
 */
export async function getVendorDistribution(vendorId, type = 'enrollment_status') {
  try {
    if (type === 'enrollment_status') {
      // Enrollment status distribution
      const queryStr = `
        SELECT 
          COALESCE(COUNT(*) FILTER (WHERE ce.enrollment_status = 'active'), 0) as active,
          COALESCE(COUNT(*) FILTER (WHERE ce.enrollment_status = 'completed'), 0) as completed,
          COALESCE(COUNT(*) FILTER (WHERE ce.enrollment_status = 'pending'), 0) as pending,
          COALESCE(COUNT(*) FILTER (WHERE ce.enrollment_status = 'cancelled'), 0) as cancelled
        FROM course_enrollments ce
        INNER JOIN courses c ON ce.course_id = c.id
        WHERE c.created_by = $1
      `;
      const result = await query(queryStr, [vendorId]);
      const row = (Array.isArray(result?.rows) && result.rows[0]) || {};
      
      return {
        labels: ['Active', 'Completed', 'Pending', 'Cancelled'],
        data: [
          parseInt(row.active || 0, 10),
          parseInt(row.completed || 0, 10),
          parseInt(row.pending || 0, 10),
          parseInt(row.cancelled || 0, 10),
        ],
      };
    } else if (type === 'revenue_sources') {
      // Revenue sources: Events vs Workshops
      const eventRevenueQuery = `
        SELECT COALESCE(SUM(o.final_amount), 0) as event_revenue
        FROM event_registrations er
        INNER JOIN events e ON er.event_id = e.id
        INNER JOIN orders o ON er.order_id = o.id
        INNER JOIN payments p ON p.order_id = o.id
        WHERE e.created_by = $1 AND p.status = 'captured'
      `;
      const workshopRevenueQuery = `
        SELECT COALESCE(SUM(o.final_amount), 0) as workshop_revenue
        FROM workshop_registrations wr
        INNER JOIN workshops w ON wr.workshop_id = w.id
        INNER JOIN orders o ON wr.order_id = o.id
        INNER JOIN payments p ON p.order_id = o.id
        WHERE w.created_by = $1 AND p.status = 'captured'
      `;
      
      const [eventResult, workshopResult] = await Promise.all([
        query(eventRevenueQuery, [vendorId]),
        query(workshopRevenueQuery, [vendorId]),
      ]);
      
      const eventRevenue = parseFloat(
        (Array.isArray(eventResult?.rows) && eventResult.rows[0]?.event_revenue) || 0
      );
      const workshopRevenue = parseFloat(
        (Array.isArray(workshopResult?.rows) && workshopResult.rows[0]?.workshop_revenue) || 0
      );
      
      return {
        labels: ['Events', 'Workshops'],
        data: [eventRevenue, workshopRevenue],
      };
    } else if (type === 'course_distribution') {
      // Course status distribution
      const queryStr = `
        SELECT 
          COALESCE(COUNT(*) FILTER (WHERE c.status = 'published'), 0) as published,
          COALESCE(COUNT(*) FILTER (WHERE c.status = 'draft'), 0) as draft,
          COALESCE(COUNT(*) FILTER (WHERE c.status = 'archived'), 0) as archived
        FROM courses c
        WHERE c.created_by = $1
      `;
      const result = await query(queryStr, [vendorId]);
      const row = (Array.isArray(result?.rows) && result.rows[0]) || {};
      
      return {
        labels: ['Published', 'Draft', 'Archived'],
        data: [
          parseInt(row.published || 0, 10),
          parseInt(row.draft || 0, 10),
          parseInt(row.archived || 0, 10),
        ],
      };
    }
    
    return { labels: [], data: [] };
  } catch (error) {
    console.error('Error fetching vendor distribution:', error);
    throw error;
  }
}
