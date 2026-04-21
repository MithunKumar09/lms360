/**
 * Mentor Materials API Route
 * 
 * GET /api/mentors/materials - List materials
 * POST /api/mentors/materials - Create material (with optional file upload)
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';
import { getR2Client, getR2BucketName, buildR2Key, buildR2PublicUrl } from '@/lib/r2/config.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createMaterialSharedActivity } from '@/lib/db/mentorActivityFeed.js';

/**
 * GET /api/mentors/materials
 * List materials for mentor
 */
export async function GET(request) {
  try {
    console.log('📚 [MENTOR MATERIALS] ===== LIST MATERIALS STARTED =====');
    
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const cohortId = searchParams.get('cohort_id') || null;
    const studentId = searchParams.get('student_id') || null;
    const category = searchParams.get('category') || null;

    // Build WHERE conditions
    const whereConditions = ['mm.mentor_id = $1'];
    const queryParams = [mentorId];
    let paramIndex = 2;

    if (cohortId) {
      whereConditions.push(`mm.cohort_id = $${paramIndex}`);
      queryParams.push(cohortId);
      paramIndex++;
    }

    if (studentId) {
      whereConditions.push(`mm.student_id = $${paramIndex}`);
      queryParams.push(studentId);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`mm.category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM mentor_materials mm
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get materials
    const materialsQuery = `
      SELECT 
        mm.id,
        mm.mentor_id,
        mm.cohort_id,
        mm.student_id,
        mm.title,
        mm.description,
        mm.category,
        mm.file_key,
        mm.file_url,
        mm.external_url,
        mm.created_at,
        mm.updated_at,
        c.code as cohort_code,
        u.id as student_user_id,
        u.first_name as student_first_name,
        u.last_name as student_last_name
      FROM mentor_materials mm
      LEFT JOIN cohorts c ON mm.cohort_id = c.id
      LEFT JOIN users u ON mm.student_id = u.id
      ${whereClause}
      ORDER BY mm.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const materialsResult = await query(materialsQuery, queryParams);

    const materials = materialsResult.rows.map(row => ({
      id: row.id,
      mentorId: row.mentor_id,
      cohortId: row.cohort_id,
      studentId: row.student_id,
      title: row.title,
      description: row.description,
      category: row.category,
      fileKey: row.file_key,
      fileUrl: row.file_url,
      externalUrl: row.external_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      cohort: row.cohort_code ? { code: row.cohort_code } : null,
      student: row.student_user_id ? {
        id: row.student_user_id,
        firstName: row.student_first_name,
        lastName: row.student_last_name,
      } : null,
    }));

    console.log('📚 [MENTOR MATERIALS] ✅ Materials fetched:', materials.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          materials,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📚 [MENTOR MATERIALS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch materials' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mentors/materials
 * Create material (supports both file upload and external URL)
 */
export async function POST(request) {
  try {
    console.log('📚 [MENTOR MATERIALS] ===== CREATE MATERIAL STARTED =====');
    
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Check if request contains FormData (file upload) or JSON (external URL)
    const contentType = request.headers.get('content-type') || '';
    let materialData;
    let file = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      file = formData.get('file');
      materialData = {
        cohort_id: formData.get('cohort_id') || null,
        student_id: formData.get('student_id') || null,
        title: formData.get('title'),
        description: formData.get('description') || null,
        category: formData.get('category') || null,
      };
    } else {
      materialData = await request.json();
    }

    const {
      cohort_id,
      student_id,
      title,
      description,
      category,
      external_url,
    } = materialData;

    // Validation
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'title is required' },
        { status: 400 }
      );
    }

    // Must have either file or external_url
    if (!file && !external_url) {
      return NextResponse.json(
        { success: false, error: 'Either file or external_url is required' },
        { status: 400 }
      );
    }

    if (file && external_url) {
      return NextResponse.json(
        { success: false, error: 'Cannot provide both file and external_url' },
        { status: 400 }
      );
    }

    if (category) {
      const validCategories = ['document', 'video', 'link', 'other'];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { success: false, error: `category must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate student_id if provided
    if (student_id) {
      const relationshipQuery = `
        SELECT id FROM mentor_student_assignments
        WHERE mentor_id = $1 AND student_id = $2
      `;
      const relationshipResult = await query(relationshipQuery, [mentorId, student_id]);
      if (relationshipResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid student_id' },
          { status: 400 }
        );
      }
    }

    let fileKey = null;
    let fileUrl = null;
    let finalExternalUrl = external_url || null;

    // Handle file upload
    if (file && file instanceof Blob) {
      // Validate file size (max 50MB for materials)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { success: false, error: 'File size exceeds 50MB limit' },
          { status: 400 }
        );
      }

      // Generate file key
      const filename = file.name || 'material';
      const ext = filename.split('.').pop() || 'bin';
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).slice(2);
      const key = `mentor-materials/${mentorId}/${timestamp}-${randomStr}.${ext}`;
      fileKey = key;
      const fullKey = buildR2Key(key);

      // Upload to R2
      const r2Client = getR2Client();
      const bucket = getR2BucketName();
      const arrayBuffer = await file.arrayBuffer();
      const contentType = file.type || 'application/octet-stream';

      const putCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: fullKey,
        Body: Buffer.from(arrayBuffer),
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      });

      await r2Client.send(putCommand);
      fileUrl = buildR2PublicUrl(key);
    }

    // Insert material
    const insertQuery = `
      INSERT INTO mentor_materials (
        mentor_id,
        cohort_id,
        student_id,
        title,
        description,
        category,
        file_key,
        file_url,
        external_url,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const insertResult = await query(insertQuery, [
      mentorId,
      cohort_id || null,
      student_id || null,
      title.trim(),
      description?.trim() || null,
      category || null,
      fileKey,
      fileUrl,
      finalExternalUrl,
      mentorId,
    ]);

    const material = insertResult.rows[0];

    const materialResponse = {
      id: material.id,
      mentorId: material.mentor_id,
      cohortId: material.cohort_id,
      studentId: material.student_id,
      title: material.title,
      description: material.description,
      category: material.category,
      fileKey: material.file_key,
      fileUrl: material.file_url,
      externalUrl: material.external_url,
      createdAt: material.created_at,
      updatedAt: material.updated_at,
    };

    // Create activity feed entry
    try {
      await createMaterialSharedActivity({
        mentorId: mentorId,
        studentId: student_id || null,
        cohortId: cohort_id || null,
        materialId: material.id,
        materialTitle: title.trim(),
        createdBy: mentorId,
      });
    } catch (activityError) {
      console.error('📰 [MENTOR MATERIALS] Failed to create activity feed entry:', activityError);
    }

    console.log('📚 [MENTOR MATERIALS] ✅ Material created:', material.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          material: materialResponse,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('📚 [MENTOR MATERIALS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create material' 
      },
      { status: 500 }
    );
  }
}
