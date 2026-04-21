/**
 * Certificate Templates API Route
 * 
 * GET /api/certificates/templates - List all certificate templates
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/certificates/templates
 * List all certificate templates (prebuilt and uploaded)
 */
export async function GET(request) {
  try {
    // Fetch all certificate templates
    const result = await query(
      `SELECT 
        id,
        name,
        type,
        template_html,
        file_url,
        thumbnail_url,
        description,
        is_default,
        created_by,
        created_at,
        updated_at
      FROM certificate_templates
      ORDER BY is_default DESC, name ASC`
    );

    const templates = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      templateHtml: row.template_html,
      fileUrl: row.file_url,
      thumbnailUrl: row.thumbnail_url,
      description: row.description,
      isDefault: row.is_default,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Error fetching certificate templates:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch certificate templates',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

