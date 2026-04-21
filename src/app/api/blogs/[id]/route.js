import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkRate } from '@/lib/api/rateLimiter.js';
import { checkCsrf } from '@/lib/api/csrf.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import { getBlogById, getBlogBySlug, updateBlog, deleteBlog } from '@/lib/db/blogs.js';
import { validateSlug } from '@/lib/db/validations.js';

function getSessionOrgId(session) {
  return session?.user?.org_id || session?.user?.orgId || null;
}

/**
 * Check if a string is a valid UUID
 */
function isUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * GET /api/blogs/:id
 * Get single blog by ID or slug
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Public access for published global blogs, authenticated for others
    let session = null;
    try {
      session = await requireRole(request, ['superadmin', 'admin', 'vendor', 'instructor', 'student', 'orgadmin', 'orgstudent', 'parent', 'orgparent', 'alumni']);
    } catch (authError) {
      // Allow public access - will check blog visibility below
    }

    // Try ID first (UUID), then slug
    let result;
    if (isUUID(id)) {
      result = await getBlogById(id);
    } else {
      result = await getBlogBySlug(id);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Blog not found' },
        { status: 404 }
      );
    }

    const blog = result.blog;
    const userRole = session ? normalizeRole(session.user.role) : null;
    const userOrgId = session ? getSessionOrgId(session) : null;
    const userId = session ? session.user.id : null;

    // Authorization: Check if user can view this blog
    if (blog.scope === 'global') {
      // Global blogs: published = public, draft = superadmin only
      if (blog.status !== 'published' && (userRole !== 'superadmin')) {
        return NextResponse.json(
          { success: false, error: 'Blog not found' },
          { status: 404 }
        );
      }
    } else if (blog.scope === 'organization') {
      // Organization blogs: require authentication and org match
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      // Superadmin can see all org blogs
      if (userRole !== 'superadmin') {
        // Admin/org users can only see their org's blogs
        if (userOrgId !== blog.org_id) {
          return NextResponse.json(
            { success: false, error: 'Blog not found' },
            { status: 404 }
          );
        }
        
        // Non-admin users can only see published org blogs
        if (blog.status !== 'published' && userRole !== 'admin' && userRole !== 'orgadmin') {
          return NextResponse.json(
            { success: false, error: 'Blog not found' },
            { status: 404 }
          );
        }
      }
    } else if (blog.scope === 'personal') {
      // Personal blogs: only the author can view
      if (!session || userId !== blog.author_id) {
        return NextResponse.json(
          { success: false, error: 'Blog not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ success: true, blog }, { status: 200 });
  } catch (error) {
    console.error('[API] Error in GET /api/blogs/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/blogs/:id
 * Update blog
 */
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    
    // Authentication required
    const session = await requireRole(request, ['superadmin', 'admin', 'orgadmin', 'student', 'orgstudent']);
    const userRole = normalizeRole(session.user.role);
    const userOrgId = getSessionOrgId(session);
    const userId = session.user.id;

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
    const rl = checkRate(`blog:update:${session.user.id}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Get existing blog
    const existingResult = await getBlogById(id);
    if (!existingResult.success) {
      return NextResponse.json(
        { success: false, error: 'Blog not found' },
        { status: 404 }
      );
    }

    const existing = existingResult.blog;

    // Authorization: Check if user can update this blog
    if (existing.scope === 'global') {
      // Only superadmin can update global blogs
      if (userRole !== 'superadmin') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Only superadmin can update global blogs' },
          { status: 403 }
        );
      }
    } else if (existing.scope === 'organization') {
      // Admin can update their org's blogs
      if (userRole !== 'superadmin' && (userRole !== 'admin' && userRole !== 'orgadmin' || userOrgId !== existing.org_id)) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Cannot update this blog' },
          { status: 403 }
        );
      }
    } else if (existing.scope === 'personal') {
      // Only the author can update personal blogs
      if (userId !== existing.author_id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Cannot update this blog' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();

    // Validate slug if provided
    if (body.slug) {
      const slugValidation = validateSlug(body.slug);
      if (!slugValidation.valid) {
        return NextResponse.json(
          { success: false, error: slugValidation.error },
          { status: 400 }
        );
      }
    }

    // Validate status if provided
    if (body.status) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status. Must be draft, published, or archived' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.excerpt !== undefined) updateData.excerpt = body.excerpt;
    if (body.featured_image_url !== undefined) updateData.featured_image_url = body.featured_image_url;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    // Scope changes: Only superadmin can change scope
    if (body.scope !== undefined && userRole === 'superadmin') {
      updateData.scope = body.scope;
      if (body.scope === 'global') {
        updateData.org_id = null;
      } else if (body.scope === 'organization' && body.org_id) {
        updateData.org_id = body.org_id;
      } else if (body.scope === 'personal') {
        updateData.org_id = null;
      }
    }

    const result = await updateBlog(id, updateData);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update blog' },
        { status: 500 }
      );
    }

    // Audit log
    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'blog_updated',
        target_type: 'blog',
        target_id: id,
        metadata: {
          title: result.blog.title,
          scope: result.blog.scope,
          status: result.blog.status,
        },
        ip_address: ipAddress,
      });
    } catch (auditError) {
      console.error('[API] Failed to create audit log:', auditError);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[API] Error in PUT /api/blogs/[id]:', error);
    
    if (error.status === 403 || error.status === 401) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized' },
        { status: error.status }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blogs/:id
 * Delete blog
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    // Authentication required
    const session = await requireRole(request, ['superadmin', 'admin', 'orgadmin', 'student', 'orgstudent']);
    const userRole = normalizeRole(session.user.role);
    const userOrgId = getSessionOrgId(session);
    const userId = session.user.id;

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
    await checkRate(session.user.id, ipAddress, {
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
    });

    // Get existing blog
    const existingResult = await getBlogById(id);
    if (!existingResult.success) {
      return NextResponse.json(
        { success: false, error: 'Blog not found' },
        { status: 404 }
      );
    }

    const existing = existingResult.blog;

    // Authorization: Check if user can delete this blog
    if (existing.scope === 'global') {
      // Only superadmin can delete global blogs
      if (userRole !== 'superadmin') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Only superadmin can delete global blogs' },
          { status: 403 }
        );
      }
    } else if (existing.scope === 'organization') {
      // Admin can delete their org's blogs
      if (userRole !== 'superadmin' && (userRole !== 'admin' && userRole !== 'orgadmin' || userOrgId !== existing.org_id)) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Cannot delete this blog' },
          { status: 403 }
        );
      }
    } else if (existing.scope === 'personal') {
      // Only the author can delete personal blogs
      if (userId !== existing.author_id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Cannot delete this blog' },
          { status: 403 }
        );
      }
    }

    const result = await deleteBlog(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to delete blog' },
        { status: 500 }
      );
    }

    // Audit log
    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'blog_deleted',
        target_type: 'blog',
        target_id: id,
        metadata: {
          title: existing.title,
          scope: existing.scope,
        },
        ip_address: ipAddress,
      });
    } catch (auditError) {
      console.error('[API] Failed to create audit log:', auditError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API] Error in DELETE /api/blogs/[id]:', error);
    
    if (error.status === 403 || error.status === 401) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized' },
        { status: error.status }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
