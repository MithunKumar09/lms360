/**
 * Drive Registration API Route
 * 
 * POST /api/placement/drives/[id]/register - Register for a drive
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { registerForDrive, checkDriveEligibility } from '@/lib/db/placement/drives.js';

/**
 * POST /api/placement/drives/[id]/register
 * Register the authenticated user for a recruitment drive
 */
export async function POST(request, { params }) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    const { id: driveId } = params;
    const userId = session.user.id;
    
    if (!driveId) {
      return NextResponse.json(
        { success: false, error: 'Drive ID is required' },
        { status: 400 }
      );
    }
    
    // Check eligibility first
    const eligibility = await checkDriveEligibility(userId, driveId);
    
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          success: false,
          error: eligibility.reason || 'Not eligible for this drive',
          eligibility
        },
        { status: 403 }
      );
    }
    
    // Register for drive
    const registration = await registerForDrive(userId, driveId);
    
    return NextResponse.json({
      success: true,
      data: registration,
      message: 'Successfully registered for the drive'
    }, { status: 201 });
  } catch (error) {
    console.error('Error registering for drive:', error);
    
    // Handle specific errors
    if (error.message.includes('already registered')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 409 }
      );
    }
    
    if (error.message.includes('full') || error.message.includes('deadline')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to register for drive'
      },
      { status: error.status || 500 }
    );
  }
}
