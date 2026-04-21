//edurock/src/middleware.js
/**
 * Next.js Middleware
 * 
 * This middleware runs on every request and handles:
 * - Route protection for dashboard routes
 * - Authentication checks
 * - Role-based access control
 * - MFA verification checks
 * - Session validation
 * - Redirects for unauthenticated users
 * 
 * 🔒 STRICT SECURITY: Superadmin routes have enhanced security enforcement.
 * All redirects are enabled for superadmin routes to ensure maximum protection.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/middleware-auth.js';
import { getRequiredRoleForPath, canAccessRole, getDashboardPath, requiresMfa } from '@/lib/auth/roles.js';
import { extractHostname, isControlPlaneHost } from '@/lib/tenant/hostname.js';

/**
 * Module-level cache for tenant resolution results.
 * Persists within the same Edge worker instance (like the old resolver.js cache).
 * Different Edge instances do not share this cache — acceptable for this use case.
 * Phase 5 will replace this with shared KV (Upstash/Cloudflare KV).
 */
const _tenantCache = new Map();
const _TENANT_CACHE_TTL = 60_000; // 60 seconds — matches resolver.js TTL

/**
 * Module-level cache for vendor ↔ org access checks.
 * Keyed by `${vendorUserId}:${orgId}`.
 * Allowed results cached for 60 s; denied results for 10 s so newly-registered
 * vendors are not locked out for too long.
 */
const _vendorCache = new Map();
const _VENDOR_CACHE_TTL_ALLOWED = 60_000;  //  60 s for positive hits
const _VENDOR_CACHE_TTL_DENIED  = 10_000;  //  10 s for negative hits

function getAdminBaseUrl(request, baseDomain) {
  const protocol =
    process.env.NODE_ENV === 'development'
      ? 'http'
      : 'https';

  const port =
    process.env.NODE_ENV === 'development'
      ? ':3000'
      : '';

  return `${protocol}://admin.${baseDomain}${port}`;
}

/**
 * Check whether a vendor user has an active record in vendor_organizations for
 * the given org.  Calls the internal /api/tenant-vendor-check endpoint (Node.js
 * runtime DB access) and caches the result.
 *
 * Fails closed: returns false on any fetch/parse error.
 *
 * @param {string} userId      Vendor's user UUID (from session.user.id)
 * @param {string} orgId       Organisation UUID (from domain resolution)
 * @param {string} requestUrl  Full URL of the current request (for origin)
 * @returns {Promise<boolean>}
 */
async function checkVendorAccess(userId, orgId, requestUrl) {
  const cacheKey = `${userId}:${orgId}`;
  const cached = _vendorCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.allowed;
  }

  try {
    const origin   = new URL(requestUrl).origin;
    const checkUrl = new URL('/api/tenant-vendor-check', origin);
    checkUrl.searchParams.set('userId', userId);
    checkUrl.searchParams.set('orgId',  orgId);

    const res     = await fetch(checkUrl.toString());
    const data    = res.ok ? await res.json() : { allowed: false };
    const allowed = data.allowed === true;

    const ttl = allowed ? _VENDOR_CACHE_TTL_ALLOWED : _VENDOR_CACHE_TTL_DENIED;
    _vendorCache.set(cacheKey, { allowed, expiresAt: Date.now() + ttl });
    return allowed;
  } catch {
    // Network / parse error — fail closed, do not cache so next request retries.
    return false;
  }
}

/**
 * Resolve a tenant hostname via the internal /api/tenant-resolve route.
 *
 * Uses an in-memory cache to avoid a fetch() on every request for the same host.
 * On cache miss, calls the Node.js-runtime API route which performs the DB query.
 *
 * Returns the same shape as the old resolveTenant():
 *   { orgId, status }           — active tenant
 *   { error: 'NOT_FOUND' }
 *   { error: 'SUSPENDED' }
 *   { error: 'DELETED' }
 *
 * @param {string} hostname     Normalized hostname (from extractHostname)
 * @param {string} requestUrl   Full URL of the current request (for origin extraction)
 * @returns {Promise<object>}
 */
