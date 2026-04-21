/**
 * Superadmin Guard Component (Server-Side)
 * 
 * Strong server-side security guard for superadmin dashboard routes.
 * This component runs on the server before rendering, providing an additional
 * layer of security beyond client-side guards and middleware.
 * 
 * Features:
 * - Server-side authentication check
 * - Strict superadmin role verification (ONLY superadmin can access)
 * - MFA verification check
 * - Account active status check
 * - Redirects to forbidden page for unauthorized access
 * - Passes session to children via SuperadminSessionProvider
 */

import { redirect } from 'next/navigation';
import { requireSuperadminWithMfa } from '@/lib/auth/guards.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { SuperadminSessionProvider } from '@/contexts/SuperadminSessionContext.js';

/**
 * Superadmin Guard Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @returns {JSX.Element} Protected content or redirects
 */
const SuperadminGuard = async ({ children }) => {
  try {
    // Require superadmin role with MFA verification
    // This will throw an error if:
    // - User is not authenticated
    // - User is not superadmin
    // - MFA is enabled but not verified
    // - Account is inactive
    const session = await requireSuperadminWithMfa();
    
    // Prepare session data for client components
    // requireSuperadminWithMfa should never return null, but add safety check
    if (!session || !session.user) {
      redirect('/login?error=Session invalid&callbackUrl=' + encodeURIComponent('/dashboards/superadmin-dashboard'));
    }
    
    const sessionData = {
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        orgId: session.user.orgId,
        isActive: session.user.isActive,
        mfaEnabled: session.user.mfaEnabled,
        mfaVerified: session.user.mfaVerified,
      },
      expires: session.expires,
      authenticated: true,
    };
    
    // All security checks passed, render children with session provider
    return (
      <SuperadminSessionProvider initialSession={sessionData}>
        {children}
      </SuperadminSessionProvider>
    );
  } catch (error) {
    // Check if this is a Next.js redirect error (should not be caught)
    // NEXT_REDIRECT errors have a specific structure - re-throw them
    if (error && typeof error === 'object' && 'digest' in error && error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    
    // Determine error type and redirect appropriately
    if (error?.status === 401) {
      // Not authenticated - redirect to login
      redirect('/login?error=Authentication required&callbackUrl=' + encodeURIComponent('/dashboards/superadmin-dashboard'));
    } else if (error?.status === 403) {
      // Not authorized (wrong role or MFA not verified) - redirect to forbidden
      if (error?.mfaRequired) {
        // MFA required but not verified
        redirect('/mfa?mode=verify&error=MFA verification required');
      } else {
        // Wrong role - redirect to forbidden page
        redirect('/forbidden?error=Superadmin access required');
      }
    } else {
      // Other errors - redirect to forbidden page
      redirect('/forbidden?error=Access denied');
    }
  }
};

export default SuperadminGuard;

