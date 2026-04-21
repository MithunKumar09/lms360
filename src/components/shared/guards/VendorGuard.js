/**
 * Vendor Guard Component (Server-Side)
 * 
 * Server-side security guard for vendor dashboard routes.
 */

import { redirect } from 'next/navigation';
import { requireVendor } from '@/lib/auth/guards.js';

const VendorGuard = async ({ children }) => {
  try {
    await requireVendor();
    return <>{children}</>;
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error && error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    
    if (error?.status === 401) {
      redirect('/login?error=Authentication required&callbackUrl=' + encodeURIComponent('/dashboards/vendor-dashboard'));
    } else if (error?.status === 403) {
      redirect('/forbidden?error=Vendor access required');
    } else {
      redirect('/forbidden?error=Access denied');
    }
  }
};

export default VendorGuard;

