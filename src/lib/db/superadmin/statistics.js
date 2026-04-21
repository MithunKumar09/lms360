/**
 * Superadmin Dashboard Statistics Database Utilities
 * 
 * Provides superadmin-specific dashboard statistics queries.
 * All queries are GLOBAL (no org_id filtering) - superadmin sees all data.
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/superadmin/statistics
 */

import { query } from '../index.js';

/**
 * Get comprehensive superadmin dashboard statistics
 * Returns global statistics across all organizations
 * @param {string} superadminId - Superadmin user UUID
 * @returns {Promise<Object>} Dashboard statistics object
 */
export async function getSuperadminDashboardStatistics(superadminId) {
  // Get enrolled courses count (active enrollments across ALL courses)
  const enrolledCoursesQuery = `
    SELECT COUNT(DISTINCT ce.id) as count
    FROM course_enrollments ce
    INNER JOIN courses c ON ce.course_id = c.id
    WHERE ce.enrollment_status = 'active'
  `;
  const enrolledResult = await query(enrolledCoursesQuery);
  const enrolledCourses = parseInt(enrolledResult.rows[0]?.count || 0, 10);

  // Get active courses count (published courses across ALL organizations)
  const activeCoursesQuery = `
    SELECT COUNT(*) as count
    FROM courses
    WHERE status = 'published'
  `;
  const activeResult = await query(activeCoursesQuery);
  const activeCourses = parseInt(activeResult.rows[0]?.count || 0, 10);

  // Get complete courses count (completed enrollments across ALL courses)
  const completeCoursesQuery = `
    SELECT COUNT(DISTINCT ce.id) as count
    FROM course_enrollments ce
    INNER JOIN courses c ON ce.course_id = c.id
    WHERE ce.enrollment_status = 'completed'
  `;
  const completeResult = await query(completeCoursesQuery);
  const completeCourses = parseInt(completeResult.rows[0]?.count || 0, 10);

  // Get total courses count (all courses across ALL organizations)
  const totalCoursesQuery = `
    SELECT COUNT(*) as count
    FROM courses
  `;
  const totalCoursesResult = await query(totalCoursesQuery);
  const totalCourses = parseInt(totalCoursesResult.rows[0]?.count || 0, 10);

  // Get total students count (all students across ALL organizations)
  const totalStudentsQuery = `
    SELECT COUNT(*) as count
    FROM users
    WHERE role = 'student'
  `;
  const totalStudentsResult = await query(totalStudentsQuery);
  const totalStudents = parseInt(totalStudentsResult.rows[0]?.count || 0, 10);

  // Get total organizations count
  const totalOrganizationsQuery = `
    SELECT COUNT(*) as count
    FROM organizations
    WHERE status = 'active'
  `;
  const totalOrganizationsResult = await query(totalOrganizationsQuery);
  const totalOrganizations = parseInt(totalOrganizationsResult.rows[0]?.count || 0, 10);

  return {
    enrolledCourses,
    activeCourses,
    completeCourses,
    totalCourses,
    totalStudents,
    totalOrganizations,
  };
}

/**
 * Get superadmin monthly trends for line chart
 * Returns monthly data for enrollments, courses, or students over specified period
 * GLOBAL data across all organizations
 * @param {string} superadminId - Superadmin user UUID
 * @param {string} metric - Metric type: 'enrollments', 'courses', or 'students'
 * @param {string} period - Period: '12months', '6months', or '3months' (default: '12months')
 * @param {string} categoryId - Optional category ID filter
 * @returns {Promise<Array>} Array of monthly data points
 */
