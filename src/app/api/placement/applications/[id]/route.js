/**
 * Application Details API Route
 * 
 * GET /api/placement/applications/[id] - Get application details
 * DELETE /api/placement/applications/[id] - Withdraw application
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getApplication, withdrawApplication } from '@/lib/db/placement/applications.js';

/**
 * GET /api/placement/applications/[id]
 * Get application details
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    const { id: applicationId } = params;
    const userId = session.user.id;
    
    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
      );
    }
    
    const application = await getApplication(applicationId, userId);
    
    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error getting application:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get application'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/placement/applications/[id]
 * Withdraw an application
 */
export async function DELETE(request, { params }) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    const { id: applicationId } = params;
    const userId = session.user.id;
    
    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
      );
    }
    
    const application = await withdrawApplication(applicationId, userId);
    
    return NextResponse.json({
      success: true,
      data: application,
      message: 'Application withdrawn successfully'
    });
  } catch (error) {
    console.error('Error withdrawing application:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to withdraw application'
      },
      { status: error.status || 500 }
    );
  }
}
