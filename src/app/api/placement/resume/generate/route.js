/**
 * Resume Generation API Route
 * 
 * POST /api/placement/resume/generate - Auto-generate resume from user data
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { generateResume } from '@/lib/db/placement/resumes.js';

/**
 * POST /api/placement/resume/generate
 * Auto-generate resume from user's profile, courses, assignments, certificates
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;
    
    const resume = await generateResume(userId);
    
    return NextResponse.json({
      success: true,
      data: resume,
      message: 'Resume generated successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating resume:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate resume'
      },
      { status: error.status || 500 }
    );
  }
}
