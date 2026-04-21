/**
 * Program Type by ID API Route
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import {
  getProgramTypeById,
  updateProgramType,
  deleteProgramType,
} from '@/lib/db/course-settings/programTypes.js';

export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.program_types, 'read');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid program type ID format' },
        { status: 400 }
      );
    }

    const orgId = userRole === 'admin' ? session.user.orgId : null;
    const programType = await getProgramTypeById(id, orgId);

    if (!programType) {
      return NextResponse.json(
        { success: false, error: 'Program type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: programType }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/course-settings/program-types/[id]:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get program type' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.program_types, 'write');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid program type ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, icon, color, status } = body;

    const updateData = {};
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Program type name cannot be empty', errors: { name: 'Program type name is required' } },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    if (icon !== undefined) updateData.icon = icon?.trim() || null;
    if (color !== undefined) {
      if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return NextResponse.json(
          { success: false, error: 'Invalid color format. Use hex format (e.g., #5f2ded)', errors: { color: 'Invalid color format' } },
          { status: 400 }
        );
      }
      updateData.color = color || null;
    }
    if (status !== undefined) {
      if (status !== 0 && status !== 1) {
        return NextResponse.json(
          { success: false, error: 'Status must be 0 or 1', errors: { status: 'Invalid status value' } },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const orgId = userRole === 'admin' ? session.user.orgId : null;
    const programType = await updateProgramType(id, updateData, orgId);

    if (!programType) {
      return NextResponse.json(
        { success: false, error: 'Program type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: programType, message: 'Program type updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/course-settings/program-types/[id]:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update program type' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.program_types, 'write');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid program type ID format' },
        { status: 400 }
      );
    }

    const orgId = userRole === 'admin' ? session.user.orgId : null;
    const deleted = await deleteProgramType(id, orgId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Program type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Program type deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/course-settings/program-types/[id]:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete program type' },
      { status: 500 }
    );
  }
}

