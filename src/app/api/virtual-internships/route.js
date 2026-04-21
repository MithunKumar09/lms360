/**
 * Virtual Internships API Route
 * 
 * Handles virtual internship program operations.
 * 
 * GET /api/virtual-internships - List programs (company: own programs, student: available)
 * POST /api/virtual-internships - Create program (company only)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import {
  createVirtualInternshipProgram,
  listVirtualInternshipPrograms,
} from '@/lib/db/virtual-internships/programs.js';

/**
 * GET /api/virtual-internships
 * List virtual internship programs
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: Filter by status (draft, published, closed)
 * - organizationId: Filter by organization ID
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['company', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') || null;

    const filters = {
      page,
      limit,
      status,
    };

    if (userRole === 'company') {
      // Company users see only their own programs
      filters.companyUserId = userId;
      if (userOrgId) {
        filters.organizationId = userOrgId;
      }
    } else if (userRole === 'student') {
      // Students see published programs (and their enrolled programs)
      filters.status = status || 'published';
      if (userOrgId) {
        filters.organizationId = userOrgId;
      }
    }

    const result = await listVirtualInternshipPrograms(filters);

    return NextResponse.json({
      success: true,
      programs: result.programs,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('❌ [API] [Virtual Internships GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch virtual internship programs',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/virtual-internships
 * Create virtual internship program (company only)
 * 
 * Body:
 * - title: string (required)
 * - description: string (optional)
 * - industry: string (optional)
 * - durationWeeks: number (optional)
 * - skillRequirements: object (optional)
 * - status: 'draft' | 'published' (default: 'draft')
 */
export async function POST(request) {
  console.log('📝 [VIRTUAL INTERNSHIP API] ===== CREATE PROGRAM REQUEST STARTED =====');
  
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const userOrgId = session.user.orgId || session.user.org_id;

    console.log('📝 [VIRTUAL INTERNSHIP API] User authenticated:', {
      userId,
      userOrgId,
      role: session.user.role,
      email: session.user.email,
    });

    const body = await request.json();
    console.log('📝 [VIRTUAL INTERNSHIP API] Request body received:', {
      title: body.title,
      description: body.description ? `${body.description.substring(0, 50)}...` : null,
      industry: body.industry,
      durationWeeks: body.durationWeeks,
      status: body.status,
    });

    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title is required and must be at least 3 characters',
        },
        { status: 400 }
      );
    }

    // Create program
    const program = await createVirtualInternshipProgram({
      companyUserId: userId,
      organizationId: userOrgId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      industry: body.industry?.trim() || null,
      durationWeeks: body.durationWeeks || null,
      skillRequirements: body.skillRequirements || null,
      status: body.status || 'draft',
    });

    console.log('📝 [VIRTUAL INTERNSHIP API] ✅ Program created:', program.id);

    return NextResponse.json({
      success: true,
      program: {
        id: program.id,
        companyUserId: program.company_user_id,
        organizationId: program.organization_id,
        title: program.title,
        description: program.description,
        industry: program.industry,
        durationWeeks: program.duration_weeks,
        skillRequirements: program.skill_requirements,
        status: program.status,
        createdAt: program.created_at,
        updatedAt: program.updated_at,
      },
    });
  } catch (error) {
    console.error('❌ [API] [Virtual Internships POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create virtual internship program',
      },
      { status: error.status || 500 }
    );
  }
}
