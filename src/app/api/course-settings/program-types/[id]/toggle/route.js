/**
 * Toggle Program Type Status API Route
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import { toggleProgramTypeStatus } from '@/lib/db/course-settings/programTypes.js';

export async function PATCH(request, { params }) {
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
    const programType = await toggleProgramTypeStatus(id, orgId);

    if (!programType) {
      return NextResponse.json(
        { success: false, error: 'Program type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: programType,
        message: `Program type ${programType.status === 1 ? 'activated' : 'deactivated'} successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PATCH /api/course-settings/program-types/[id]/toggle:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to toggle program type status' },
      { status: 500 }
    );
  }
}