export async function getSuperadminMonthlyTrends(superadminId, metric = 'enrollments', period = '12months', categoryId = null) {
  const monthsCount = period === '6months' ? 6 : period === '3months' ? 3 : 12;
  const months = [];
  const now = new Date();
  
  // Generate months array
  for (let i = monthsCount - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleDateString('en-US', { month: 'short' }),
    });
  }

  let queryStr = '';
  const params = [];
  let paramIndex = 1;
  
  // Build category filter if provided
  let categoryFilter = '';
  if (categoryId) {
    categoryFilter = `AND c.category_id = $${paramIndex}`;
    params.push(categoryId);
    paramIndex++;
  }
  
  // Validate monthsCount to prevent SQL injection
  const validMonthsCount = parseInt(monthsCount, 10);
  if (isNaN(validMonthsCount) || validMonthsCount < 1 || validMonthsCount > 24) {
    throw new Error('Invalid period. Must be between 1 and 24 months.');
  }

  if (metric === 'enrollments') {
    // Monthly course enrollments (GLOBAL - no org_id filter)
    queryStr = `
      SELECT 
        EXTRACT(YEAR FROM ce.enrolled_at) as year,
        EXTRACT(MONTH FROM ce.enrolled_at) as month,
        COUNT(*) as count
      FROM course_enrollments ce
      INNER JOIN courses c ON ce.course_id = c.id
      WHERE 1=1
        ${categoryFilter}
        AND ce.enrolled_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${validMonthsCount} months')
        AND ce.enrolled_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      GROUP BY EXTRACT(YEAR FROM ce.enrolled_at), EXTRACT(MONTH FROM ce.enrolled_at)
      ORDER BY year, month
    `;
  } else if (metric === 'courses') {
    // Monthly course creation (GLOBAL - no org_id filter)
    queryStr = `
      SELECT 
        EXTRACT(YEAR FROM c.created_at) as year,
        EXTRACT(MONTH FROM c.created_at) as month,
        COUNT(*) as count
      FROM courses c
      WHERE 1=1
        ${categoryFilter}
        AND c.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${validMonthsCount} months')
        AND c.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      GROUP BY EXTRACT(YEAR FROM c.created_at), EXTRACT(MONTH FROM c.created_at)
      ORDER BY year, month
    `;
  } else if (metric === 'students') {
    // Monthly student registrations (GLOBAL - no org_id filter)
    queryStr = `
      SELECT 
        EXTRACT(YEAR FROM u.created_at) as year,
        EXTRACT(MONTH FROM u.created_at) as month,
        COUNT(*) as count
      FROM users u
      WHERE u.role = 'student'
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
    
    // Map query results
    result.rows.forEach(row => {
      const key = `${row.year}-${row.month}`;
      dataMap.set(key, parseInt(row.count || 0, 10));
    });

    // Fill in months with 0 if no data
    return months.map(m => ({
      label: m.label,
      value: dataMap.get(`${m.year}-${m.month}`) || 0,
    }));
  } catch (error) {
    console.error('Error fetching superadmin monthly trends:', error);
    throw error;
  }
}

/**
 * Get superadmin distribution data for pie chart
 * Returns distribution based on type: 'course_categories', 'enrollment_status', or 'course_status'
 * GLOBAL data across all organizations
 * @param {string} superadminId - Superadmin user UUID
 * @param {string} type - Distribution type
 * @param {string} timePeriod - Optional time period filter: 'today', 'weekly', 'monthly', 'yearly'
 * @returns {Promise<Object>} Distribution data object with labels and data arrays
 */
export async function getSuperadminDistribution(superadminId, type = 'course_categories', timePeriod = null) {
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
      // Distribution by course category (GLOBAL - no org_id filter)
      const queryStr = `
        SELECT 
          COALESCE(cc.name, 'Uncategorized') as category_name,
          COUNT(*) as count
        FROM courses c
        LEFT JOIN course_categories cc ON c.category_id = cc.id
        WHERE 1=1
          ${timeFilter ? timeFilter.replace('created_at', 'c.created_at') : ''}
        GROUP BY cc.name
        ORDER BY count DESC
        LIMIT 10
      `;
      const result = await query(queryStr);
      
      return {
        labels: result.rows.map(row => row.category_name || 'Uncategorized'),
        data: result.rows.map(row => parseInt(row.count || 0, 10)),
      };
    } else if (type === 'enrollment_status') {
      // Distribution by enrollment status (GLOBAL - no org_id filter)
      const queryStr = `
        SELECT 
          ce.enrollment_status,
          COUNT(*) as count
        FROM course_enrollments ce
        INNER JOIN courses c ON ce.course_id = c.id
        WHERE 1=1
          ${timeFilter ? timeFilter.replace('created_at', 'ce.enrolled_at') : ''}
        GROUP BY ce.enrollment_status
        ORDER BY count DESC
      `;
      const result = await query(queryStr);
      
      // Map status to readable labels
      const statusLabels = {
        'active': 'Active',
        'completed': 'Completed',
        'dropped': 'Dropped',
        'suspended': 'Suspended',
      };
      
      return {
        labels: result.rows.map(row => statusLabels[row.enrollment_status] || row.enrollment_status),
        data: result.rows.map(row => parseInt(row.count || 0, 10)),
      };
    } else if (type === 'course_status') {
      // Distribution by course status (GLOBAL - no org_id filter)
      const queryStr = `
        SELECT 
          c.status,
          COUNT(*) as count
        FROM courses c
        WHERE 1=1
          ${timeFilter ? timeFilter.replace('created_at', 'c.created_at') : ''}
        GROUP BY c.status
        ORDER BY count DESC
      `;
      const result = await query(queryStr);
      
      // Map status to readable labels (capitalize first letter)
      const formatStatus = (status) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
      };
      
      return {
        labels: result.rows.map(row => formatStatus(row.status)),
        data: result.rows.map(row => parseInt(row.count || 0, 10)),
      };
    }
    
    return { labels: [], data: [] };
  } catch (error) {
    console.error('Error fetching superadmin distribution:', error);
    throw error;
  }
}
