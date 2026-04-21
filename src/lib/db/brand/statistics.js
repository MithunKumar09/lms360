/**
 * Brand Dashboard Statistics Database Utilities
 * 
 * Provides database functions for brand dashboard statistics.
 */

import { query } from '@/lib/db/index.js';

/**
 * Get brand dashboard statistics
 * 
 * @param {string} userId - Brand user ID
 * @returns {Promise<Object>} Dashboard statistics
 */
export async function getBrandDashboardStatistics(userId) {
  // Try to get brand profile ID (if brand_profiles table exists)
  // Brands don't require approval, so we don't check approval_status
  let brandId = null;
  try {
    const profileQuery = `
      SELECT id
      FROM brand_profiles
      WHERE user_id = $1
      LIMIT 1
    `;
    const profileResult = await query(profileQuery, [userId]);
    brandId = profileResult.rows[0]?.id || null;
  } catch (error) {
    // Table doesn't exist or query failed - that's okay, brand can still function
    // Brands created by superadmin don't necessarily need brand_profiles table
    // Expected behavior, no logging needed
    brandId = null;
  }

  // If no brand profile exists, return empty statistics
  // Brand can still use the dashboard, just without events/certificates linked to profile
  if (!brandId) {
    return {
      events: { total: 0, approved: 0, proposed: 0, published: 0, draft: 0, cancelled: 0, registrations: { total: 0 } },
      certificates: { total_templates: 0, issued: 0 },
    };
  }

  // Get events statistics (handle if brand_id column doesn't exist)
  let eventsStats = {
    approved: 0,
    proposed: 0,
    published: 0,
    draft: 0,
    cancelled: 0,
    total: 0,
  };
  
  try {
    const eventsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'proposed') as proposed,
        COUNT(*) FILTER (WHERE status = 'published') as published,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) as total
      FROM events
      WHERE brand_id = $1
    `;
    const eventsResult = await query(eventsQuery, [brandId]);
    eventsStats = eventsResult.rows[0] || eventsStats;
  } catch (error) {
    // Column might not exist or query failed - return zeros
    console.log('[getBrandDashboardStatistics] Events query failed:', error.code);
  }

  // Get event registrations (handle gracefully)
  let registrations = { total: 0 };
  try {
    const registrationsQuery = `
      SELECT COUNT(DISTINCT er.id) as total
      FROM event_registrations er
      INNER JOIN events e ON e.id = er.event_id
      WHERE e.brand_id = $1
    `;
    const registrationsResult = await query(registrationsQuery, [brandId]);
    registrations = registrationsResult.rows[0] || registrations;
  } catch (error) {
    console.log('[getBrandDashboardStatistics] Registrations query failed:', error.code);
  }

  // Get certificates statistics (handle if tables don't exist)
  let certificatesStats = {
    total_templates: 0,
    issued: 0,
  };
  
  try {
    const certificatesQuery = `
      SELECT 
        COUNT(DISTINCT bc.id) as total_templates,
        COUNT(DISTINCT ic.id) as issued
      FROM brand_certificates bc
      LEFT JOIN issued_certificates ic ON ic.certificate_id = bc.id
      WHERE bc.brand_id = $1
    `;
    const certificatesResult = await query(certificatesQuery, [brandId]);
    certificatesStats = certificatesResult.rows[0] || certificatesStats;
  } catch (error) {
    // Tables might not exist - return zeros
    console.log('[getBrandDashboardStatistics] Certificates query failed:', error.code);
  }

  return {
    events: {
      total: parseInt(eventsStats.total) || 0,
      approved: parseInt(eventsStats.approved) || 0,
      proposed: parseInt(eventsStats.proposed) || 0,
      published: parseInt(eventsStats.published) || 0,
      draft: parseInt(eventsStats.draft) || 0,
      cancelled: parseInt(eventsStats.cancelled) || 0,
      registrations: {
        total: parseInt(registrations.total) || 0,
      },
    },
    certificates: {
      total_templates: parseInt(certificatesStats.total_templates) || 0,
      issued: parseInt(certificatesStats.issued) || 0,
    },
  };
}

/**
 * Get brand profile ID from user ID
 * 
 * @param {string} userId - Brand user ID
 * @returns {Promise<string|null>} Brand profile ID or null
 */
async function getBrandProfileId(userId) {
  try {
    const profileQuery = `
      SELECT id
      FROM brand_profiles
      WHERE user_id = $1
      LIMIT 1
    `;
    const profileResult = await query(profileQuery, [userId]);
    return profileResult.rows[0]?.id || null;
  } catch (error) {
    // Table doesn't exist - that's okay, return null gracefully
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
}

/**
 * Get brand monthly trends for line chart
 * Returns monthly data for events, registrations, and certificates over the last 12 months
 * 
 * @param {string} userId - Brand user ID
 * @param {string} metric - Metric type: 'events', 'registrations', or 'certificates'
 * @returns {Promise<Array>} Array of monthly data points
 */
export async function getBrandMonthlyTrends(userId, metric = 'events') {
  const brandId = await getBrandProfileId(userId);
  
  if (!brandId) {
    // Return empty data for last 12 months
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        value: 0,
      });
    }
    return months;
  }

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
  
  try {
    if (metric === 'events') {
      // Monthly events created
      queryStr = `
        SELECT 
          EXTRACT(YEAR FROM created_at) as year,
          EXTRACT(MONTH FROM created_at) as month,
          COUNT(*) as count
        FROM events
        WHERE brand_id = $1
          AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
          AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
        ORDER BY year, month
      `;
    } else if (metric === 'registrations') {
      // Monthly event registrations
      queryStr = `
        SELECT 
          EXTRACT(YEAR FROM er.created_at) as year,
          EXTRACT(MONTH FROM er.created_at) as month,
          COUNT(*) as count
        FROM event_registrations er
        INNER JOIN events e ON er.event_id = e.id
        WHERE e.brand_id = $1
          AND er.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
          AND er.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        GROUP BY EXTRACT(YEAR FROM er.created_at), EXTRACT(MONTH FROM er.created_at)
        ORDER BY year, month
      `;
    } else if (metric === 'certificates') {
      // Monthly certificates issued
      queryStr = `
        SELECT 
          EXTRACT(YEAR FROM ic.issued_at) as year,
          EXTRACT(MONTH FROM ic.issued_at) as month,
          COUNT(*) as count
        FROM issued_certificates ic
        INNER JOIN brand_certificates bc ON ic.certificate_id = bc.id
        WHERE bc.brand_id = $1
          AND ic.issued_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
          AND ic.issued_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        GROUP BY EXTRACT(YEAR FROM ic.issued_at), EXTRACT(MONTH FROM ic.issued_at)
        ORDER BY year, month
      `;
    } else {
      // Return empty data
      return months.map(m => ({ label: m.label, value: 0 }));
    }

    const result = await query(queryStr, [brandId]);
    const dataMap = new Map();
    
    // Map query results
    result.rows.forEach(row => {
      const key = `${row.year}-${row.month}`;
      dataMap.set(key, parseFloat(row.count || 0));
    });

    // Fill in months with 0 if no data
    return months.map(m => ({
      label: m.label,
      value: dataMap.get(`${m.year}-${m.month}`) || 0,
    }));
  } catch (error) {
    // If query fails (table/column doesn't exist), return empty data
    if (error.code === '42P01' || error.code === '42703') {
      return months.map(m => ({ label: m.label, value: 0 }));
    }
    console.error('Error fetching brand monthly trends:', error);
    throw error;
  }
}

/**
 * Get brand distribution data for pie chart
 * Returns distribution based on type: 'event_status', 'certificate_status', or 'event_types'
 * 
 * @param {string} userId - Brand user ID
 * @param {string} type - Distribution type
 * @returns {Promise<Object>} Distribution data object
 */
export async function getBrandDistribution(userId, type = 'event_status') {
  const brandId = await getBrandProfileId(userId);
  
  if (!brandId) {
    // Return empty distribution
    return { labels: [], data: [] };
  }

  try {
    if (type === 'event_status') {
      // Event status distribution
      const queryStr = `
        SELECT 
          COALESCE(COUNT(*) FILTER (WHERE status = 'approved'), 0) as approved,
          COALESCE(COUNT(*) FILTER (WHERE status = 'proposed'), 0) as proposed,
          COALESCE(COUNT(*) FILTER (WHERE status = 'published'), 0) as published,
          COALESCE(COUNT(*) FILTER (WHERE status = 'draft'), 0) as draft,
          COALESCE(COUNT(*) FILTER (WHERE status = 'cancelled'), 0) as cancelled
        FROM events
        WHERE brand_id = $1
      `;
      const result = await query(queryStr, [brandId]);
      const row = result.rows[0];
      
      return {
        labels: ['Approved', 'Proposed', 'Published', 'Draft', 'Cancelled'],
        data: [
          parseInt(row.approved, 10) || 0,
          parseInt(row.proposed, 10) || 0,
          parseInt(row.published, 10) || 0,
          parseInt(row.draft, 10) || 0,
          parseInt(row.cancelled, 10) || 0,
        ],
      };
    } else if (type === 'certificate_status') {
      // Certificate template vs issued distribution
      const queryStr = `
        SELECT 
          COUNT(DISTINCT bc.id) as total_templates,
          COUNT(DISTINCT ic.id) as issued_count
        FROM brand_certificates bc
        LEFT JOIN issued_certificates ic ON ic.certificate_id = bc.id
        WHERE bc.brand_id = $1
      `;
      const result = await query(queryStr, [brandId]);
      const row = result.rows[0];
      
      const templates = parseInt(row.total_templates, 10) || 0;
      const issued = parseInt(row.issued_count, 10) || 0;
      const unissued = Math.max(0, templates - issued);
      
      return {
        labels: ['Issued', 'Not Issued'],
        data: [issued, unissued],
      };
    } else if (type === 'event_types') {
      // Event type distribution (if event_type column exists)
      try {
        const queryStr = `
          SELECT 
            COALESCE(COUNT(*) FILTER (WHERE event_type = 'seminar'), 0) as seminar,
            COALESCE(COUNT(*) FILTER (WHERE event_type = 'hackathon'), 0) as hackathon,
            COALESCE(COUNT(*) FILTER (WHERE event_type = 'challenge'), 0) as challenge,
            COALESCE(COUNT(*) FILTER (WHERE event_type = 'competition'), 0) as competition,
            COALESCE(COUNT(*) FILTER (WHERE event_type = 'awareness_campaign'), 0) as awareness_campaign
          FROM events
          WHERE brand_id = $1
        `;
        const result = await query(queryStr, [brandId]);
        const row = result.rows[0];
        
        return {
          labels: ['Seminar', 'Hackathon', 'Challenge', 'Competition', 'Awareness Campaign'],
          data: [
            parseInt(row.seminar, 10) || 0,
            parseInt(row.hackathon, 10) || 0,
            parseInt(row.challenge, 10) || 0,
            parseInt(row.competition, 10) || 0,
            parseInt(row.awareness_campaign, 10) || 0,
          ],
        };
      } catch (error) {
        // If event_type column doesn't exist, return empty
        if (error.code === '42703') {
          return { labels: [], data: [] };
        }
        throw error;
      }
    }
    
    return { labels: [], data: [] };
  } catch (error) {
    // If query fails (table/column doesn't exist), return empty distribution
    if (error.code === '42P01' || error.code === '42703') {
      return { labels: [], data: [] };
    }
    console.error('Error fetching brand distribution:', error);
    throw error;
  }
}