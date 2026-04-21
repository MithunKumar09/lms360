"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import Image from "next/image";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";

const BrandDetailsModal = ({ isOpen, onClose, brandId }) => {
  const [brand, setBrand] = useState(null);

  // Fetch brand details
  const { data, isLoading, error } = useQuery({
    queryKey: ['brand-details', brandId],
    queryFn: async () => {
      const response = await apiClient.get(`/superadmin/brands/${brandId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch brand details');
      }
      // API returns { success: true, brand: {...} }
      return response.brand;
    },
    enabled: isOpen && !!brandId,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (data) {
      setBrand(data);
    }
  }, [data]);

  if (!isOpen || !brandId) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "pending":
        return {
          icon: "icofont-clock-time",
          color: "text-yellow-600 dark:text-yellow-400",
          bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
          label: "Pending",
        };
      case "approved":
        return {
          icon: "icofont-check-circled",
          color: "text-green-600 dark:text-green-400",
          bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
          label: "Approved",
        };
      case "rejected":
        return {
          icon: "icofont-close-circled",
          color: "text-red-600 dark:text-red-400",
          bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
          label: "Rejected",
        };
      default:
        return {
          icon: "icofont-info-circle",
          color: "text-contentColor dark:text-contentColor-dark",
          bg: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
          label: status || "Unknown",
        };
    }
  };

  const statusConfig = brand ? getStatusConfig(brand.approval_status || brand.status) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4">
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-whiteColor dark:bg-whiteColor-dark border-b border-borderColor dark:border-borderColor-dark p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Brand Profile Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark"
          >
            <i className="icofont-close"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading && <SkeletonLoader count={5} />}
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-600 dark:text-red-400">
                {error?.message || "Failed to load brand details"}
              </p>
            </div>
          )}

          {brand && (
            <>
              {/* Brand Overview Section */}
              <div className="bg-gradient-to-br from-darkdeep3 to-darkdeep4 dark:from-darkdeep3-dark dark:to-darkdeep4-dark rounded-lg p-6 border-2 border-borderColor dark:border-borderColor-dark shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <i className="icofont-building text-2xl text-primaryColor"></i>
                  <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                    Brand Information
                  </h3>
                </div>
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  {brand.logo_url && (
                    <div className="relative flex-shrink-0">
                      <div className="w-32 h-32 rounded-lg overflow-hidden bg-darkdeep4 border-4 border-primaryColor/20">
                        <Image
                          src={brand.logo_url}
                          alt={brand.brand_name || "Brand Logo"}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                      {brand.approval_status === "pending" && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full border-2 border-whiteColor dark:border-whiteColor-dark flex items-center justify-center">
                          <i className="icofont-clock-time text-whiteColor text-xs"></i>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-3">
                      {brand.brand_name || "N/A"}
                    </h4>
                    <div className="space-y-2 text-sm">
                      {brand.industry && (
                        <div className="flex items-center gap-2">
                          <i className="icofont-briefcase text-contentColor dark:text-contentColor-dark"></i>
                          <span className="text-contentColor dark:text-contentColor-dark">
                            <span className="font-semibold">Industry:</span> {brand.industry}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <i className="icofont-envelope text-contentColor dark:text-contentColor-dark"></i>
                        <span className="text-contentColor dark:text-contentColor-dark">
                          <span className="font-semibold">Contact Email:</span> {brand.contact_email || brand.user_email || "N/A"}
                        </span>
                      </div>
                      {brand.user_name && (
                        <div className="flex items-center gap-2">
                          <i className="icofont-user text-contentColor dark:text-contentColor-dark"></i>
                          <span className="text-contentColor dark:text-contentColor-dark">
                            <span className="font-semibold">User:</span> {brand.user_name}
                          </span>
                        </div>
                      )}
                      {brand.website_url && (
                        <div className="flex items-center gap-2">
                          <i className="icofont-web text-contentColor dark:text-contentColor-dark"></i>
                          <span className="text-contentColor dark:text-contentColor-dark">
                            <span className="font-semibold">Website:</span>{" "}
                            <a
                              href={brand.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primaryColor hover:underline"
                            >
                              {brand.website_url}
                            </a>
                          </span>
                        </div>
                      )}
                      {brand.contact_phone && (
                        <div className="flex items-center gap-2">
                          <i className="icofont-phone text-contentColor dark:text-contentColor-dark"></i>
                          <span className="text-contentColor dark:text-contentColor-dark">
                            <span className="font-semibold">Phone:</span> {brand.contact_phone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Approval Information */}
              <div className="bg-darkdeep3 dark:bg-darkdeep3-dark rounded-lg p-6 border-2 border-borderColor dark:border-borderColor-dark shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <i className={`${statusConfig.icon} text-2xl ${statusConfig.color}`}></i>
                  <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                    Status & Approval Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-contentColor dark:text-contentColor-dark mb-1">
                      <i className={`${statusConfig.icon} ${statusConfig.color}`}></i>
                      <span className="font-semibold">Status</span>
                    </div>
                    <p className="text-base">
                      <span className={`px-3 py-1.5 rounded-full font-semibold text-sm ${statusConfig.bg}`}>
                        {statusConfig.label}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-contentColor dark:text-contentColor-dark mb-1">
                      <i className="icofont-calendar"></i>
                      <span className="font-semibold">Created At</span>
                    </div>
                    <p className="text-base font-medium text-blackColor dark:text-blackColor-dark">
                      {formatDate(brand.created_at)}
                    </p>
                  </div>
                  {brand.approved_at && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-contentColor dark:text-contentColor-dark mb-1">
                        <i className="icofont-calendar"></i>
                        <span className="font-semibold">Approved At</span>
                      </div>
                      <p className="text-base font-medium text-blackColor dark:text-blackColor-dark">
                        {formatDate(brand.approved_at)}
                      </p>
                    </div>
                  )}
                  {brand.updated_at && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-contentColor dark:text-contentColor-dark mb-1">
                        <i className="icofont-calendar"></i>
                        <span className="font-semibold">Last Updated</span>
                      </div>
                      <p className="text-base font-medium text-blackColor dark:text-blackColor-dark">
                        {formatDate(brand.updated_at)}
                      </p>
                    </div>
                  )}
                </div>
                {brand.rejection_reason && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-300 mb-2">
                      <i className="icofont-close-circled"></i>
                      <span className="font-semibold">Rejection Reason</span>
                    </div>
                    <p className="text-sm text-red-900 dark:text-red-200 leading-relaxed">
                      {brand.rejection_reason}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {brand.description && (
                <div className="bg-darkdeep3 dark:bg-darkdeep3-dark rounded-lg p-6 border-2 border-borderColor dark:border-borderColor-dark shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <i className="icofont-file-text text-2xl text-primaryColor"></i>
                    <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                      Description
                    </h3>
                  </div>
                  <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark">
                    <p className="text-sm text-blackColor dark:text-blackColor-dark whitespace-pre-wrap leading-relaxed">
                      {brand.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Mission */}
              {brand.mission && (
                <div className="bg-darkdeep3 dark:bg-darkdeep3-dark rounded-lg p-6 border-2 border-borderColor dark:border-borderColor-dark shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <i className="icofont-target text-2xl text-primaryColor"></i>
                    <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                      Mission
                    </h3>
                  </div>
                  <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark">
                    <p className="text-sm text-blackColor dark:text-blackColor-dark whitespace-pre-wrap leading-relaxed">
                      {brand.mission}
                    </p>
                  </div>
                </div>
              )}

              {/* Values */}
              {brand.values && (
                <div className="bg-darkdeep3 dark:bg-darkdeep3-dark rounded-lg p-6 border-2 border-borderColor dark:border-borderColor-dark shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <i className="icofont-diamond text-2xl text-primaryColor"></i>
                    <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                      Values
                    </h3>
                  </div>
                  <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark">
                    <p className="text-sm text-blackColor dark:text-blackColor-dark whitespace-pre-wrap leading-relaxed">
                      {brand.values}
                    </p>
                  </div>
                </div>
              )}

              {/* CSR Initiatives */}
              {brand.csr_initiatives && (
                <div className="bg-darkdeep3 dark:bg-darkdeep3-dark rounded-lg p-6 border-2 border-borderColor dark:border-borderColor-dark shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <i className="icofont-heart text-2xl text-primaryColor"></i>
                    <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                      CSR Initiatives
                    </h3>
                  </div>
                  <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark">
                    <p className="text-sm text-blackColor dark:text-blackColor-dark whitespace-pre-wrap leading-relaxed">
                      {brand.csr_initiatives}
                    </p>
                  </div>
                </div>
              )}

              {/* Focus Areas */}
              {brand.focus_areas && (
                <div className="bg-darkdeep3 dark:bg-darkdeep3-dark rounded-lg p-6 border-2 border-borderColor dark:border-borderColor-dark shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <i className="icofont-focus text-2xl text-primaryColor"></i>
                    <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                      Focus Areas
                    </h3>
                  </div>
                  <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark">
                    <p className="text-sm text-blackColor dark:text-blackColor-dark whitespace-pre-wrap leading-relaxed">
                      {brand.focus_areas}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-whiteColor dark:bg-whiteColor-dark border-t-2 border-borderColor dark:border-borderColor-dark p-6 flex items-center justify-end shadow-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-3 text-sm font-semibold bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90 transition-colors flex items-center gap-2"
          >
            <i className="icofont-check"></i>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandDetailsModal;