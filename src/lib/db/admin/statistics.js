/**
 * Admin Dashboard Statistics Database Utilities
 * 
 * Provides admin-specific dashboard statistics queries.
 * All queries filter by admin's organization (org_id).
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/admin/statistics
 */

import { query } from '../index.js';

/**
 * Get comprehensive admin dashboard statistics
 * @param {string} adminId - Admin user UUID
 * @param {string} orgId - Admin's organization UUID
 * @returns {Promise<Object>} Dashboard statistics object
 */
export async function getAdminDashboardStatistics(adminId, orgId) {
  if (!orgId) {
    // If admin has no org_id, return zeros
    return {
      enrolledCourses: 0,
      activeCourses: 0,
      completeCourses: 0,
      totalCourses: 0,
      totalStudents: 0,
    };
  }

  // Get enrolled courses count (active enrollments in admin's org courses)
  const enrolledCoursesQuery = `
    SELECT COUNT(DISTINCT ce.id) as count
    FROM course_enrollments ce
    INNER JOIN courses c ON ce.course_id = c.id
    WHERE c.org_id = $1
      AND ce.enrollment_status = 'active'
  `;
  const enrolledResult = await query(enrolledCoursesQuery, [orgId]);
  const enrolledCourses = parseInt(
    (Array.isArray(enrolledResult?.rows) && enrolledResult.rows[0]?.count) || 0,
    10
  );

  // Get active courses count (published courses in admin's org)
  const activeCoursesQuery = `
    SELECT COUNT(*) as count
    FROM courses
    WHERE org_id = $1
      AND status = 'published'
  `;
  const activeResult = await query(activeCoursesQuery, [orgId]);
  const activeCourses = parseInt(
    (Array.isArray(activeResult?.rows) && activeResult.rows[0]?.count) || 0,
    10
  );

  // Get complete courses count (completed enrollments in admin's org courses)
  const completeCoursesQuery = `
    SELECT COUNT(DISTINCT ce.id) as count
    FROM course_enrollments ce
    INNER JOIN courses c ON ce.course_id = c.id
    WHERE c.org_id = $1
      AND ce.enrollment_status = 'completed'
  `;
  const completeResult = await query(completeCoursesQuery, [orgId]);
  const completeCourses = parseInt(
    (Array.isArray(completeResult?.rows) && completeResult.rows[0]?.count) || 0,
    10
  );

  // Get total courses count (all courses in admin's org)
  const totalCoursesQuery = `
    SELECT COUNT(*) as count
    FROM courses
    WHERE org_id = $1
  `;
  const totalCoursesResult = await query(totalCoursesQuery, [orgId]);
  const totalCourses = parseInt(
    (Array.isArray(totalCoursesResult?.rows) && totalCoursesResult.rows[0]?.count) || 0,
    10
  );

  // Get total students count (students in admin's org)
  const totalStudentsQuery = `
    SELECT COUNT(*) as count
    FROM users
    WHERE org_id = $1
      AND role = 'student'
  `;
  const totalStudentsResult = await query(totalStudentsQuery, [orgId]);
  const totalStudents = parseInt(
    (Array.isArray(totalStudentsResult?.rows) && totalStudentsResult.rows[0]?.count) || 0,
    10
  );

  return {
    enrolledCourses,
    activeCourses,
    completeCourses,
    totalCourses,
    totalStudents,
  };
}

/**
 * Get admin monthly trends for line chart
 * Returns monthly data for enrollments, courses, or students over specified period
 * @param {string} adminId - Admin user UUID
 * @param {string} orgId - Admin's organization UUID
 * @param {string} metric - Metric type: 'enrollments', 'courses', or 'students'
 * @param {string} period - Period: '12months', '6months', or '3months' (default: '12months')
 * @param {string} categoryId - Optional category ID filter
 * @returns {Promise<Array>} Array of monthly data points
 */
