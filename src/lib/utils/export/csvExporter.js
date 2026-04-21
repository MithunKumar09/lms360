/**
 * CSV Export Utility
 * 
 * Client-side utility for exporting data to CSV format
 */

/**
 * Convert array of objects to CSV string
 * 
 * @param {Array<Object>} data - Array of data objects
 * @param {Array<Object>} headers - Array of header objects with 'key' and 'label' properties
 * @param {Function} transform - Optional transformation function for each row
 * @returns {string} CSV string
 */
export function arrayToCSV(data, headers, transform = null) {
  if (!data || data.length === 0) {
    return '';
  }

  // Build header row
  const headerRow = headers.map(h => escapeCSVValue(h.label || h.key)).join(',');

  // Build data rows
  const dataRows = data.map((row, index) => {
    let processedRow = row;
    
    // Apply transformation if provided
    if (transform && typeof transform === 'function') {
      processedRow = transform(row, index);
    }

    // Extract values based on header keys
    const values = headers.map(header => {
      const key = header.key;
      let value = processedRow[key];

      // Handle nested keys (e.g., 'user.first_name')
      if (key.includes('.')) {
        const keys = key.split('.');
        value = keys.reduce((obj, k) => obj?.[k], processedRow);
      }

      // Apply custom formatter if provided
      if (header.formatter && typeof header.formatter === 'function') {
        value = header.formatter(value, processedRow);
      }

      // Handle null/undefined
      if (value === null || value === undefined) {
        value = '';
      }

      return escapeCSVValue(value);
    });

    return values.join(',');
  });

  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Escape CSV value (handles commas, quotes, newlines)
 * 
 * @param {any} value - Value to escape
 * @returns {string} Escaped CSV value
 */
function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  // Convert to string
  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Download CSV file
 * 
 * @param {string} csvContent - CSV string content
 * @param {string} filename - Filename for download
 */
export function downloadCSV(csvContent, filename) {
  // Add BOM for Excel compatibility with special characters
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Export data array to CSV file
 * 
 * @param {Array<Object>} data - Array of data objects
 * @param {Array<Object>} headers - Array of header objects
 * @param {string} filename - Filename for download
 * @param {Function} transform - Optional transformation function
 */
export function exportToCSV(data, headers, filename, transform = null) {
  const csvContent = arrayToCSV(data, headers, transform);
  downloadCSV(csvContent, filename);
}

/**
 * Format date for CSV
 * 
 * @param {string|Date} date - Date value
 * @param {string} format - Date format (default: 'yyyy-MM-dd HH:mm:ss')
 * @returns {string} Formatted date string
 */
export function formatDateForCSV(date, format = 'yyyy-MM-dd HH:mm:ss') {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    // Simple date formatting (can be enhanced with date-fns if needed)
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    
    if (format === 'yyyy-MM-dd') {
      return `${year}-${month}-${day}`;
    }
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return '';
  }
}