async function resolveTenant(hostname, requestUrl) {
  // Cache hit
  const cached = _tenantCache.get(hostname);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }

  try {
    const origin = new URL(requestUrl).origin;
    const resolveUrl = new URL('/api/tenant-resolve', origin);
    resolveUrl.searchParams.set('host', hostname);

    const res = await fetch(resolveUrl.toString());
    const result = res.ok ? await res.json() : { error: 'NOT_FOUND' };

    // Cache the result. Use a short TTL for error results to avoid locking out
    // a tenant that was just activated (e.g. after DB transient error).
    const ttl = result.error ? 10_000 : _TENANT_CACHE_TTL;
    _tenantCache.set(hostname, { result, expiresAt: Date.now() + ttl });
    return result;
  } catch {
    // Network / parse error — fail closed, do not cache so next request retries.
    return { error: 'NOT_FOUND' };
  }
}

/**
 * Security Headers Middleware
 * Adds security headers to all responses
 */
function addSecurityHeaders(response, pathname = '') {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Note: X-Frame-Options removed - using CSP frame-ancestors instead for better control
  // This allows Razorpay checkout modal iframe while still protecting our pages via CSP
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Allow microphone for create-course pages (transcription feature)
  const isCreateCoursePage = pathname.includes('/create-course') || pathname.includes('/vendor-create-course');
  const permissionsPolicy = isCreateCoursePage 
    ? 'geolocation=(), microphone=(self), camera=()'
    : 'geolocation=(), microphone=(), camera=()';
  response.headers.set('Permissions-Policy', permissionsPolicy);
  
  // Content Security Policy
  // Allow Cloudflare R2 for image uploads (categories, testimonials, etc.)
  // - *.r2.cloudflarestorage.com: For direct uploads to R2
  // - *.r2.dev: For serving images from R2 public URLs
  // Allow YouTube and Vimeo for video embeds
  // Allow blob: URLs for images, PDFs, and other file previews (works in both dev and production)
  // Allow Razorpay for payment processing
  // - checkout.razorpay.com: For Razorpay checkout script and payment modal iframe
  // - api.razorpay.com: For Razorpay API calls (order creation, payment verification) and iframes
  // - lumberjack.razorpay.com: For Razorpay analytics/tracking
  // - *.razorpay.com: Wildcard for all Razorpay subdomains
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com", // Allow Razorpay checkout script and all subdomains
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: https://*.r2.dev https://*.r2.cloudflarestorage.com", // R2 URLs for image previews
    "font-src 'self' data:",
    "object-src 'self' data: https://*.r2.dev https://*.r2.cloudflarestorage.com", // Allow R2 URLs for PDFs and other embedded content
    "connect-src 'self' https://*.r2.cloudflarestorage.com https://*.r2.dev https://*.cloudflarestorage.com https://api.razorpay.com https://lumberjack.razorpay.com https://*.razorpay.com", // R2 URLs and Razorpay API/analytics for fetch/XMLHttpRequest
    "frame-src 'self' https://*.r2.dev https://*.r2.cloudflarestorage.com https://www.youtube.com https://youtube.com https://*.youtube.com https://www.vimeo.com https://vimeo.com https://*.vimeo.com https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com", // R2 URLs for PDF iframes and Razorpay payment modal/iframes
    "media-src 'self' https://*.r2.dev https://*.r2.cloudflarestorage.com https://www.youtube.com https://youtube.com https://*.youtube.com https://www.vimeo.com https://vimeo.com https://*.vimeo.com https:", // R2 URLs for video/audio previews
    "frame-ancestors 'self'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  return response;
}

/**
 * Protected routes configuration
 */
