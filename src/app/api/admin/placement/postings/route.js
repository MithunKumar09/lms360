/**
 * Admin Placement Postings API Route
 * 
 * GET /api/admin/placement/postings - Get all postings
 * POST /api/admin/placement/postings - Create new posting
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getPostings, createPosting } from '@/lib/db/placement/postings.js';

/**
 * GET /api/admin/placement/postings
 * Get all postings (admin view)
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const { searchParams } = new URL(request.url);
    
    const filters = {
      postingType: searchParams.get('postingType') || null,
      status: searchParams.get('status') || null, // No default - show all
      organizationId: session.user.orgId || searchParams.get('organizationId') || null,
      search: searchParams.get('search') || null,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10')
    };
    
    const result = await getPostings(filters);
    
    return NextResponse.json({
      success: true,
      data: result.postings,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting postings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get postings'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/admin/placement/postings
 * Create a new posting
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const body = await request.json();
    
    const {
      title,
      companyName,
      postingType,
      location,
      description,
      requirements,
      responsibilities,
      salaryMin,
      salaryMax,
      salaryCurrency,
      salaryDisplay,
      requiredSkills,
      preferredQualifications,
      experienceLevel,
      applicationDeadline,
      applicationLink,
      minReadinessScore,
      requiredCourses,
      requiredSkillsList,
      status = 'draft'
    } = body;
    
    // Validation
    if (!title || typeof title !== 'string' || title.trim() === '' || title.length > 255) {
      return NextResponse.json(
        { success: false, error: 'title is required and must be a string with maximum 255 characters' },
        { status: 400 }
      );
    }

    if (!companyName || typeof companyName !== 'string' || companyName.trim() === '' || companyName.length > 255) {
      return NextResponse.json(
        { success: false, error: 'companyName is required and must be a string with maximum 255 characters' },
        { status: 400 }
      );
    }

    if (!postingType || !['internship', 'job', 'contract'].includes(postingType)) {
      return NextResponse.json(
        { success: false, error: 'postingType is required and must be internship, job, or contract' },
        { status: 400 }
      );
    }

    if (location && (typeof location !== 'string' || location.length > 255)) {
      return NextResponse.json(
        { success: false, error: 'location must be a string with maximum 255 characters if provided' },
        { status: 400 }
      );
    }

    if (description && (typeof description !== 'string' || description.length > 10000)) {
      return NextResponse.json(
        { success: false, error: 'description must be a string with maximum 10000 characters if provided' },
        { status: 400 }
      );
    }

    if (requirements && (typeof requirements !== 'string' || requirements.length > 5000)) {
      return NextResponse.json(
        { success: false, error: 'requirements must be a string with maximum 5000 characters if provided' },
        { status: 400 }
      );
    }

    if (responsibilities && (typeof responsibilities !== 'string' || responsibilities.length > 5000)) {
      return NextResponse.json(
        { success: false, error: 'responsibilities must be a string with maximum 5000 characters if provided' },
        { status: 400 }
      );
    }

    if (salaryMin !== undefined && salaryMin !== null && (typeof salaryMin !== 'number' || salaryMin < 0)) {
      return NextResponse.json(
        { success: false, error: 'salaryMin must be a positive number if provided' },
        { status: 400 }
      );
    }

    if (salaryMax !== undefined && salaryMax !== null && (typeof salaryMax !== 'number' || salaryMax < 0)) {
      return NextResponse.json(
        { success: false, error: 'salaryMax must be a positive number if provided' },
        { status: 400 }
      );
    }

    if (salaryMin && salaryMax && salaryMin > salaryMax) {
      return NextResponse.json(
        { success: false, error: 'salaryMin cannot be greater than salaryMax' },
        { status: 400 }
      );
    }

    if (minReadinessScore !== undefined && minReadinessScore !== null && (typeof minReadinessScore !== 'number' || minReadinessScore < 0 || minReadinessScore > 100)) {
      return NextResponse.json(
        { success: false, error: 'minReadinessScore must be a number between 0 and 100 if provided' },
        { status: 400 }
      );
    }

    if (requiredSkills && !Array.isArray(requiredSkills)) {
      return NextResponse.json(
        { success: false, error: 'requiredSkills must be an array if provided' },
        { status: 400 }
      );
    }

    if (requiredCourses && !Array.isArray(requiredCourses)) {
      return NextResponse.json(
        { success: false, error: 'requiredCourses must be an array if provided' },
        { status: 400 }
      );
    }

    if (requiredSkillsList && !Array.isArray(requiredSkillsList)) {
      return NextResponse.json(
        { success: false, error: 'requiredSkillsList must be an array if provided' },
        { status: 400 }
      );
    }

    if (status && !['draft', 'active', 'closed', 'expired'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'status must be draft, active, closed, or expired' },
        { status: 400 }
      );
    }
    
    const posting = await createPosting({
      title,
      companyName,
      postingType,
      location,
      description,
      requirements,
      responsibilities,
      salaryMin,
      salaryMax,
      salaryCurrency: salaryCurrency || 'INR',
      salaryDisplay,
      requiredSkills,
      preferredQualifications,
      experienceLevel,
      applicationDeadline,
      applicationLink,
      minReadinessScore,
      requiredCourses,
      requiredSkillsList,
      postedBy: session.user.id,
      organizationId: session.user.orgId || null,
      status
    });
    
    return NextResponse.json({
      success: true,
      data: posting,
      message: 'Posting created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating posting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create posting'
      },
      { status: error.status || 500 }
    );
  }
}
