/**
 * Admin Recruitment Drive Details API Route
 * 
 * GET /api/admin/placement/drives/[id] - Get drive details
 * PUT /api/admin/placement/drives/[id] - Update drive
 * DELETE /api/admin/placement/drives/[id] - Delete drive
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getDrive, updateDrive, deleteDrive } from '@/lib/db/placement/drives.js';

/**
 * GET /api/admin/placement/drives/[id]
 * Get drive details
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const { id: driveId } = params;
    
    if (!driveId) {
      return NextResponse.json(
        { success: false, error: 'Drive ID is required' },
        { status: 400 }
      );
    }
    
    const drive = await getDrive(driveId);
    
    if (!drive) {
      return NextResponse.json(
        { success: false, error: 'Drive not found' },
        { status: 404 }
      );
    }
    
    // Check organization access (if not superadmin)
    if (session.user.role !== 'superadmin' && drive.organizationId !== session.user.orgId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: drive
    });
  } catch (error) {
    console.error('Error getting drive:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get drive'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/admin/placement/drives/[id]
 * Update drive
 */
export async function PUT(request, { params }) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const { id: driveId } = params;
    const body = await request.json();
    
    if (!driveId) {
      return NextResponse.json(
        { success: false, error: 'Drive ID is required' },
        { status: 400 }
      );
    }
    
    // Verify drive exists and user has access
    const existingDrive = await getDrive(driveId);
    if (!existingDrive) {
      return NextResponse.json(
        { success: false, error: 'Drive not found' },
        { status: 404 }
      );
    }
    
    if (session.user.role !== 'superadmin' && existingDrive.organizationId !== session.user.orgId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const drive = await updateDrive(driveId, body);
    
    return NextResponse.json({
      success: true,
      data: drive,
      message: 'Drive updated successfully'
    });
  } catch (error) {
    console.error('Error updating drive:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update drive'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/admin/placement/drives/[id]
 * Delete drive
 */
export async function DELETE(request, { params }) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const { id: driveId } = params;
    
    if (!driveId) {
      return NextResponse.json(
        { success: false, error: 'Drive ID is required' },
        { status: 400 }
      );
    }
    
    // Verify drive exists and user has access
    const existingDrive = await getDrive(driveId);
    if (!existingDrive) {
      return NextResponse.json(
        { success: false, error: 'Drive not found' },
        { status: 404 }
      );
    }
    
    if (session.user.role !== 'superadmin' && existingDrive.organizationId !== session.user.orgId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const deleted = await deleteDrive(driveId);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete drive' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Drive deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting drive:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete drive'
      },
      { status: error.status || 500 }
    );
  }
}
