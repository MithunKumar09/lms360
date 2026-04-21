/**
 * Syllabus URL Check API Route
 * 
 * Checks syllabus URL (content-type, size) using HEAD request.
 * Only superadmin users can access this endpoint.
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';

export async function HEAD(request) {
  try {
    let session;
    try {
      session = await requireSuperadmin(request);
    } catch (authError) {
      return new NextResponse(null, {
        status: authError.status || 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { searchParams } = new URL(request.url);
    const syllabusUrl = searchParams.get('url');

    if (!syllabusUrl) {
      return new NextResponse(null, {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Make HEAD request to check URL
      const response = await fetch(syllabusUrl, { method: 'HEAD' });

      if (!response.ok) {
        return new NextResponse(null, {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'X-Syllabus-Status': 'invalid',
            'X-Syllabus-Error': 'URL is not accessible',
          },
        });
      }

      const contentType = response.headers.get('content-type') || '';
      const contentLength = response.headers.get('content-length');
      const size = contentLength ? parseInt(contentLength, 10) : null;

      // Check if it's a PDF or valid document type
      const isValidType = contentType.includes('pdf') ||
        contentType.includes('application/pdf') ||
        contentType.includes('document') ||
        contentType.includes('text');

      // Check size (max 5 MB)
      const maxSize = 5 * 1024 * 1024; // 5 MB
      const isValidSize = size === null || size <= maxSize;

      return new NextResponse(null, {
        status: isValidType && isValidSize ? 200 : 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Syllabus-Content-Type': contentType,
          'X-Syllabus-Size': size ? size.toString() : 'unknown',
          'X-Syllabus-Valid': (isValidType && isValidSize).toString(),
        },
      });
    } catch (fetchError) {
      return new NextResponse(null, {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Syllabus-Status': 'error',
          'X-Syllabus-Error': fetchError.message,
        },
      });
    }
  } catch (error) {
    console.error('Error in HEAD /api/subject-catalog/syllabus-check:', error);
    return new NextResponse(null, {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

