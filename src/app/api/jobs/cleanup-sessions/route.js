/**
 * Session Cleanup API Route
 * 
 * API endpoint for running session cleanup job.
 * Can be called by cron jobs or scheduled tasks.
 * 
 * Security: Should be protected with API key or internal network access only.
 */

import { NextResponse } from 'next/server';
import { runSessionCleanup } from '@/lib/jobs/cleanupSessions.js';

/**
 * POST /api/jobs/cleanup-sessions
 * 
 * Runs session cleanup job.
 * 
 * Security: Add API key check in production
 */
export async function POST(request) {
  try {
    // Optional: Add API key authentication for production
    // const apiKey = request.headers.get('x-api-key');
    // if (apiKey !== process.env.CLEANUP_JOB_API_KEY) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const result = await runSessionCleanup();

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('Cleanup job API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run cleanup job',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/cleanup-sessions
 * 
 * Alternative endpoint (for cron jobs that use GET)
 */
export async function GET(request) {
  return POST(request);
}


