"use client";
import useIsSecondary from "@/hooks/useIsSecondary";
import Image from "next/image";
import React, { useState } from "react";
import logoImage from "@/assets/images/logo/logo_2.png";
import Link from "next/link";
import useAuthStore from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

const FooterTopLeft = () => {
  const { isSecondary } = useIsSecondary();
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
  const useDefaultLogo = !isAuthenticated || !orgId;
  const showPlaceholder = isAuthenticated && orgId && !orgLogoUrl;

  return (
    <div data-aos="fade-up">
      {isSecondary ? (
        <Link href="/">
          {useDefaultLogo ? (
            <Image src={logoImage} alt="" />
          ) : showPlaceholder ? (
            <div className="flex items-center justify-center text-whiteColor text-sm min-h-[40px]">
              Logo
            </div>
          ) : (
            <>
              <img 
                src={orgLogoUrl} 
                alt="logo" 
                className="object-contain max-h-[60px]"
                onError={() => {
                  setImageError(true);
                }}
              />
              {imageError && (
                <div className="flex items-center justify-center text-whiteColor text-sm min-h-[40px]">
                  Logo
                </div>
              )}
            </>
          )}
        </Link>
      ) : (
        <>
          <h4 className="text-4xl md:text-size-25 lg:text-size-40 font-bold text-whiteColor leading-50px md:leading-10 lg:leading-16">
            Still You Need Our{" "}
            <span className="text-primaryColor">Support</span> ?
          </h4>
          <p className="text-whiteColor text-opacity-65">
            Don&apos;t wait make a smart & logical quote here. It&apos;s pretty easy.
          </p>
        </>
      )}
    </div>
  );
};

export default FooterTopLeft;
