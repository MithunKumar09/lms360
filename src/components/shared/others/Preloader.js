"use client";

import Image from "next/image";
import spinnerImage from "@/assets/images/pre.png";
import { useSession } from "@/hooks/api/useAuth.js";
import { useAuthStore } from "@/store/index.js";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useState } from "react";

/**
 * Preloader Component
 * 
 * Global preloader with automatic session checking and organization logo support.
 * - Checks session automatically using useSession hook
 * - Fetches organization loading mark logo if session exists and orgId is present
 * - Falls back to default pre.png logo if:
 *   - No session exists
 *   - orgId is null (superadmin)
 *   - Logo fetch fails
 */
const Preloader = () => {
  const { data: sessionData, isLoading: sessionLoading } = useSession();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [imageError, setImageError] = useState(false);

  // Get orgId from user or sessionData (in case store hasn't updated yet)
  const orgId = user?.orgId || sessionData?.user?.orgId;
  
  // Check if authenticated - use sessionData if store not ready yet
  const isAuth = isAuthenticated || (sessionData?.authenticated && sessionData?.user);
  
  // Check if we have orgId from either source
  const hasOrgIdFromSession = !!sessionData?.user?.orgId;
  const hasOrgIdFromStore = !!user?.orgId;
  const definitelyHasOrgId = hasOrgIdFromSession || hasOrgIdFromStore;

  // Fetch loading mark if user is authenticated and has orgId
  // Wait for session to load first, then check if we have orgId
  const shouldFetchLogo = !sessionLoading && isAuth && definitelyHasOrgId;
  
  const { data: logoData, isLoading: logoLoading } = useQuery({
    queryKey: ['loadingMark', orgId],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/organizations/loading-mark');
        return response;
      } catch (error) {
        console.error('Error fetching loading mark:', error);
        return { success: false, logoUrl: null };
      }
    },
    enabled: shouldFetchLogo, // Fetch if session loaded, authenticated, and has orgId
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  // Determine which logo to use
  const orgLogoUrl = logoData?.logoUrl || null;
  
  // Use default Edurock logo if:
  // 1. Session loaded AND not authenticated
  // 2. Session loaded AND user is superadmin (orgId is null)
  const useDefaultLogo = !sessionLoading && (!isAuth || !definitelyHasOrgId);
  
  // Show org logo if:
  // - We have orgId (from store or session)
  // - Logo fetch completed (not loading)
  // - Logo URL exists
  const showOrgLogo = definitelyHasOrgId && !logoLoading && !!orgLogoUrl;

  return (
    <div className="preloader flex h-screen w-full items-center justify-center bg-whiteColor transition-all duration-700">
      {/* Spinner ring */}
      <div className="w-90px h-90px border-5px border-t-blue border-r-blue border-b-blue-light border-l-blue-light rounded-full animate-spin-infinit"></div>
      
      {/* Logo in center */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2">
        {useDefaultLogo ? (
          // Default Edurock logo - for not authenticated or superadmin
          <Image
            src={spinnerImage}
            alt="Preloader"
            className="h-10 w-10 block"
            placeholder="blur"
            priority
          />
        ) : showOrgLogo ? (
          // Organization logo - show when orgId exists and logo is available
          <>
            <div className="relative h-10 w-10">
              <Image
                src={orgLogoUrl}
                alt="Loading"
                fill
                className="object-contain"
                unoptimized
                onError={() => {
                  setImageError(true);
                }}
              />
            </div>
            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center text-primaryColor text-xs font-semibold bg-whiteColor">
                <Image
                  src={spinnerImage}
                  alt="Preloader"
                  className="h-10 w-10 block"
                  placeholder="blur"
                />
              </div>
            )}
          </>
        ) : (
          // Placeholder - when orgId exists but logo is empty or still loading
          <div className="h-10 w-10 flex items-center justify-center">
            {logoLoading ? (
              <div className="w-8 h-8 border-2 border-primaryColor/30 border-t-primaryColor rounded-full animate-spin-infinit"></div>
            ) : (
              <Image
                src={spinnerImage}
                alt="Preloader"
                className="h-10 w-10 block"
                placeholder="blur"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Preloader;
