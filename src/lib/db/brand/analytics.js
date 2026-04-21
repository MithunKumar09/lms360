/**
 * Brand Analytics Database Utilities
 * 
 * Provides database functions for brand analytics and insights.
 */

import { query } from '@/lib/db/index.js';

/**
 * Get brand profile ID from user ID
 * 
 * @param {string} userId - Brand user ID
 * @returns {Promise<string|null>} Brand profile ID or null
 */
async function getBrandProfileId(userId) {
  try {
    const profileQuery = `
      SELECT id FROM brand_profiles WHERE user_id = $1 LIMIT 1
    `;
    const result = await query(profileQuery, [userId]);
    return result.rows[0]?.id || null;
  } catch (error) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
}

/**
 * Get event analytics
 * 
 * @param {string} userId - Brand user ID
 * @param {Object} options - Filter options (dateFrom, dateTo)
 * @returns {Promise<Object>} Event analytics data
 */
export async function getBrandEventAnalytics(userId, options = {}) {
  const { dateFrom, dateTo } = options;
  const brandId = await getBrandProfileId(userId);

  if (!brandId) {
    return getEmptyEventAnalytics();
  }

  // Event status distribution
  const statusQuery = `
    SELECT 
      status,
      COUNT(*) as count
    FROM events
    WHERE brand_id = $1
    GROUP BY status
  `;
  const statusResult = await query(statusQuery, [brandId]);
  const statusDistribution = statusResult.rows.map(row => ({
    status: row.status,
    count: parseInt(row.count, 10),
  }));

  // Events created over time (last 12 months)
  const eventsOverTimeQuery = `
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as count
    FROM events
    WHERE brand_id = $1
      AND created_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month ASC
  `;
  const eventsOverTimeResult = await query(eventsOverTimeQuery, [brandId]);
  const eventsOverTime = eventsOverTimeResult.rows.map(row => ({
    date: row.month.toISOString().split('T')[0],
    count: parseInt(row.count, 10),
  }));

  // Registration status distribution
  const registrationStatusQuery = `
    SELECT 
      er.registration_status,
      COUNT(*) as count
    FROM event_registrations er
    INNER JOIN events e ON e.id = er.event_id
    WHERE e.brand_id = $1
    GROUP BY er.registration_status
  `;
  const registrationStatusResult = await query(registrationStatusQuery, [brandId]);
  const registrationStatusDistribution = registrationStatusResult.rows.map(row => ({
    status: row.registration_status,
    count: parseInt(row.count, 10),
  }));

  // Registrations over time (last 12 months)
  const registrationsOverTimeQuery = `
    SELECT 
      DATE_TRUNC('month', er.registered_at) as month,
      COUNT(*) as count
    FROM event_registrations er
    INNER JOIN events e ON e.id = er.event_id
    WHERE e.brand_id = $1
      AND er.registered_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', er.registered_at)
    ORDER BY month ASC
  `;
  const registrationsOverTimeResult = await query(registrationsOverTimeQuery, [brandId]);
  const registrationsOverTime = registrationsOverTimeResult.rows.map(row => ({
    date: row.month.toISOString().split('T')[0],
    count: parseInt(row.count, 10),
  }));

  // Top events by registrations
  const topEventsQuery = `
    SELECT 
      e.id,
      e.title,
      COUNT(er.id) as registration_count
    FROM events e
    LEFT JOIN event_registrations er ON er.event_id = e.id
    WHERE e.brand_id = $1
    GROUP BY e.id, e.title
    ORDER BY registration_count DESC
    LIMIT 10
  `;
  const topEventsResult = await query(topEventsQuery, [brandId]);
  const topEvents = topEventsResult.rows.map(row => ({
    eventId: row.id,
    title: row.title,
    registrationCount: parseInt(row.registration_count, 10),
  }));

  // Event performance metrics
  const performanceQuery = `
    SELECT 
      COUNT(DISTINCT e.id) as total_events,
      COUNT(DISTINCT er.id) as total_registrations,
      COUNT(DISTINCT er.user_id) as unique_participants,
      AVG(event_reg_counts.reg_count) as avg_registrations_per_event
    FROM events e
    LEFT JOIN event_registrations er ON er.event_id = e.id
    LEFT JOIN (
      SELECT event_id, COUNT(*) as reg_count
      FROM event_registrations
      GROUP BY event_id
    ) event_reg_counts ON event_reg_counts.event_id = e.id
    WHERE e.brand_id = $1
  `;
  const performanceResult = await query(performanceQuery, [brandId]);
  const performance = performanceResult.rows[0] || {};

  return {
    statusDistribution,
    eventsOverTime,
    registrationStatusDistribution,
    registrationsOverTime,
    topEvents,
    performance: {
      totalEvents: parseInt(performance.total_events) || 0,
      totalRegistrations: parseInt(performance.total_registrations) || 0,
      uniqueParticipants: parseInt(performance.unique_participants) || 0,
      avgRegistrationsPerEvent: parseFloat(performance.avg_registrations_per_event) || 0,
    },
  };
}

