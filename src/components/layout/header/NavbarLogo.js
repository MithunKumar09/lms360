"use client";
import Image from "next/image";
import React, { useState } from "react";
import logo1 from "@/assets/images/logo/logo_1.png";
import Link from "next/link";
import useAuthStore from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

const NavbarLogo = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const orgId = user?.orgId;
  const [imageError, setImageError] = useState(false);

  // Fetch header logo if user is authenticated and has orgId
  const { data: logoData } = useQuery({
    queryKey: ['headerLogo', orgId],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/organizations/header-logo');
        return response;
      } catch (error) {
        console.error('Error fetching header logo:', error);
        return { success: false, logoUrl: null };
      }
    },
    enabled: isAuthenticated && !!orgId, // Only fetch if authenticated and has orgId
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  // Determine which logo to use
  const orgLogoUrl = logoData?.logoUrl || null;
  
  // Use default edurock logo if:
  // 1. Not authenticated
  // 2. User is superadmin (orgId is null)
  const useDefaultLogo = !isAuthenticated || !orgId;
  
  // If authenticated with org but logo is empty, show placeholder
  const showPlaceholder = isAuthenticated && orgId && !orgLogoUrl;

  return (
    <div className="lg:col-start-1 lg:col-span-2">
      <Link href="/" className="w-logo-sm lg:w-logo-lg ">
        {useDefaultLogo ? (
          <Image priority={false} src={logo1} alt="logo" className="w-full py-2" />
        ) : showPlaceholder ? (
          <div className="w-full py-2 flex items-center justify-center text-contentColor dark:text-contentColor-dark text-sm min-h-[40px]">
            Logo
          </div>
        ) : (
          <img 
            src={orgLogoUrl} 
            alt="logo" 
            className="w-full py-2 object-contain max-h-[60px]"
            onError={() => {
              setImageError(true);
            }}
          />
        )}
        {imageError && !useDefaultLogo && !showPlaceholder && (
          <div className="w-full py-2 flex items-center justify-center text-contentColor dark:text-contentColor-dark text-sm min-h-[40px]">
            Logo
          </div>
        )}
      </Link>
    </div>
  );
};

export default NavbarLogo;