const protectedRoutes = {
  // Superadmin routes
  superadmin: [
    '/dashboards/superadmin-dashboard',
    '/dashboards/superadmin-profile',
    '/dashboards/superadmin-message',
    '/dashboards/superadmin-course',
    '/dashboards/superadmin-reviews',
    '/dashboards/superadmin-quiz-attempts',
    '/dashboards/superadmin-settings',
    '/dashboards/superadmin-vendor-requests',
    '/dashboards/superadmin-mentor-requests',
    '/dashboards/superadmin-manage-vendors',
  ],
  // Admin routes
  admin: [
    '/dashboards/admin-dashboard',
    '/dashboards/admin-profile',
    '/dashboards/admin-message',
    '/dashboards/admin-course',
    '/dashboards/admin-reviews',
    '/dashboards/admin-mentor-requests',
    '/dashboards/admin-quiz-attempts',
    '/dashboards/admin-settings',
    '/dashboards/admin-manage-mentors',
    '/dashboards/organization-finance', // Organization finance page accessible to admin and superadmin
    '/dashboards/announcements', // Announcements page accessible to admin and superadmin
    '/dashboards/admin-placement-postings',
    '/dashboards/admin-placement-applications',
  ],
  // Vendor routes
  vendor: [
    '/dashboards/vendor-dashboard',
    '/dashboards/vendor-finance',
    '/dashboards/vendor-add-event',
    '/dashboards/vendor-manage-events',
    '/dashboards/vendor-edit-event',
    '/dashboards/vendor-add-workshop',
    '/dashboards/vendor-manage-workshops',
    '/dashboards/vendor-edit-workshop',
    '/dashboards/vendor-create-course',
    '/dashboards/vendor-course-management',
    '/dashboards/vendor-edit-course',
    '/dashboards/vendor-profile',
    '/dashboards/vendor-settings',
  ],
  // Instructor routes
  instructor: [
    '/dashboards/instructor-dashboard',
    '/dashboards/instructor-profile',
    '/dashboards/instructor-message',
    '/dashboards/instructor-course',
    '/dashboards/instructor-reviews',
    '/dashboards/instructor-settings',
  ],
  // Student routes
  student: [
    '/dashboards/student-dashboard',
    '/dashboards/student-profile',
    '/dashboards/student-message',
    '/dashboards/student-enrolled-courses',
    '/dashboards/student-reviews',
    '/dashboards/student-settings',
    '/dashboards/student-mentorized-group',
    '/dashboards/student-placement',
    '/dashboards/student-virtual-internships',
  ],
  // Mentor routes (replaces alumni)
  mentor: [
    '/dashboards/mentor-dashboard',
    '/dashboards/mentor-add-event',
    '/dashboards/mentor-manage-events',
    '/dashboards/mentor-edit-event',
    '/dashboards/mentor-add-workshop',
    '/dashboards/mentor-manage-workshops',
    '/dashboards/mentor-edit-workshop',
    '/dashboards/mentor-add-job',
    '/dashboards/mentor-manage-jobs',
    '/dashboards/mentor-edit-job',
    '/dashboards/mentor-classroom',
    '/dashboards/mentor-profile',
    '/dashboards/mentor-settings',
  ],
  // Parent routes (organization-scoped)
  parent: [
    '/dashboards/parent-dashboard',
    '/dashboards/parent-profile',
    '/dashboards/parent-student-progress',
    '/dashboards/parent-activity-tracker',
    '/dashboards/parent-achievements',
    '/dashboards/parent-settings',
  ],
  // Brand routes (global, no org context)
  brand: [
    '/dashboards/brand-dashboard',
    '/dashboards/brand-profile',
    '/dashboards/brand-events',
    '/dashboards/brand-certificates',
    '/dashboards/brand-settings',
  ],
  // Company routes (organization-scoped, like vendor)
  company: [
    '/dashboards/company-dashboard',
    '/dashboards/company-profile',
    '/dashboards/company-settings',
    '/dashboards/company-virtual-internships',
    '/dashboards/company-jobs',
    '/dashboards/company-applications',
    '/dashboards/company-challenges',
    '/dashboards/company-events',
    '/dashboards/company-analytics',
    '/dashboards/company-talent-pool',
  ],
};

