"use client";

import React from "react";
import ProfileDetails from "@/components/shared/dashboards/ProfileDetails";
import { useUser } from "@/hooks/api/useUser.js";
import { useAuthStore } from "@/store/index.js";

const MentorProfileDetails = () => {
  // Fetch user data (includes organization info)
  const { data: userData, isLoading: isLoadingUser } = useUser();
  const authUser = useAuthStore((state) => state.user);
  const isMentor = authUser?.role === 'mentor';
  
  // Extract organization info from user data
  // The user profile API returns organizationName and orgId
  const organization = userData?.user?.organizationName 
    ? {
        name: userData.user.organizationName,
        displayName: userData.user.organizationName, // organizationName is already the display name
        orgId: userData.user.orgId,
      }
    : null;

  return (
    <>
      <ProfileDetails />
      
      {/* Mentor-Specific: Organization Section */}
      {isMentor && (
        <div className="mt-30px p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
          <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
            <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
              Assigned Organization
            </h3>
          </div>

          {isLoadingUser ? (
            <div className="text-center py-20px text-contentColor dark:text-contentColor-dark">
              <span>Loading organization...</span>
            </div>
          ) : organization ? (
            <div className="p-15px bg-gray-50 dark:bg-gray-800 rounded-5 border border-borderColor dark:border-borderColor-dark">
              <div className="font-semibold text-blackColor dark:text-blackColor-dark mb-8px">
                {organization.name || 'N/A'}
              </div>
              {organization.displayName && organization.displayName !== organization.name && (
                <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                  <span className="font-medium">Display Name:</span> {organization.displayName}
                </div>
              )}
              {organization.orgId && (
                <div className="text-xs text-contentColor dark:text-contentColor-dark mt-5px">
                  <span className="font-medium">Organization ID:</span> {organization.orgId}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20px text-contentColor dark:text-contentColor-dark">
              <p className="text-base">No organization assigned.</p>
              <p className="text-sm mt-5px text-contentColor dark:text-contentColor-dark opacity-75">
                Contact your administrator to get assigned to an organization.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default MentorProfileDetails;