/**
 * Get certificate analytics
 * 
 * @param {string} userId - Brand user ID
 * @param {Object} options - Filter options (dateFrom, dateTo)
 * @returns {Promise<Object>} Certificate analytics data
 */
export async function getBrandCertificateAnalytics(userId, options = {}) {
  const { dateFrom, dateTo } = options;
  const brandId = await getBrandProfileId(userId);

  if (!brandId) {
    return getEmptyCertificateAnalytics();
  }

  // Certificate templates distribution
  const templatesQuery = `
    SELECT 
      bc.id,
      bc.certificate_name,
      COUNT(ic.id) as issued_count
    FROM brand_certificates bc
    LEFT JOIN issued_certificates ic ON ic.certificate_id = bc.id
    WHERE bc.brand_id = $1
    GROUP BY bc.id, bc.certificate_name
    ORDER BY issued_count DESC
  `;
  const templatesResult = await query(templatesQuery, [brandId]);
  const templatesDistribution = templatesResult.rows.map(row => ({
    templateId: row.id,
    name: row.certificate_name,
    issuedCount: parseInt(row.issued_count, 10),
  }));

  // Certificates issued over time (last 12 months)
  const issuedOverTimeQuery = `
    SELECT 
      DATE_TRUNC('month', ic.issued_at) as month,
      COUNT(*) as count
    FROM issued_certificates ic
    INNER JOIN brand_certificates bc ON bc.id = ic.certificate_id
    WHERE bc.brand_id = $1
      AND ic.issued_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', ic.issued_at)
    ORDER BY month ASC
  `;
  const issuedOverTimeResult = await query(issuedOverTimeQuery, [brandId]);
  const issuedOverTime = issuedOverTimeResult.rows.map(row => ({
    date: row.month.toISOString().split('T')[0],
    count: parseInt(row.count, 10),
  }));

  // Certificate generation status distribution
  const generationStatusQuery = `
    SELECT 
      COALESCE(ic.generation_status, 'not_started') as status,
      COUNT(*) as count
    FROM issued_certificates ic
    INNER JOIN brand_certificates bc ON bc.id = ic.certificate_id
    WHERE bc.brand_id = $1
    GROUP BY COALESCE(ic.generation_status, 'not_started')
  `;
  const generationStatusResult = await query(generationStatusQuery, [brandId]);
  const generationStatusDistribution = generationStatusResult.rows.map(row => ({
    status: row.status,
    count: parseInt(row.count, 10),
  }));

  // Certificate performance metrics
  const performanceQuery = `
    SELECT 
      COUNT(DISTINCT bc.id) as total_templates,
      COUNT(DISTINCT ic.id) as total_issued,
      COUNT(DISTINCT ic.student_id) as unique_students,
      COUNT(DISTINCT ic.id) FILTER (WHERE ic.generation_status = 'completed') as generated_count,
      COUNT(DISTINCT ic.id) FILTER (WHERE ic.generation_status = 'failed') as failed_count
    FROM brand_certificates bc
    LEFT JOIN issued_certificates ic ON ic.certificate_id = bc.id
    WHERE bc.brand_id = $1
  `;
  const performanceResult = await query(performanceQuery, [brandId]);
  const performance = performanceResult.rows[0] || {};

  return {
    templatesDistribution,
    issuedOverTime,
    generationStatusDistribution,
    performance: {
      totalTemplates: parseInt(performance.total_templates) || 0,
      totalIssued: parseInt(performance.total_issued) || 0,
      uniqueStudents: parseInt(performance.unique_students) || 0,
      generatedCount: parseInt(performance.generated_count) || 0,
      failedCount: parseInt(performance.failed_count) || 0,
    },
  };
}

/**
 * Get empty event analytics (when brand profile doesn't exist)
 */
function getEmptyEventAnalytics() {
  return {
    statusDistribution: [],
    eventsOverTime: [],
    registrationStatusDistribution: [],
    registrationsOverTime: [],
    topEvents: [],
    performance: {
      totalEvents: 0,
      totalRegistrations: 0,
      uniqueParticipants: 0,
      avgRegistrationsPerEvent: 0,
    },
  };
}

/**
 * Get empty certificate analytics (when brand profile doesn't exist)
 */
function getEmptyCertificateAnalytics() {
  return {
    templatesDistribution: [],
    issuedOverTime: [],
    generationStatusDistribution: [],
    performance: {
      totalTemplates: 0,
      totalIssued: 0,
      uniqueStudents: 0,
      generatedCount: 0,
      failedCount: 0,
    },
  };
}
