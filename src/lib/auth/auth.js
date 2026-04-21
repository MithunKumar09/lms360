/**
 * Auth Utility Functions
 * 
 * This file exports the auth() function and other authentication utilities
 * for use in server components and API routes.
 */

/**
 * Get current session
 * Note: This is a placeholder. In NextAuth v5, use the auth() function
 * exported from the route handler or use NextAuth's built-in auth() function.
 */
export async function getSession(request) {
  try {
    // In NextAuth v5, we need to use the auth() function from the route handler
    // For middleware, we'll need to handle this differently
    // This is a simplified version - actual implementation may vary
    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(request) {
  try {
    const session = await getSession(request);
    return session?.user || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(request) {
  try {
    const session = await getSession(request);
    return !!session?.user;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user has specific role
 */
export async function hasRole(request, requiredRole) {
  try {
    const session = await getSession(request);
    if (!session?.user) {
      return false;
    }

    const userRole = session.user.role;

    // Superadmin has access to all roles
    if (userRole === 'superadmin') {
      return true;
    }

    return userRole === requiredRole;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user is superadmin
 */
export async function isSuperadmin(request) {
  return await hasRole(request, 'superadmin');
}

/**
 * Check if user is admin
 */
export async function isAdmin(request) {
  return await hasRole(request, 'admin');
}

export default {
  getSession,
  getCurrentUser,
  isAuthenticated,
  hasRole,
  isSuperadmin,
  isAdmin,
};

