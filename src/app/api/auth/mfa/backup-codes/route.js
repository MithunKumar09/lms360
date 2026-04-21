/**
 * Backup Codes API Route
 * 
 * Manages backup codes for MFA.
 * GET: List unused backup codes (masked)
 * POST: Regenerate backup codes
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import {
  getBackupCodesInfo,
  getUnusedBackupCodesCount,
  regenerateBackupCodes,
} from '@/lib/mfa/backup-codes.js';

/**
 * GET /api/auth/mfa/backup-codes
 * 
 * Returns information about backup codes (masked, showing only status)
 */
export async function GET(request) {
  try {
    // Check authentication
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get backup codes info
    const codesInfo = await getBackupCodesInfo(userId);
    const unusedCount = await getUnusedBackupCodesCount(userId);

    return NextResponse.json(
      {
        success: true,
        unusedCount,
        totalCount: codesInfo.length,
        codes: codesInfo.map((code) => ({
          id: code.id,
          index: code.index,
          used: code.used,
          createdAt: code.createdAt,
          // Don't expose actual codes, only status
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get backup codes error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve backup codes',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/mfa/backup-codes
 * 
 * Regenerates backup codes (invalidates old ones, creates new ones)
 * 
 * Request body (optional):
 * {
 *   confirm: boolean (must be true to regenerate)
 * }
 */
export async function POST(request) {
  try {
    // Check authentication
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { confirm } = body;

    if (confirm !== true) {
      return NextResponse.json(
        {
          success: false,
          error: 'Confirmation required to regenerate backup codes',
        },
        { status: 400 }
      );
    }

    // Regenerate backup codes
    const newCodes = await regenerateBackupCodes(userId);

    return NextResponse.json(
      {
        success: true,
        message: 'Backup codes regenerated successfully',
        backupCodes: newCodes, // Return plain codes - user must save these!
        warning: 'Save these backup codes in a secure location. They will not be shown again.',
        unusedCount: newCodes.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Regenerate backup codes error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to regenerate backup codes',
      },
      { status: 500 }
    );
  }
}


