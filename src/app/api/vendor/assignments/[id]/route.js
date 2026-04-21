/**
 * Vendor Assignment Details API Route
 * 
 * GET /api/vendor/assignments/[id] - Get assignment details
 * PUT /api/vendor/assignments/[id] - Update assignment
 * DELETE /api/vendor/assignments/[id] - Delete assignment
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import {
  getVendorAssignments,
  updateVendorAssignment,
  deleteVendorAssignment,
} from '@/lib/db/vendor/assignments.js';

export async function GET(request, { params }) {
  try {
    // Authentication: Only vendors
    const session = await requireRole(request, ['vendor']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    if (!params || !params.id) {
      return NextResponse.json(
        { success: false, error: 'Assignment ID is required' },
        { status: 400 }
      );
    }
    
    const vendorId = session.user.id;
    const assignmentId = params.id;

    // Get assignment (filter by vendor's courses)
    const result = await getVendorAssignments(vendorId, {
      page: 1,
      limit: 1,
      courseId: null,
      status: null,
      search: null,
    });

    // Find the specific assignment
    const assignment = Array.isArray(result?.assignments)
      ? result.assignments.find(a => a && typeof a === 'object' && a.id === assignmentId)
      : null;

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found or does not belong to vendor' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      assignment,
    });
  } catch (error) {
    console.error('Error fetching vendor assignment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch assignment',
      },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    // Authentication: Only vendors
    const session = await requireRole(request, ['vendor']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    if (!params || !params.id) {
      return NextResponse.json(
        { success: false, error: 'Assignment ID is required' },
        { status: 400 }
      );
    }
    
    const vendorId = session.user.id;
    const assignmentId = params.id;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }

    // Validate marks if provided
    if (body.maxMarks !== undefined && body.maxMarks <= 0) {
      return NextResponse.json(
        { success: false, error: 'maxMarks must be greater than 0' },
        { status: 400 }
      );
    }

    if (body.passingMarks !== undefined && body.passingMarks < 0) {
      return NextResponse.json(
        { success: false, error: 'passingMarks must be greater than or equal to 0' },
        { status: 400 }
      );
    }

    if (body.maxMarks && body.passingMarks && body.passingMarks > body.maxMarks) {
      return NextResponse.json(
        { success: false, error: 'passingMarks cannot be greater than maxMarks' },
        { status: 400 }
      );
    }

    // Update assignment
    const assignment = await updateVendorAssignment(vendorId, assignmentId, body);

    return NextResponse.json({
      success: true,
      assignment,
    });
  } catch (error) {
    console.error('Error updating vendor assignment:', error);
    
    // Handle assignment not found or access denied
    if (error.message.includes('not found') || error.message.includes('does not belong')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update assignment',
      },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    // Authentication: Only vendors
    const session = await requireRole(request, ['vendor']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    if (!params || !params.id) {
      return NextResponse.json(
        { success: false, error: 'Assignment ID is required' },
        { status: 400 }
      );
    }
    
    const vendorId = session.user.id;
    const assignmentId = params.id;

    // Delete assignment
    const success = await deleteVendorAssignment(vendorId, assignmentId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting vendor assignment:', error);
    
    // Handle assignment not found or access denied
    if (error.message.includes('not found') || error.message.includes('does not belong')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete assignment',
      },
      { status: error.status || 500 }
    );
  }
}
