import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkRate } from '@/lib/api/rateLimiter.js';
import { checkCsrf } from '@/lib/api/csrf.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import { listBlogs, createBlog } from '@/lib/db/blogs.js';
import { validateSlug } from '@/lib/db/validations.js';

function getSessionOrgId(session) {
  return session?.user?.org_id || session?.user?.orgId || null;
}

/**
 * GET /api/blogs
 * List blogs with filtering and pagination
 */
export async function GET(request) {
  try {
    // Public access for published global blogs, authenticated for others
    let session = null;
    try {
      session = await requireRole(request, ['superadmin', 'admin', 'vendor', 'instructor', 'student', 'orgadmin', 'orgstudent', 'parent', 'orgparent', 'alumni']);
    } catch (authError) {
      // Allow public access to global published blogs
      // This will be handled in the filtering logic below
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const org_id = searchParams.get('org_id');
    const author_id = searchParams.get('author_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortDir = searchParams.get('sortDir') || 'desc';

    // Determine user role and org_id for filtering
    const userRole = session ? normalizeRole(session.user.role) : null;
    let userOrgId = session ? getSessionOrgId(session) : null;
    let userId = session ? session.user.id : null;

    // Build filters based on user role and requested scope
    const filters = {};
    
    // If no session, only allow viewing published global blogs
    if (!session) {
      filters.scope = 'global';
      filters.status = 'published';
    } else {
      // Apply requested filters with authorization checks
      if (scope) {
        filters.scope = scope;
        
        // Authorization: Only superadmin can access global scope
        if (scope === 'global' && userRole !== 'superadmin') {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: Only superadmin can access global blogs' },
            { status: 403 }
          );
        }
        
        // Authorization: Admin can only access their org scope
        if (scope === 'organization') {
          if (userRole === 'admin' || userRole === 'orgadmin') {
            filters.org_id = userOrgId; // Force user's org
          } else if (org_id) {
            filters.org_id = org_id;
          }
        }
        
        // Authorization: Personal scope - only own blogs
        if (scope === 'personal') {
          if (userRole !== 'student' && userRole !== 'orgstudent') {
            return NextResponse.json(
              { success: false, error: 'Unauthorized: Only students can access personal blogs' },
              { status: 403 }
            );
          }
          filters.author_id = userId; // Force current user
        }
      } else {
        // Default: Filter based on user role
        if (userRole === 'superadmin') {
          // Superadmin can see all scopes
          if (scope) filters.scope = scope;
        } else if (userRole === 'admin' || userRole === 'orgadmin') {
          // Admin sees org blogs
          filters.scope = 'organization';
          filters.org_id = userOrgId;
        } else if (userRole === 'student' || userRole === 'orgstudent') {
          // Student sees own personal blogs
          filters.scope = 'personal';
          filters.author_id = userId;
        }
      }
      
      // Status filter (only authenticated users)
      if (status) {
        filters.status = status;
      } else if (userRole !== 'superadmin' && userRole !== 'admin' && userRole !== 'orgadmin') {
        // Non-admin users only see published blogs
        filters.status = 'published';
      }
      
      // Author filter (for personal scope)
      if (author_id && (scope === 'personal' || userRole === 'superadmin')) {
        filters.author_id = author_id;
      }
      
      // Org filter (for organization scope)
      if (org_id && (scope === 'organization' || userRole === 'superadmin')) {
        if (userRole === 'admin' || userRole === 'orgadmin') {
          // Admin can only see their own org
          if (org_id !== userOrgId) {
            return NextResponse.json(
              { success: false, error: 'Unauthorized: Cannot access other organization blogs' },
              { status: 403 }
            );
          }
        }
        filters.org_id = org_id;
      }
    }
    
    // Search filter
    if (search) {
      filters.search = search;
    }

    const result = await listBlogs(filters, {
      page,
      limit,
      sortBy,
      sortDir,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch blogs' },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[API] Error in GET /api/blogs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blogs
 * Create a new blog
 */
export async function POST(request) {
  try {
    // Authentication required
    const session = await requireRole(request, ['superadmin', 'admin', 'orgadmin', 'student', 'orgstudent']);
    const userRole = normalizeRole(session.user.role);
    const userOrgId = getSessionOrgId(session);

    // CSRF protection
    const csrf = checkCsrf(request);
    if (!csrf.ok) {
      return NextResponse.json(
        { success: false, error: csrf.error || 'CSRF validation failed' },
        { status: 403 }
      );
    }

    // Rate limiting
    const ipAddress = getClientIp(request);
    const rl = checkRate(`blog:create:${session.user.id}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('[API] JSON parse error in POST /api/blogs:', jsonError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.log('[API] POST /api/blogs request body:', {
      hasTitle: !!body.title,
      hasContent: !!body.content,
      scope: body.scope,
      status: body.status,
      userRole,
      bodyKeys: Object.keys(body),
    });

    // Validate required fields
    if (!body.title || !body.content) {
      console.error('[API] POST /api/blogs validation failed:', {
        hasTitle: !!body.title,
        hasContent: !!body.content,
        bodyKeys: Object.keys(body),
      });
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Determine scope based on user role
    let scope = body.scope;
    let org_id = body.org_id;

    if (userRole === 'superadmin') {
      // Superadmin can create global or org blogs
      if (!scope || scope === 'global') {
        scope = 'global';
        org_id = null;
      } else if (scope === 'organization') {
        if (!org_id) {
          return NextResponse.json(
            { success: false, error: 'org_id is required for organization scope' },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Superadmin can only create global or organization blogs' },
          { status: 400 }
        );
      }
    } else if (userRole === 'admin' || userRole === 'orgadmin') {
      // Admin can only create org blogs
      scope = 'organization';
      org_id = userOrgId; // Force user's org
    } else if (userRole === 'student' || userRole === 'orgstudent') {
      // Student can only create personal blogs
      scope = 'personal';
      org_id = null;
    } else {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid role for creating blogs' },
        { status: 403 }
      );
    }

    // Validate slug if provided
    if (body.slug) {
      const slugValidation = validateSlug(body.slug);
      if (!slugValidation.valid) {
        console.error('[API] Slug validation failed:', slugValidation.error, 'slug:', body.slug);
        return NextResponse.json(
          { success: false, error: slugValidation.error },
          { status: 400 }
        );
      }
    }

    // Validate status
    const validStatuses = ['draft', 'published'];
    const status = body.status || 'draft';
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be draft or published' },
        { status: 400 }
      );
    }

    // Prepare blog data
    const blogData = {
      title: body.title.trim(),
      slug: body.slug || null, // Will be auto-generated if not provided
      content: body.content,
      excerpt: body.excerpt || null,
      featured_image_url: body.featured_image_url || null,
      author_id: session.user.id,
      org_id,
      scope,
      status,
      metadata: body.metadata || {},
    };

    const result = await createBlog(blogData);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create blog' },
        { status: 500 }
      );
    }

    // Audit log
    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'blog_created',
        target_type: 'blog',
        target_id: result.blog.id,
        metadata: {
          title: result.blog.title,
          scope: result.blog.scope,
          status: result.blog.status,
        },
        ip_address: ipAddress,
      });
    } catch (auditError) {
      console.error('[API] Failed to create audit log:', auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[API] Error in POST /api/blogs:', error);
    console.error('[API] Error details:', {
      message: error.message,
      stack: error.stack,
      status: error.status,
    });
    
    if (error.status === 403 || error.status === 401) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized' },
        { status: error.status }
      );
    }
    
    // Handle JSON parse errors (400)
    if (error instanceof SyntaxError || error.message?.includes('JSON')) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
