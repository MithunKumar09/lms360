/**
 * Providers Component
 * 
 * Wraps the app with all necessary providers.
 * Includes React Query, and any other global providers.
 */

'use client';

import ReactQueryProvider from '@/lib/react-query/provider.js';
import CartContextProvider from '@/contexts/CartContext';
import WishlistContextProvider from '@/contexts/WshlistContext';
import ThemeController from '@/components/shared/others/ThemeController';
import GlobalErrorHandler from '@/components/providers/GlobalErrorHandler.js';
import useSessionRefresh from '@/hooks/useSessionRefresh';
import { FeedbackModalProvider } from '@/components/shared/feedback';
import FeedbackModal from '@/components/shared/feedback/FeedbackModal';
import PreloaderProvider from '@/components/providers/PreloaderProvider';

/**
 * Session Refresh Provider
 * Sets up automatic token refresh
 */
const SessionRefreshProvider = ({ children }) => {
  // Enable automatic token refresh
  useSessionRefresh({
    refreshThreshold: 5 * 60 * 1000, // Refresh 5 minutes before expiry
    checkInterval: 60 * 1000, // Check every minute
    enabled: true,
  });

  return <>{children}</>;
};

/**
 * Providers Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Providers wrapper
 */
export const Providers = ({ children }) => {
  return (
    <GlobalErrorHandler>
      <ReactQueryProvider>
        <PreloaderProvider>
          <CartContextProvider>
            <WishlistContextProvider>
              <SessionRefreshProvider>
                <FeedbackModalProvider>
                  {children}
                  <FeedbackModal />
                </FeedbackModalProvider>
              </SessionRefreshProvider>
            </WishlistContextProvider>
          </CartContextProvider>
          <ThemeController />
        </PreloaderProvider>
      </ReactQueryProvider>
    </GlobalErrorHandler>
  );
};

export default Providers;

