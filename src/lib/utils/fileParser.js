/**
 * File Parser Utilities
 * 
 * Provides utilities for parsing CSV and XLSX files.
 * Note: Requires external libraries:
 * - For CSV: papaparse (npm install papaparse)
 * - For XLSX: xlsx (npm install xlsx) or @sheetjs/xlsx
 * 
 * @module utils/fileParser
 */

/**
 * Parse CSV file (server-side)
 * Note: Requires papaparse library (npm install papaparse)
 * 
 * @param {Buffer|string} fileContent - File content as Buffer or string
 * @param {Object} [options] - Parsing options
 * @returns {Promise<Object>} Parsed data with rows array
 */
export async function parseCSV(fileContent, options = {}) {
  try {
    // Dynamic import of papaparse (if available)
    let Papa;
    try {
      Papa = (await import('papaparse')).default || (await import('papaparse'));
    } catch (error) {
      throw new Error('papaparse library not found. Please install it: npm install papaparse');
    }

    const {
      header = true,
      skipEmptyLines = true,
      transformHeader = (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
    } = options;

    return new Promise((resolve, reject) => {
      const content = Buffer.isBuffer(fileContent) ? fileContent.toString('utf-8') : fileContent;

      Papa.parse(content, {
        header,
        skipEmptyLines,
        transformHeader,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            reject(new Error(`CSV parsing errors: ${results.errors.map((e) => e.message).join(', ')}`));
          } else {
            resolve({
              data: results.data || [],
              errors: results.errors || [],
              meta: results.meta || {},
            });
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Parse XLSX file (server-side)
 * Note: Requires xlsx library (npm install xlsx)
 * 
 * @param {Buffer} fileBuffer - File content as Buffer
 * @param {Object} [options] - Parsing options
 * @returns {Promise<Object>} Parsed data with rows array
 */
export async function parseXLSX(fileBuffer, options = {}) {
  try {
    // Dynamic import of xlsx (if available)
    let XLSX;
    try {
      XLSX = (await import('xlsx')).default || (await import('xlsx'));
    } catch (error) {
      throw new Error('xlsx library not found. Please install it: npm install xlsx');
    }

    const {
      sheetIndex = 0,
      header = true,
      transformHeader = (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
    } = options;

    // Parse workbook
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // Get first sheet
    const sheetName = workbook.SheetNames[sheetIndex];
    if (!sheetName) {
      throw new Error(`Sheet at index ${sheetIndex} not found`);
    }

    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: header ? 1 : 0,
      defval: null,
      blankrows: false,
    });

    if (!header || rawData.length === 0) {
      return {
        data: rawData.map((row) => (Array.isArray(row) ? row : Object.values(row))),
        errors: [],
        meta: { sheetName, rowCount: rawData.length },
      };
    }

    // Transform headers and data
    const headers = rawData[0].map((h) => (h ? transformHeader(String(h)) : `column_${rawData[0].indexOf(h)}`));
    const rows = rawData.slice(1).map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] !== undefined ? row[index] : null;
      });
      return obj;
    });

    return {
      data: rows,
      errors: [],
      meta: { sheetName, rowCount: rows.length, headers },
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Generate CSV from data
 * 
 * @param {Array} data - Array of objects
 * @param {Array} headers - Column headers (if not provided, uses keys from first object)
 * @returns {string} CSV string
 */
export function generateCSV(data, headers = null) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Escape CSV values (handle commas, quotes, newlines)
  const escapeCSVValue = (value) => {
    if (value === null || value === undefined) {
      return '';
    }
    const stringValue = String(value);
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Build CSV rows
  const rows = [csvHeaders.map(escapeCSVValue).join(',')];

  data.forEach((row) => {
    const values = csvHeaders.map((header) => escapeCSVValue(row[header]));
    rows.push(values.join(','));
  });

  return rows.join('\n');
}

/**
 * Generate XLSX from data
 * Note: Requires xlsx library (npm install xlsx)
 * 
 * @param {Array} data - Array of objects
 * @param {Array} headers - Column headers (if not provided, uses keys from first object)
 * @param {Object} [options] - Generation options
 * @returns {Promise<Buffer>} XLSX file buffer
 */
export async function generateXLSX(data, headers = null, options = {}) {
  try {
    // Dynamic import of xlsx (if available)
    let XLSX;
    try {
      XLSX = (await import('xlsx')).default || (await import('xlsx'));
    } catch (error) {
      throw new Error('xlsx library not found. Please install it: npm install xlsx');
    }

    const { sheetName = 'Organizations' } = options;

    if (!Array.isArray(data) || data.length === 0) {
      // Create empty workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([[]]);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
    }

    // Get headers from first object if not provided
    const xlsxHeaders = headers || Object.keys(data[0]);

    // Build worksheet data
    const worksheetData = [
      xlsxHeaders, // Header row
      ...data.map((row) => xlsxHeaders.map((header) => row[header] ?? null)),
    ];

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Auto-size columns (optional)
    const columnWidths = xlsxHeaders.map((header, colIndex) => {
      const maxLength = Math.max(
        header.length,
        ...data.map((row) => {
          const value = row[header];
          return value ? String(value).length : 0;
        })
      );
      return { wch: Math.min(maxLength + 2, 50) }; // Max width 50
    });
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  } catch (error) {
    throw error;
  }
}

/**
 * Parse file based on extension
 * 
 * @param {File|Buffer} file - File object or buffer
 * @param {string} filename - Filename with extension
 * @param {Object} [options] - Parsing options
 * @returns {Promise<Object>} Parsed data with rows array
 */
export async function parseFile(file, filename, options = {}) {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'csv') {
    const content = file instanceof File ? await file.arrayBuffer().then((b) => Buffer.from(b)) : file;
    return await parseCSV(content, options);
  } else if (ext === 'xlsx' || ext === 'xls') {
    const buffer = file instanceof File ? await file.arrayBuffer().then((b) => Buffer.from(b)) : file;
    return await parseXLSX(buffer, options);
  } else {
    throw new Error(`Unsupported file type: ${ext}. Supported types: csv, xlsx, xls`);
  }
}

/**
 * Get template headers for organizations bulk import
 * 
 * @returns {Array} Array of header objects with name, label, and required flag
 */
export function getOrganizationTemplateHeaders() {
  return [
    { name: 'name', label: 'Name', required: true, description: 'Organization name (3-120 chars)' },
    { name: 'slug', label: 'Slug', required: false, description: 'URL-friendly slug (auto-generated if empty)' },
    { name: 'org_type', label: 'Organization Type', required: true, description: 'college, university, institute, department, training_center' },
    { name: 'display_name', label: 'Display Name', required: false, description: 'Optional display name' },
    { name: 'org_code', label: 'Organization Code', required: true, description: 'Unique code (2-8 chars, A-Z0-9)' },
    { name: 'country', label: 'Country', required: true, description: 'Country name' },
    { name: 'state', label: 'State/Province', required: true, description: 'State or province name' },
    { name: 'city', label: 'City', required: true, description: 'City name' },
    { name: 'timezone', label: 'Timezone', required: true, description: 'IANA timezone (e.g., Asia/Kolkata)' },
    { name: 'default_locale', label: 'Default Locale', required: true, description: 'Locale code (e.g., en-IN)' },
    { name: 'currency', label: 'Currency', required: true, description: 'ISO-4217 currency code (e.g., INR)' },
    { name: 'academic_year_start_month', label: 'Academic Year Start Month', required: true, description: 'Month number (1-12)' },
    { name: 'academic_levels', label: 'Academic Levels', required: false, description: 'Comma-separated: primary, high_school, puc, degree, diploma, engineering, post_graduation' },
    { name: 'primary_admin_name', label: 'Primary Admin Name', required: true, description: 'Primary administrator name' },
    { name: 'primary_admin_email', label: 'Primary Admin Email', required: true, description: 'Primary administrator email' },
    { name: 'contact_email', label: 'Contact Email', required: false, description: 'General contact email' },
    { name: 'contact_phone', label: 'Contact Phone', required: false, description: 'General contact phone' },
    { name: 'website_url', label: 'Website URL', required: false, description: 'Organization website URL' },
    { name: 'header_logo_url', label: 'Header Logo URL', required: false, description: 'URL for header logo image' },
    { name: 'square_icon_url', label: 'Square Icon URL', required: false, description: 'URL for square icon image' },
    { name: 'splash_image_url', label: 'Splash Image URL', required: false, description: 'URL for splash image' },
    { name: 'loading_mark_url', label: 'Loading Mark URL', required: false, description: 'URL for loading mark image' },
    { name: 'status', label: 'Status', required: false, description: 'active, inactive, suspended (default: active)' },
  ];
}

export default {
  parseCSV,
  parseXLSX,
  parseFile,
  generateCSV,
  generateXLSX,
  getOrganizationTemplateHeaders,
};

