/**
 * Bulk Import Preview API Route
 * 
 * Validates CSV/XLSX file and returns preview with validation results.
 * Does NOT create organizations, only validates.
 * 
 * POST /api/organizations/bulk/preview
 * 
 * Request: FormData with file (CSV or XLSX)
 * 
 * Response:
 * {
 *   rows: [{ data: {...}, errors: {...}, valid: boolean }],
 *   summary: { total, valid, invalid }
 * }
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { parseFile } from '@/lib/utils/fileParser.js';
import { organizationBulkImportSchema, validateForm } from '@/lib/validation/organizationSchemas.js';

/**
 * POST /api/organizations/bulk/preview
 */
export async function POST(request) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: 'File is required',
        },
        { status: 400 }
      );
    }

    // Validate file type and size
    const fileName = file.name || '';
    const fileSize = file.size;
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (fileSize > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (5MB)`,
        },
        { status: 400 }
      );
    }

    // Parse file
    let parsedData;
    try {
      const fileBuffer = await file.arrayBuffer().then((b) => Buffer.from(b));
      parsedData = await parseFile(fileBuffer, fileName, {
        header: true,
        skipEmptyLines: true,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to parse file: ${error.message}`,
        },
        { status: 400 }
      );
    }

    // Validate each row
    const rows = [];
    let validCount = 0;
    let invalidCount = 0;

    parsedData.data.forEach((rowData, index) => {
      // Skip empty rows
      if (!rowData || Object.keys(rowData).length === 0) {
        return;
      }

      // Validate row using Zod schema
      const validation = validateForm(organizationBulkImportSchema, rowData);

      rows.push({
        rowIndex: index + 1, // 1-based index
        data: rowData,
        valid: validation.success,
        errors: validation.errors || {},
        validatedData: validation.data || null,
      });

      if (validation.success) {
        validCount++;
      } else {
        invalidCount++;
      }
    });

    // Log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📋 [BULK] Preview validation:', {
        total: rows.length,
        valid: validCount,
        invalid: invalidCount,
      });
    }

    return NextResponse.json(
      {
        success: true,
        rows,
        summary: {
          total: rows.length,
          valid: validCount,
          invalid: invalidCount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error previewing bulk import:', error);

    // Handle authentication errors
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Superadmin access required.',
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to preview bulk import',
      },
      { status: 500 }
    );
  }
}

