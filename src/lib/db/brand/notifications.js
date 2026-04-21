/**
 * Brand Certificate Notification Utilities
 * 
 * Provides database functions for sending notifications when certificates are issued.
 */

import { query } from '@/lib/db/index.js';

/**
 * Create notification for student when certificate is issued
 * 
 * @param {string} studentId - Student user ID
 * @param {string} certificateId - Issued certificate ID
 * @param {string} certificateName - Certificate template name
 * @param {string} brandName - Brand name
 * @param {string} certificateUrl - Certificate PDF/image URL
 * @returns {Promise<Object>} Created notification
 */
export async function createCertificateIssuedNotification(
  studentId,
  certificateId,
  certificateName,
  brandName,
  certificateUrl
) {
  const notificationQuery = `
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      action_url
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const title = 'Certificate Issued';
  const message = `You have received a certificate: ${certificateName} from ${brandName}`;
  const data = {
    certificate_id: certificateId,
    certificate_name: certificateName,
    brand_name: brandName,
    certificate_url: certificateUrl,
  };
  const actionUrl = certificateUrl || `/verify-certificate?certificate_id=${certificateId}`;

  const result = await query(notificationQuery, [
    studentId,
    'certificate_issued',
    title,
    message,
    JSON.stringify(data),
    actionUrl,
  ]);

  return result.rows[0];
}
