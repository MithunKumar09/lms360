/**
 * Certificate Generation Utilities
 * 
 * Handles certificate template filling, QR code generation, and PDF conversion
 */

import QRCode from 'qrcode';

/**
 * Generate QR code data URL for certificate verification
 * @param {string} verificationUrl - URL for certificate verification
 * @returns {Promise<string>} QR code data URL
 */
export async function generateCertificateQRCode(verificationUrl) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Replace placeholders in HTML template
 * @param {string} templateHtml - HTML template with {{placeholders}}
 * @param {Object} data - Data to fill placeholders
 * @returns {string} Filled HTML
 */
export function fillCertificateTemplate(templateHtml, data) {
  if (!templateHtml || typeof templateHtml !== 'string') {
    throw new Error('Template HTML must be a non-empty string');
  }

  let filledHtml = templateHtml;

  // Replace all placeholders with data
  // Supports {{placeholder}} syntax (case-insensitive matching for common placeholders)
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  
  filledHtml = filledHtml.replace(placeholderRegex, (match, key) => {
    // Try exact key first
    if (data[key] !== undefined && data[key] !== null) {
      return String(data[key]);
    }
    
    // Try case-insensitive match for common keys
    const lowerKey = key.toLowerCase();
    const dataKeys = Object.keys(data);
    const matchedKey = dataKeys.find(k => k.toLowerCase() === lowerKey);
    if (matchedKey && data[matchedKey] !== undefined && data[matchedKey] !== null) {
      return String(data[matchedKey]);
    }
    
    // Return original placeholder if no match found
    return match;
  });

  // Also support common variations with underscores and different cases
  const commonPlaceholders = {
    '{{studentName}}': data.studentName || data.name || data.student_name || '',
    '{{student_name}}': data.studentName || data.name || data.student_name || '',
    '{{studentname}}': data.studentName || data.name || data.student_name || '',
    '{{courseName}}': data.courseName || data.course || data.course_name || '',
    '{{course_name}}': data.courseName || data.course || data.course_name || '',
    '{{coursename}}': data.courseName || data.course || data.course_name || '',
    '{{completionDate}}': data.completionDate || data.date || data.completion_date || '',
    '{{completion_date}}': data.completionDate || data.date || data.completion_date || '',
    '{{completiondate}}': data.completionDate || data.date || data.completion_date || '',
    '{{domain}}': data.domain || data.website || '',
    '{{website}}': data.domain || data.website || '',
    '{{verificationCode}}': data.verificationCode || '',
    '{{verification_code}}': data.verificationCode || '',
    '{{verificationcode}}': data.verificationCode || '',
    '{{verificationUrl}}': data.verificationUrl || '',
    '{{verification_url}}': data.verificationUrl || '',
    '{{verificationurl}}': data.verificationUrl || '',
    '{{qrCode}}': data.qrCode || '',
    '{{qr_code}}': data.qrCode || '',
    '{{qrcode}}': data.qrCode || '',
  };

  Object.entries(commonPlaceholders).forEach(([placeholder, value]) => {
    if (value) {
      // Use global flag to replace all occurrences
      filledHtml = filledHtml.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'gi'), value);
    }
  });

  return filledHtml;
}

/**
 * Generate verification URL for certificate
 * @param {string} verificationCode - Unique verification code
 * @param {string} baseUrl - Base URL of the website
 * @returns {string} Verification URL
 */
export function generateVerificationUrl(verificationCode, baseUrl) {
  return `${baseUrl}/verify-certificate?code=${verificationCode}`;
}

/**
 * Generate unique verification code
 * @returns {string} Verification code
 */
export function generateVerificationCode() {
  // Generate a unique code: timestamp + random string
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`.toUpperCase();
}

