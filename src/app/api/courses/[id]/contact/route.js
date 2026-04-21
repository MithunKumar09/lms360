/**
 * Course Contact/Inquiry API Route
 * 
 * POST /api/courses/:id/contact - Submit a course inquiry
 */

import { NextResponse } from 'next/server';
import { createCourseInquiry } from '@/lib/db/courses/inquiries.js';

/**
 * POST /api/courses/:id/contact
 * 
 * Submit a course inquiry/contact form
 * Body: { name, email, message }
 */
export async function POST(request, { params }) {
  try {
    const { id: courseId } = params;
    const body = await request.json();
    const { name, email, message } = body;

    // Validate input
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!email || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (!message || message.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Message must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (message.trim().length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Message must be less than 5000 characters' },
        { status: 400 }
      );
    }

    // Create inquiry
    const inquiry = await createCourseInquiry(
      courseId,
      name.trim(),
      email.trim().toLowerCase(),
      message.trim()
    );

    return NextResponse.json({
      success: true,
      inquiry: {
        id: inquiry.id,
        courseId: inquiry.course_id,
        name: inquiry.name,
        email: inquiry.email,
        message: inquiry.message,
        status: inquiry.status,
        createdAt: inquiry.created_at
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating course inquiry:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit inquiry'
      },
      { status: 500 }
    );
  }
}

