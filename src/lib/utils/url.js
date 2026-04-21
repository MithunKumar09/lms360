/**
 * URL Utility Functions
 * 
 * Centralized URL helpers to avoid hardcoded localhost URLs
 * Ensures production URLs are used correctly
 */

/**
 * Get the base URL for the application
 * 
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL (client-accessible)
 * 2. NEXTAUTH_URL (server-side)
 * 3. VERCEL_URL (Vercel automatic)
 * 4. Request URL origin (fallback)
 * 
 * @param {Request} request - Optional Next.js request object
 * @returns {string} Base URL (e.g., https://edurock-next-seven.vercel.app)
 */
export function getBaseUrl(request = null) {
  // Client-side: use NEXT_PUBLIC_APP_URL or window.location
  if (typeof window !== 'undefined') {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    return window.location.origin;
  }

  // Server-side: check environment variables
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  // Vercel automatically provides VERCEL_URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fallback: use request URL if available
  if (request) {
    try {
      const url = new URL(request.url);
      return url.origin;
    } catch (error) {
      console.warn('Failed to parse request URL:', error);
    }
  }

  // Last resort: throw error in production, warn in development
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Base URL not configured. Please set NEXT_PUBLIC_APP_URL or NEXTAUTH_URL environment variable.'
    );
  }

  // Development fallback (only in dev mode)
  console.warn(
    '⚠️  Base URL not configured. Using localhost fallback. Set NEXT_PUBLIC_APP_URL or NEXTAUTH_URL in production.'
  );
  return 'http://localhost:3000';
}

/**
 * Get the base URL for API routes
 * 
 * @param {Request} request - Optional Next.js request object
 * @returns {string} API base URL
 */
export function getApiBaseUrl(request = null) {
  const baseUrl = getBaseUrl(request);
  return `${baseUrl}/api`;
}

/**
 * Build a full URL from a path
 * 
 * @param {string} path - Path to append (e.g., '/login', '/dashboards/admin-dashboard')
 * @param {Request} request - Optional Next.js request object
 * @returns {string} Full URL
 */
export function buildUrl(path, request = null) {
  const baseUrl = getBaseUrl(request);
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
