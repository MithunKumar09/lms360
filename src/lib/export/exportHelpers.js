/**
 * Export Helper Functions
 * 
 * Utility functions for formatting data for export (CSV/XLSX).
 * 
 * @module export/exportHelpers
 */

/**
 * Format date for export
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} Formatted date string
 */
export function formatDateForExport(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return '';

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  } else if (format === 'YYYY-MM-DD HH:mm:ss') {
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } else if (format === 'DD/MM/YYYY') {
    return `${day}/${month}/${year}`;
  } else if (format === 'DD/MM/YYYY HH:mm') {
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  return d.toISOString();
}

/**
 * Format currency for export
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency symbol (default: '₹')
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export function formatCurrencyForExport(amount, currency = '₹', decimals = 2) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '';
  }

  const formatted = parseFloat(amount).toFixed(decimals);
  return `${currency}${formatted}`;
}

/**
 * Sanitize value for export (remove special characters, handle nulls)
 * @param {*} value - Value to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeForExport(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (value instanceof Date) {
    return formatDateForExport(value);
  }

  // Convert to string and remove problematic characters
  let str = String(value);

  // Remove or replace special characters that can break CSV
  str = str.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
  str = str.replace(/\t/g, ' ');

  return str.trim();
}

/**
 * Generate export filename with timestamp
 * @param {string} prefix - Filename prefix
 * @param {string} extension - File extension (csv, xlsx)
 * @param {Date} date - Optional date to use (default: current date)
 * @returns {string} Generated filename
 */
export function getExportFilename(prefix, extension = 'csv', date = new Date()) {
  const dateStr = formatDateForExport(date, 'YYYY-MM-DD');
  const timestamp = date.getTime();
  return `${prefix}-${dateStr}-${timestamp}.${extension}`;
}

/**
 * Format percentage for export
 * @param {number} value - Percentage value (0-100)
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted percentage
 */
export function formatPercentageForExport(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  return `${parseFloat(value).toFixed(decimals)}%`;
}

/**
 * Format array for export (comma-separated)
 * @param {Array} arr - Array to format
 * @param {string} separator - Separator (default: ', ')
 * @returns {string} Formatted string
 */
export function formatArrayForExport(arr, separator = ', ') {
  if (!Array.isArray(arr) || arr.length === 0) {
    return '';
  }

  return arr.map(item => sanitizeForExport(item)).join(separator);
}

/**
 * Format enrollment status for export
 * @param {string} status - Enrollment status
 * @returns {string} Formatted status
 */
export function formatEnrollmentStatusForExport(status) {
  const statusMap = {
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
    suspended: 'Suspended',
  };

  return statusMap[status] || status || '';
}

/**
 * Format registration status for export
 * @param {string} status - Registration status
 * @returns {string} Formatted status
 */
export function formatRegistrationStatusForExport(status) {
  const statusMap = {
    registered: 'Registered',
    cancelled: 'Cancelled',
    attended: 'Attended',
    no_show: 'No Show',
  };

  return statusMap[status] || status || '';
}

/**
 * Format payment status for export
 * @param {string} status - Payment status
 * @returns {string} Formatted status
 */
export function formatPaymentStatusForExport(status) {
  const statusMap = {
    pending: 'Pending',
    paid: 'Paid',
    refunded: 'Refunded',
    failed: 'Failed',
  };

  return statusMap[status] || status || '';
}

export default {
  formatDateForExport,
  formatCurrencyForExport,
  sanitizeForExport,
  getExportFilename,
  formatPercentageForExport,
  formatArrayForExport,
  formatEnrollmentStatusForExport,
  formatRegistrationStatusForExport,
  formatPaymentStatusForExport,
};
