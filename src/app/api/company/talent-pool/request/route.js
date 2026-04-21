/**
 * Company Talent Pool Access Request API Route
 * 
 * POST /api/company/talent-pool/request - Request talent pool access
 * GET /api/company/talent-pool/request - Get access request status
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { requestTalentPoolAccess, getAccessRequest } from '@/lib/db/company/talent-pool.js';

/**
 * GET /api/company/talent-pool/request
 * Get access request status
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    
    const accessRequest = await getAccessRequest(userId);
    
    if (!accessRequest) {
      return NextResponse.json({
        success: true,
        data: {
          hasAccess: false,
          status: null,
          request: null
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        hasAccess: accessRequest.status === 'approved',
        status: accessRequest.status,
        request: accessRequest
      }
    });
  } catch (error) {
    console.error('Error getting talent pool access request:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get access request'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/company/talent-pool/request
 * Request talent pool access
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const orgId = session.user.orgId;
    
    const accessRequest = await requestTalentPoolAccess(userId, orgId);
    
    return NextResponse.json({
      success: true,
      data: accessRequest,
      message: 'Access request submitted. Waiting for admin approval.'
    }, { status: 201 });
  } catch (error) {
    console.error('Error requesting talent pool access:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to request access'
      },
      { status: error.status || 500 }
    );
  }
}