export async function getAdminMonthlyTrends(adminId, orgId, metric = 'enrollments', period = '12months', categoryId = null) {
  if (!orgId) {
    return [];
  }

  // Validate period and calculate monthsCount
  const monthsCount = period === '6months' ? 6 : period === '3months' ? 3 : 12;
  const validMonthsCount = parseInt(monthsCount, 10);
  if (isNaN(validMonthsCount) || validMonthsCount < 1 || validMonthsCount > 24) {
    throw new Error('Invalid period. Must be between 1 and 24 months.');
  }

  const months = [];
  const now = new Date();
  
  // Generate months array
  for (let i = validMonthsCount - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleDateString('en-US', { month: 'short' }),
    });
  }

  let queryStr = '';
  const params = [orgId];
  let paramIndex = 2;
  
  // Build category filter if provided
  let categoryFilter = '';
  if (categoryId) {
    categoryFilter = `AND c.category_id = $${paramIndex}`;
    params.push(categoryId);
    paramIndex++;
  }
  
  if (metric === 'enrollments') {
    // Monthly course enrollments
    queryStr = `
      SELECT 
        EXTRACT(YEAR FROM ce.enrolled_at) as year,
        EXTRACT(MONTH FROM ce.enrolled_at) as month,
        COUNT(*) as count
      FROM course_enrollments ce
      INNER JOIN courses c ON ce.course_id = c.id
      WHERE c.org_id = $1
        ${categoryFilter}
        AND ce.enrolled_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${validMonthsCount} months')
        AND ce.enrolled_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      GROUP BY EXTRACT(YEAR FROM ce.enrolled_at), EXTRACT(MONTH FROM ce.enrolled_at)
      ORDER BY year, month
    `;
  } else if (metric === 'courses') {
    // Monthly course creation
    queryStr = `
      SELECT 
        EXTRACT(YEAR FROM c.created_at) as year,
        EXTRACT(MONTH FROM c.created_at) as month,
        COUNT(*) as count
      FROM courses c
      WHERE c.org_id = $1
        ${categoryFilter}
        AND c.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${validMonthsCount} months')
        AND c.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      GROUP BY EXTRACT(YEAR FROM c.created_at), EXTRACT(MONTH FROM c.created_at)
      ORDER BY year, month
    `;
  } else if (metric === 'students') {
    // Monthly student registrations
    queryStr = `
      SELECT 
        EXTRACT(YEAR FROM u.created_at) as year,
        EXTRACT(MONTH FROM u.created_at) as month,
        COUNT(*) as count
      FROM users u
      WHERE u.org_id = $1
        AND u.role = 'student'
        AND u.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${validMonthsCount} months')
        AND u.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      GROUP BY EXTRACT(YEAR FROM u.created_at), EXTRACT(MONTH FROM u.created_at)
      ORDER BY year, month
    `;
  } else {
    return months.map(m => ({ label: m.label, value: 0 }));
  }

  try {
    const result = await query(queryStr, params);
    const dataMap = new Map();
    
    // Map query results - validate rows array
    if (Array.isArray(result.rows)) {
      result.rows.forEach(row => {
        if (row && typeof row === 'object') {
          const year = row.year;
          const month = row.month;
          if (year !== null && year !== undefined && month !== null && month !== undefined) {
            const key = `${year}-${month}`;
            dataMap.set(key, parseInt(row.count || 0, 10));
          }
        }
      });
    }

    // Fill in months with 0 if no data
    return Array.isArray(months) ? months.map(m => ({
      label: m?.label || '',
      value: dataMap.get(`${m?.year}-${m?.month}`) || 0,
    })) : [];
  } catch (error) {
    console.error('Error fetching admin monthly trends:', error);
    throw error;
  }
}

/**
 * Get admin distribution data for pie chart
 * Returns distribution based on type: 'course_categories', 'enrollment_status', or 'course_status'
 * @param {string} adminId - Admin user UUID
 * @param {string} orgId - Admin's organization UUID
 * @param {string} type - Distribution type
 * @param {string} timePeriod - Optional time period filter: 'today', 'weekly', 'monthly', 'yearly'
 * @returns {Promise<Object>} Distribution data object with labels and data arrays
 */
