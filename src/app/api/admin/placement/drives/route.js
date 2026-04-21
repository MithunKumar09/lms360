/**
 * Admin Recruitment Drives API Route
 * 
 * GET /api/admin/placement/drives - Get all drives
 * POST /api/admin/placement/drives - Create new drive
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getDrives, createDrive } from '@/lib/db/placement/drives.js';

/**
 * GET /api/admin/placement/drives
 * Get all drives (admin view)
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || null,
      organizationId: session.user.role === 'superadmin' 
        ? searchParams.get('organizationId') || null
        : session.user.orgId || null,
      fromDate: searchParams.get('fromDate') || null,
      toDate: searchParams.get('toDate') || null,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10')
    };
    
    const result = await getDrives(filters);
    
    return NextResponse.json({
      success: true,
      data: result.drives,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting drives:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get drives'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/admin/placement/drives
 * Create a new recruitment drive
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const body = await request.json();
    
    const {
      title,
      companyName,
      description,
      driveDate,
      driveEndDate,
      location,
      venueAddress,
      isVirtual,
      virtualLink,
      minReadinessScore,
      eligibilityCriteria,
      requiredCourses,
      registrationDeadline,
      maxParticipants,
      status = 'upcoming'
    } = body;
    
    // Validation
    if (!title || !companyName || !driveDate) {
      return NextResponse.json(
        { success: false, error: 'title, companyName, and driveDate are required' },
        { status: 400 }
      );
    }
    
    const drive = await createDrive({
      title,
      companyName,
      description,
      driveDate,
      driveEndDate,
      location,
      venueAddress,
      isVirtual: isVirtual || false,
      virtualLink,
      minReadinessScore,
      eligibilityCriteria,
      requiredCourses,
      registrationDeadline,
      maxParticipants,
      createdBy: session.user.id,
      organizationId: session.user.orgId || null,
      status
    });
    
    return NextResponse.json({
      success: true,
      data: drive,
      message: 'Drive created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating drive:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create drive'
      },
      { status: error.status || 500 }
    );
  }
}
