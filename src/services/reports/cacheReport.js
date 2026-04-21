/**
 * Cache Report
 * 
 * Optional caching service for generated PDF reports
 * Only works if quiz_reports table exists
 */

import { query } from '@/lib/db/index.js';

/**
 * Check if quiz_reports table exists
 * 
 * @returns {Promise<boolean>} True if table exists
 */
async function tableExists() {
  try {
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'quiz_reports'
      );
    `;
    const result = await query(checkQuery);
    return result.rows[0]?.exists || false;
  } catch (error) {
    return false;
  }
}

/**
 * Get cached report if available and not expired
 * 
 * @param {string} quizId - Quiz ID
 * @param {string} generatedBy - User ID who generated the report
 * @param {string} reportType - Report type
 * @returns {Promise<Object|null>} Cached report or null
 */
export async function getCachedReport(quizId, generatedBy, reportType) {
  try {
    const exists = await tableExists();
    if (!exists) {
      return null;
    }

    const cacheQuery = `
      SELECT id, pdf_file_url, pdf_file_key, generated_at, expires_at
      FROM quiz_reports
      WHERE quiz_id = $1
        AND generated_by = $2
        AND report_type = $3
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY generated_at DESC
      LIMIT 1
    `;

    const result = await query(cacheQuery, [quizId, generatedBy, reportType]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      pdfUrl: result.rows[0].pdf_file_url,
      pdfKey: result.rows[0].pdf_file_key,
      generatedAt: result.rows[0].generated_at,
      expiresAt: result.rows[0].expires_at,
    };
  } catch (error) {
    console.error('Error getting cached report:', error);
    return null;
  }
}

/**
 * Cache a generated report
 * 
 * @param {string} quizId - Quiz ID
 * @param {string} generatedBy - User ID
 * @param {string} reportType - Report type
 * @param {Buffer} pdfBuffer - PDF buffer
 * @param {Object} reportData - Report analytics data
 * @returns {Promise<Object>} Cached report info
 */
export async function cacheReport(quizId, generatedBy, reportType, pdfBuffer, reportData) {
  try {
    const exists = await tableExists();
    if (!exists) {
      return null; // Table doesn't exist, skip caching
    }

    // For now, we'll store the PDF data in the report_data JSONB field
    // In a full implementation, you would upload to S3/R2 and store the URL/key
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Cache for 7 days

    const insertQuery = `
      INSERT INTO quiz_reports (
        quiz_id,
        generated_by,
        report_type,
        report_data,
        generated_at,
        expires_at
      ) VALUES ($1, $2, $3, $4, NOW(), $5)
      RETURNING id, generated_at, expires_at
    `;

    const result = await query(insertQuery, [
      quizId,
      generatedBy,
      reportType,
      JSON.stringify(reportData),
      expiresAt.toISOString(),
    ]);

    return {
      id: result.rows[0].id,
      generatedAt: result.rows[0].generated_at,
      expiresAt: result.rows[0].expires_at,
    };
  } catch (error) {
    console.error('Error caching report:', error);
    // Don't throw - caching is optional
    return null;
  }
}

export default {
  getCachedReport,
  cacheReport,
};