/**
 * Check if route requires authentication
 */
function isProtectedRoute(pathname) {
  // Check all protected route patterns
  const allProtectedRoutes = [
    ...protectedRoutes.superadmin,
    ...protectedRoutes.admin,
    ...protectedRoutes.vendor,
    ...protectedRoutes.instructor,
    ...protectedRoutes.student,
    ...protectedRoutes.mentor,
    ...protectedRoutes.parent,
    ...protectedRoutes.brand,
    ...protectedRoutes.company,
  ];

  // Use exact match or startsWith for dashboard routes
  return allProtectedRoutes.some(route => {
    // Exact match for dashboard routes
    if (pathname === route) {
      return true;
    }
    // Also check if pathname starts with route (for nested routes)
    return pathname.startsWith(route + '/');
  });
}

/**
 * Check if route requires specific role
 * Uses centralized role utilities
 */
function getRequiredRole(pathname) {
  return getRequiredRoleForPath(pathname);
}

/**
 * Check if user has required role
 * Uses centralized role utilities
 */
function hasRequiredRole(userRole, requiredRole, pathname = null) {
  return canAccessRole(userRole, requiredRole, pathname);
}

/**
 * Middleware function
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl;
  // Remove query parameters and hash for route matching
  const cleanPathname = pathname.split('?')[0].split('#')[0];
  
  // console.log('🛡️ [MIDDLEWARE] ===== MIDDLEWARE CHECK =====');
  // console.log('🛡️ [MIDDLEWARE] Pathname:', cleanPathname);
  // console.log('🛡️ [MIDDLEWARE] Method:', request.method);

  // ─── TENANT RESOLUTION ────────────────────────────────────────────────────
  // Always resolve domain → tenant on every request. No feature flag gate.
  //
  // Previously gated by ENABLE_TENANT_RESOLUTION=true, which meant disabling
  // the flag in production also silently disabled all cross-tenant session
  // validation — a critical isolation gap (Phase 1 fix 1C).
  //
  // localhost is detected as control plane by isControlPlaneHost(), so local
  // development without a hosts-file override is unaffected.
  const baseDomain = process.env.NEXTAUTH_BASE_DOMAIN ?? 'edurock.com';

  let resolvedOrgId = null;    // null = control plane
  let isControlPlane = true;   // default: treat as control plane until resolved
  // tenantResult carries revocationVersion for the org_rv staleness check.
  let tenantResult   = null;

  const hostname = extractHostname(request);

if (!hostname) {
  return NextResponse.redirect(
    new URL(
      `${getAdminBaseUrl(request, baseDomain)}/unknown-tenant`
    )
  );
}

  isControlPlane = isControlPlaneHost(hostname, baseDomain);

  if (!isControlPlane) {
    tenantResult = await resolveTenant(hostname, request.url);

if (tenantResult.error === 'NOT_FOUND') {
  return NextResponse.redirect(
    new URL(
      `${getAdminBaseUrl(request, baseDomain)}/unknown-tenant`
    )
  );
}
    if (tenantResult.error === 'SUSPENDED') {
      return NextResponse.redirect(
        new URL(
  `${getAdminBaseUrl(request, baseDomain)}/suspended`
)
      );
    }
    if (tenantResult.error === 'DELETED') {
      return NextResponse.redirect(
        new URL(
  `${getAdminBaseUrl(request, baseDomain)}/deleted-tenant`
)
      );
    }

    resolvedOrgId = tenantResult.orgId;
  }

  // Build request headers enriched with tenant context.
  // These are consumed by API routes and server components via:
  //   request.headers.get('x-tenant-org-id')
  //   request.headers.get('x-tenant-mode')
  const enrichedHeaders = new Headers(request.headers);
  enrichedHeaders.set('x-tenant-org-id', resolvedOrgId ?? '');
  enrichedHeaders.set('x-tenant-mode', isControlPlane ? 'control_plane' : 'tenant');
  // ──────────────────────────────────────────────────────────────────────────

  // Define public routes (exact matches or specific patterns)
  const publicRoutes = [
    '/',
    '/login',
    '/login-dark',
    '/api/auth',
    '/_next',
    '/favicon.ico',
    '/icon.ico',
    '/.well-known',
    '/unknown-tenant',
    '/suspended',
    '/deleted-tenant',
    '/forbidden',
    '/mfa',
  ];

  // Check if route is public (must match exactly or start with public route)
  const isPublicRoute = publicRoutes.some(route => {
    if (route === '/') {
      return cleanPathname === '/';
    }
    return cleanPathname.startsWith(route);
  });
  
      // If login page, check if user is already authenticated and redirect them
      if (cleanPathname === '/login' || cleanPathname === '/login-dark') {
        try {
          const session = await auth();
          if (session && session.user) {
            const dashboardPath = getDashboardPath(session.user.role);
            const redirect = NextResponse.redirect(new URL(dashboardPath, request.url));
            return addSecurityHeaders(redirect, cleanPathname);
          }
        } catch {
          // Session check failed — allow login page access
        }
      }

  // If public route, skip authentication check
  if (isPublicRoute) {
    const response = NextResponse.next({ request: { headers: enrichedHeaders } });
    return addSecurityHeaders(response, cleanPathname);
  }

  // Check if route is protected (must check BEFORE allowing access)
  const isProtected = isProtectedRoute(cleanPathname);

  if (!isProtected) {
    const response = NextResponse.next({ request: { headers: enrichedHeaders } });
    return addSecurityHeaders(response, cleanPathname);
  }
  
  // Route is protected - must check authentication
  // console.log('🛡️ [MIDDLEWARE] 🔒 Protected route detected:', cleanPathname);

  try {
    // Get session using NextAuth v5 auth() function
    // console.log('🛡️ [MIDDLEWARE] Getting NextAuth session...');
    const session = await auth();
    // console.log('🛡️ [MIDDLEWARE] Session:', session ? {
    //   userId: session.user?.id,
    //   email: session.user?.email,
    //   role: session.user?.role,
    //   isActive: session.user?.isActive,
    //   mfaEnabled: session.user?.mfaEnabled,
    //   mfaVerified: session.user?.mfaVerified
    // } : 'Not found');

    // If no session, redirect to login.
    // When a refresh-token cookie is present the client can silently renew
    // the session — do NOT attach ?error= in that case so the login page
    // won't flash an error message and won't treat it as a hard failure.
    if (!session || !session.user) {
      const refreshToken = request.cookies.get('refresh-token')?.value;
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', cleanPathname);
      if (!refreshToken) {
        // No refresh token either — definitive session expiry.
        loginUrl.searchParams.set('error', 'Session expired. Please login again.');
      }
      // If refresh token IS present we redirect without ?error so the client's
      // token-refresh flow runs quietly and returns the user to callbackUrl.
      const redirect = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(redirect, cleanPathname);
    }

    // ─── CROSS-TENANT SESSION VALIDATION ──────────────────────────────────
    // If we resolved a specific tenant domain the logged-in user MUST belong
    // to that org. Prevents a user from org-A accessing org-B's subdomain.
    // Always active (not gated by a feature flag — Phase 1 fix 1C).
    if (!isControlPlane && resolvedOrgId) {
      const sessionOrgId = session.user?.orgId ?? null;
      const userRole     = session.user?.role   ?? '';
      const userId       = session.user?.id     ?? null;

      // Superadmin/brand are control-plane-only roles — block on tenant domains
      if (userRole === 'superadmin' || userRole === 'brand') {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'Superadmin and brand users must log in via admin.edurock.com');
        return NextResponse.redirect(loginUrl);
      }

      // Vendor: org membership lives in vendor_organizations, not users.org_id.
      // Verify via internal API rather than skipping the check entirely (Phase 1 fix 1A).
      if (userRole === 'vendor') {
        if (!userId || !(await checkVendorAccess(userId, resolvedOrgId, request.url))) {
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('error', 'You do not have access to this organization');
          return NextResponse.redirect(loginUrl);
        }
      } else if (sessionOrgId && sessionOrgId !== resolvedOrgId) {
        // All other org-scoped roles: session org must match the resolved domain org
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'You do not belong to this organization');
        return NextResponse.redirect(loginUrl);
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    // ─── REVOCATION VERSION CHECK ──────────────────────────────────────────
    // If the org's revocation_version was incremented (e.g. org suspended,
    // user removed from org, role changed) the cached tenant result carries
    // the new version. Any JWT minted before that increment has a lower
    // org_rv and must be rejected so the user re-authenticates.
    //
    // Control-plane sessions (isControlPlane=true) have no resolvedOrgId and
    // are checked separately during the hourly JWT DB refresh in config.js.
    if (!isControlPlane && resolvedOrgId && tenantResult) {
const cachedOrgRvRaw = Number(tenantResult.revocationVersion ?? 0);
const tokenOrgRvRaw = Number(session.user?.org_rv ?? 0);

const cachedOrgRv = Number.isFinite(cachedOrgRvRaw) ? cachedOrgRvRaw : 0;
const tokenOrgRv = Number.isFinite(tokenOrgRvRaw) ? tokenOrgRvRaw : 0;

      if (cachedOrgRv > 0 && tokenOrgRv < cachedOrgRv) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'Your session has been invalidated. Please log in again.');
        loginUrl.searchParams.set('callbackUrl', cleanPathname);
        return addSecurityHeaders(NextResponse.redirect(loginUrl), cleanPathname);
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    // Check if user is active
    if (!session.user.isActive) {
      // console.log('🛡️ [MIDDLEWARE] ❌ User account is inactive');
      
      // STRICT SECURITY: For superadmin routes, always enforce active account
      if (cleanPathname.startsWith('/dashboards/superadmin-')) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'Account is inactive');
        const redirect = NextResponse.redirect(loginUrl);
        return addSecurityHeaders(redirect, cleanPathname);
      }
      
      // For other routes
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'Account is inactive');
      const redirect = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(redirect, cleanPathname);
    }

    // Get required role for this route
    const requiredRole = getRequiredRole(cleanPathname);
    // console.log('🛡️ [MIDDLEWARE] Required role:', requiredRole);
    // console.log('🛡️ [MIDDLEWARE] User role:', session.user.role);

    // If route is protected but no required role found, deny access for security
    // This prevents unauthorized access to routes that should have role restrictions
    if (!requiredRole && isProtected) {
      console.warn('🛡️ [MIDDLEWARE] ⚠️ Protected route without required role:', cleanPathname);
      const redirect = NextResponse.redirect(new URL('/forbidden?error=Route access not configured', request.url));
      return addSecurityHeaders(redirect, cleanPathname);
    }

    if (requiredRole) {
      // Check if user has required role (pass pathname for route-specific logic)
      const hasAccess = hasRequiredRole(session.user.role, requiredRole, cleanPathname);
      
      if (!hasAccess) {
        // console.log('🛡️ [MIDDLEWARE] ❌ User does not have required role');
        // console.log('🛡️ [MIDDLEWARE] Required:', requiredRole, 'User role:', session.user.role);
        
        // STRICT SECURITY: For superadmin routes, always enforce role check
        if (requiredRole === 'superadmin') {
          const redirect = NextResponse.redirect(new URL('/forbidden?error=Superadmin access required', request.url));
          return addSecurityHeaders(redirect, cleanPathname);
        }
        
        // STRICT SECURITY: If superadmin tries to access other non-shared dashboards, block them
        // Allow access to shared routes: announcements and organization-finance
        const isSharedRoute = cleanPathname.startsWith('/dashboards/announcements') || 
                             cleanPathname.startsWith('/dashboards/organization-finance');
        if (session.user.role === 'superadmin' && requiredRole !== 'superadmin' && !isSharedRoute) {
          // console.log('🛡️ [MIDDLEWARE] ❌ Superadmin cannot access non-superadmin dashboards');
          const redirect = NextResponse.redirect(new URL('/forbidden?error=Superadmin can only access superadmin dashboard', request.url));
          return addSecurityHeaders(redirect, cleanPathname);
        }
        
        // STRICT SECURITY: If brand tries to access non-brand dashboards, block them
        if (session.user.role === 'brand' && requiredRole !== 'brand') {
          // console.log('🛡️ [MIDDLEWARE] ❌ Brand cannot access non-brand dashboards');
          const redirect = NextResponse.redirect(new URL('/forbidden?error=Brand can only access brand dashboard', request.url));
          return addSecurityHeaders(redirect, cleanPathname);
        }
        
        // STRICT SECURITY: If company tries to access non-company dashboards, block them
        if (session.user.role === 'company' && requiredRole !== 'company') {
          // console.log('🛡️ [MIDDLEWARE] ❌ Company cannot access non-company dashboards');
          const redirect = NextResponse.redirect(new URL('/forbidden?error=Company can only access company dashboard', request.url));
          return addSecurityHeaders(redirect, cleanPathname);
        }
        
        // For other routes
        const redirect = NextResponse.redirect(new URL('/forbidden', request.url));
        return addSecurityHeaders(redirect, cleanPathname);
      }
      
      // console.log('🛡️ [MIDDLEWARE] ✅ User has required role');

      // FIX: Check orgId requirement - validate org context based on role
      // Superadmin: Can have null orgId (global user)
      // Brand: Must have null orgId (global user, no org context)
      // Vendor: Gets organizations from vendor_organizations table, not from orgId
      // Parent: Must have orgId (organization-scoped)
      // All other roles: Must have orgId (organization-scoped)
      const isSuperadmin = requiredRole === 'superadmin' || session.user.role === 'superadmin';
      const isBrand = requiredRole === 'brand' || session.user.role === 'brand';
      const isCompany = requiredRole === 'company' || session.user.role === 'company';
      const isVendor = requiredRole === 'vendor' || session.user.role === 'vendor';
      const isParent = requiredRole === 'parent' || session.user.role === 'parent';
      const userOrgId = session.user.orgId; // Use only orgId, not org_id
      
      // Brand must have null orgId (global access, no org context)
      if (isBrand) {
        if (userOrgId !== null && userOrgId !== undefined) {
          // console.log('🛡️ [MIDDLEWARE] ❌ Brand user must have null orgId (global access)');
          const redirect = NextResponse.redirect(
            new URL('/forbidden?error=Brand users must have global access (no organization context).', request.url)
          );
          return addSecurityHeaders(redirect, cleanPathname);
        }
        // console.log('🛡️ [MIDDLEWARE] ✅ Brand access (global, no org context)');
      }
      // Company must have orgId (organization-scoped, like vendor)
      else if (isCompany) {
        if (!userOrgId || userOrgId === null) {
          // console.log('🛡️ [MIDDLEWARE] ❌ Company user must have orgId (organization-scoped)');
          const redirect = NextResponse.redirect(
            new URL('/forbidden?error=Company users must have organization context. Please contact your administrator.', request.url)
          );
          return addSecurityHeaders(redirect, cleanPathname);
        }
        // console.log('🛡️ [MIDDLEWARE] ✅ Company access (organization-scoped)');
      }
      // Superadmin can have null orgId - this is valid (global user)
      else if (isSuperadmin) {
        // Superadmin can have null orgId - this is valid (global user)
        // console.log('🛡️ [MIDDLEWARE] ✅ Superadmin access (orgId can be null for global user)');
      }
      // Vendor gets organizations from vendor_organizations table, not from orgId
      else if (isVendor) {
        // Vendors get organizations from vendor_organizations table, not from orgId
        // console.log('🛡️ [MIDDLEWARE] ✅ Vendor access (organizations from vendor_organizations table)');
      }
      // Parent and all other roles must have orgId (organization-scoped)
      else {
        if (!userOrgId || userOrgId === null) {
          // console.log('🛡️ [MIDDLEWARE] ❌ User does not have orgId required for this role');
          // console.log('🛡️ [MIDDLEWARE] User role:', session.user.role, 'Required role:', requiredRole, 'orgId:', userOrgId);
          
          // Forbidden: organization-scoped roles without orgId cannot access their dashboards
          const errorMessage = isParent 
            ? 'Parent access requires organization context. Please contact your administrator.'
            : 'Organization access required. Please contact your administrator.';
          const redirect = NextResponse.redirect(
            new URL(`/forbidden?error=${encodeURIComponent(errorMessage)}`, request.url)
          );
          return addSecurityHeaders(redirect, cleanPathname);
        }
        // console.log('🛡️ [MIDDLEWARE] ✅ User has required orgId:', userOrgId);
      }

      // Check MFA verification for roles that require MFA (Superadmin and Admin)
      if (requiresMfa(requiredRole)) {
        // console.log(`🛡️ [MIDDLEWARE] Checking MFA verification for ${requiredRole}...`);
        // Check if MFA is enabled
        if (session.user.mfaEnabled && !session.user.mfaVerified) {
          // console.log('🛡️ [MIDDLEWARE] ⚠️ MFA enabled but not verified, redirecting to MFA');
          
          // STRICT SECURITY: Always enforce MFA for roles that require it
          const mfaUrl = new URL('/mfa', request.url);
          mfaUrl.searchParams.set('mode', 'verify');
          mfaUrl.searchParams.set('email', session.user.email);
          mfaUrl.searchParams.set('redirect', cleanPathname);
          mfaUrl.searchParams.set('error', `MFA verification required for ${requiredRole} access`);
          const redirect = NextResponse.redirect(mfaUrl);
          return addSecurityHeaders(redirect, cleanPathname);
        }
        // console.log('🛡️ [MIDDLEWARE] ✅ MFA check passed');
      }
    }

    // Note: Last activity update is handled in API routes, not in middleware
    // This avoids importing database code in Edge Runtime

    // All checks passed — build the single response with tenant-enriched headers.
    // Security headers are applied exactly once here (Gap 1: response object safety).
    const response = NextResponse.next({ request: { headers: enrichedHeaders } });
    return addSecurityHeaders(response, cleanPathname);
  } catch (error) {
    console.error('🛡️ [MIDDLEWARE] ❌ ===== MIDDLEWARE ERROR =====');
    console.error('🛡️ [MIDDLEWARE] ❌ Error message:', error.message);
    console.error('🛡️ [MIDDLEWARE] ❌ Error stack:', error.stack);
    
    // STRICT SECURITY: For superadmin routes, always redirect on error
    if (cleanPathname.startsWith('/dashboards/superadmin-')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'Authentication error');
      loginUrl.searchParams.set('callbackUrl', cleanPathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // For other routes, redirect to login on error
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'Authentication error');
    return NextResponse.redirect(loginUrl);
  }
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth               (NextAuth.js routes)
     * - api/tenant-resolve     (internal tenant DB lookup called BY middleware — must
     *                           be excluded to prevent an infinite fetch loop)
     * - api/tenant-vendor-check (internal vendor ↔ org membership check called BY
     *                           middleware — excluded for the same reason)
     * - _next/static           (static files)
     * - _next/image            (image optimization files)
     * - favicon.ico            (favicon file)
     */
    '/((?!api/auth|api/tenant-resolve|api/tenant-vendor-check|_next/static|_next/image|favicon.ico).*)',
  ],
};

