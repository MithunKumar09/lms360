/**
 * Resume Download API Route
 * 
 * POST /api/placement/resume/download - Generate and download resume as PDF
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getResume } from '@/lib/db/placement/resumes.js';

/**
 * POST /api/placement/resume/download
 * Generate PDF from resume and return download link or blob
 * 
 * Note: This is a placeholder. Actual PDF generation will be implemented
 * using jspdf + html2canvas on the client side for better performance.
 * This endpoint can be used to trigger the download or return resume data.
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;
    
    const resume = await getResume(userId);
    
    if (!resume) {
      return NextResponse.json(
        {
          success: false,
          error: 'No resume found. Please create a resume first.'
        },
        { status: 404 }
      );
    }
    
    // For now, return resume data
    // PDF generation will be handled client-side using jspdf + html2canvas
    return NextResponse.json({
      success: true,
      data: {
        resume,
        message: 'Resume data ready for PDF generation',
        note: 'PDF generation should be done client-side using jspdf + html2canvas'
      }
    });
  } catch (error) {
    console.error('Error preparing resume download:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to prepare resume download'
      },
      { status: error.status || 500 }
    );
  }
}