export async function getAdminDistribution(adminId, orgId, type = 'course_categories', timePeriod = null) {
  if (!orgId) {
    return { labels: [], data: [] };
  }

  try {
    // Build time period filter - will be applied to appropriate table columns
    let timeFilter = '';
    if (timePeriod === 'today') {
      timeFilter = "AND DATE(created_at) = CURRENT_DATE";
    } else if (timePeriod === 'weekly') {
      timeFilter = "AND created_at >= DATE_TRUNC('week', CURRENT_DATE)";
    } else if (timePeriod === 'monthly') {
      timeFilter = "AND created_at >= DATE_TRUNC('month', CURRENT_DATE)";
    } else if (timePeriod === 'yearly') {
      timeFilter = "AND created_at >= DATE_TRUNC('year', CURRENT_DATE)";
    }

    if (type === 'course_categories') {
      // Distribution by course category
      const queryStr = `
        SELECT 
          COALESCE(cc.name, 'Uncategorized') as category_name,
          COUNT(*) as count
        FROM courses c
        LEFT JOIN course_categories cc ON c.category_id = cc.id
        WHERE c.org_id = $1
          ${timeFilter ? timeFilter.replace('created_at', 'c.created_at') : ''}
        GROUP BY cc.name
        ORDER BY count DESC
        LIMIT 10
      `;
      const result = await query(queryStr, [orgId]);
      
      return {
        labels: Array.isArray(result.rows) ? result.rows.map(row => row?.category_name || 'Uncategorized') : [],
        data: Array.isArray(result.rows) ? result.rows.map(row => parseInt(row?.count || 0, 10)) : [],
      };
    } else if (type === 'enrollment_status') {
      // Distribution by enrollment status
      const queryStr = `
        SELECT 
          ce.enrollment_status,
          COUNT(*) as count
        FROM course_enrollments ce
        INNER JOIN courses c ON ce.course_id = c.id
        WHERE c.org_id = $1
          ${timeFilter ? timeFilter.replace('created_at', 'ce.enrolled_at') : ''}
        GROUP BY ce.enrollment_status
        ORDER BY count DESC
      `;
      const result = await query(queryStr, [orgId]);
      
      // Map status to readable labels
      const statusLabels = {
        'active': 'Active',
        'completed': 'Completed',
        'dropped': 'Dropped',
        'suspended': 'Suspended',
      };
      
      return {
        labels: Array.isArray(result.rows) ? result.rows.map(row => statusLabels[row?.enrollment_status] || row?.enrollment_status || 'Unknown') : [],
        data: Array.isArray(result.rows) ? result.rows.map(row => parseInt(row?.count || 0, 10)) : [],
      };
    } else if (type === 'course_status') {
      // Distribution by course status
      const queryStr = `
        SELECT 
          c.status,
          COUNT(*) as count
        FROM courses c
        WHERE c.org_id = $1
          ${timeFilter ? timeFilter.replace('created_at', 'c.created_at') : ''}
        GROUP BY c.status
        ORDER BY count DESC
      `;
      const result = await query(queryStr, [orgId]);
      
      // Map status to readable labels (capitalize first letter)
      const formatStatus = (status) => {
        if (!status || typeof status !== 'string') return 'Unknown';
        return status.charAt(0).toUpperCase() + status.slice(1);
      };
      
      return {
        labels: Array.isArray(result.rows) ? result.rows.map(row => formatStatus(row?.status)) : [],
        data: Array.isArray(result.rows) ? result.rows.map(row => parseInt(row?.count || 0, 10)) : [],
      };
    }
    
    return { labels: [], data: [] };
  } catch (error) {
    console.error('Error fetching admin distribution:', error);
    throw error;
  }
}
