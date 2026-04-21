/**
 * Global Error Handler Component
 * 
 * Client component that sets up global error handlers on mount.
 */

'use client';

import { useEffect } from 'react';
import { initGlobalErrorHandlers } from '@/lib/errors/globalErrorHandler.js';

/**
 * Global Error Handler Component
 * 
 * Sets up global error handlers when mounted.
 */
const GlobalErrorHandler = () => {
  useEffect(() => {
    // Initialize global error handlers
    initGlobalErrorHandlers();
  }, []);

  // This component doesn't render anything
  return null;
};

export default GlobalErrorHandler;


