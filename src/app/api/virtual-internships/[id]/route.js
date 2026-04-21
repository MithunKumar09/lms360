/**
 * Virtual Internship Program API Route (Single Program)
 * 
 * GET /api/virtual-internships/[id] - Get program details
 * PUT /api/virtual-internships/[id] - Update program (company only)
 * DELETE /api/virtual-internships/[id] - Delete program (company only)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import {
  getVirtualInternshipProgram,
  updateVirtualInternshipProgram,
  deleteVirtualInternshipProgram,
  hasAccessToProgram,
} from '@/lib/db/virtual-internships/programs.js';

/**
 * GET /api/virtual-internships/[id]
 * Get program details
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['company', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const programId = params.id;

    if (!programId) {
      return NextResponse.json(
        { success: false, error: 'Program ID is required' },
        { status: 400 }
      );
    }

    // Check access
    const hasAccess = await hasAccessToProgram(programId, userId, userRole);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Program not found or access denied' },
        { status: 404 }
      );
    }

    const program = await getVirtualInternshipProgram(programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      program,
    });
  } catch (error) {
    console.error('❌ [API] [Virtual Internship GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch virtual internship program',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/virtual-internships/[id]
 * Update program (company only)
 */
export async function PUT(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const programId = params.id;

    if (!programId) {
      return NextResponse.json(
        { success: false, error: 'Program ID is required' },
        { status: 400 }
      );
    }

    // Verify program belongs to company
    const hasAccess = await hasAccessToProgram(programId, userId, 'company');
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Program not found or access denied' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.industry !== undefined) updates.industry = body.industry;
    if (body.durationWeeks !== undefined) updates.durationWeeks = body.durationWeeks;
    if (body.skillRequirements !== undefined) updates.skillRequirements = body.skillRequirements;
    if (body.status !== undefined) updates.status = body.status;

    const program = await updateVirtualInternshipProgram(programId, updates);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }

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
    console.error('❌ [API] [Virtual Internship PUT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update virtual internship program',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/virtual-internships/[id]
 * Delete program (company only)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const programId = params.id;

    if (!programId) {
      return NextResponse.json(
        { success: false, error: 'Program ID is required' },
        { status: 400 }
      );
    }

    // Verify program belongs to company
    const hasAccess = await hasAccessToProgram(programId, userId, 'company');
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Program not found or access denied' },
        { status: 404 }
      );
    }

    const deleted = await deleteVirtualInternshipProgram(programId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Program deleted successfully',
    });
  } catch (error) {
    console.error('❌ [API] [Virtual Internship DELETE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete virtual internship program',
      },
      { status: error.status || 500 }
    );
  }
}
