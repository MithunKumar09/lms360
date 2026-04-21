"use client";

import React from "react";
import ProfileDetails from "@/components/shared/dashboards/ProfileDetails";
import { useVendorOrganizations } from "@/hooks/api/useVendorOrganizations";
import { useAuthStore } from "@/store/index.js";

const VendorProfileDetails = () => {
  // Fetch vendor organizations
  const { data: organizationsData, isLoading: isLoadingOrgs } = useVendorOrganizations();
  const organizations = organizationsData?.organizations || [];
  const authUser = useAuthStore((state) => state.user);
  const isVendor = authUser?.role === 'vendor';

  return (
    <>
      <ProfileDetails />
      
      {/* Vendor-Specific: Organizations Section */}
      {isVendor && (
        <div className="mt-30px p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
          <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
            <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
              Assigned Organizations
            </h3>
          </div>

          {isLoadingOrgs ? (
            <div className="text-center py-20px text-contentColor dark:text-contentColor-dark">
              <span>Loading organizations...</span>
            </div>
          ) : organizations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-15px">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="p-15px bg-gray-50 dark:bg-gray-800 rounded-5 border border-borderColor dark:border-borderColor-dark hover:shadow-md transition-shadow"
                >
                  <div className="font-semibold text-blackColor dark:text-blackColor-dark mb-8px">
                    {org.name || 'N/A'}
                  </div>
                  {org.display_name && org.display_name !== org.name && (
                    <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                      <span className="font-medium">Display Name:</span> {org.display_name}
                    </div>
                  )}
                  {org.org_code && (
                    <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                      <span className="font-medium">Code:</span> {org.org_code}
                    </div>
                  )}
                  {org.org_type && (
                    <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                      <span className="font-medium">Type:</span> {org.org_type}
                    </div>
                  )}
                  {org.status && (
                    <div className="text-xs mt-5px">
                      <span className={`inline-block px-2 py-1 rounded ${
                        org.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {org.status}
                      </span>
                    </div>
                  )}
                  {org.assigned_at && (
                    <div className="text-xs text-contentColor dark:text-contentColor-dark mt-5px">
                      <span className="font-medium">Assigned:</span> {new Date(org.assigned_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20px text-contentColor dark:text-contentColor-dark">
              <p className="text-base">No organizations assigned.</p>
              <p className="text-sm mt-5px text-contentColor dark:text-contentColor-dark opacity-75">
                Contact your administrator to get assigned to organizations.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default VendorProfileDetails;

