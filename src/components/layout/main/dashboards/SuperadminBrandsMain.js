"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import Swal from "sweetalert2";
import AdvancedPagination from "@/components/shared/courses/AdvancedPagination";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import BrandDetailsModal from "@/components/shared/modals/BrandDetailsModal";
import { FiEye } from "react-icons/fi";
import { format } from "date-fns";

export default function SuperadminBrandsMain() {
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Fetch brands
  const { data, isLoading, error } = useQuery({
    queryKey: ['superadminBrands', page, limit, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (status) params.append('status', status);

      const response = await apiClient.get(`/superadmin/brands?${params}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch brands');
      }
      return response.data;
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (profileId) => {
      const response = await apiClient.patch(`/superadmin/brands/${profileId}/approve`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to approve brand');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadminBrands'] });
      createAlert('success', 'Brand approved successfully!');
    },
    onError: (error) => {
      console.error('Approve brand error:', error);
      createAlert('error', error.message || 'Failed to approve brand');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ profileId, rejectionReason }) => {
      const response = await apiClient.patch(`/superadmin/brands/${profileId}/reject`, {
        rejection_reason: rejectionReason,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to reject brand');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadminBrands'] });
      createAlert('success', 'Brand rejected successfully!');
    },
    onError: (error) => {
      console.error('Reject brand error:', error);
      createAlert('error', error.message || 'Failed to reject brand');
    },
  });

  const brands = data?.brands || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleApprove = async (profileId, brandName) => {
    const result = await Swal.fire({
      title: 'Approve Brand',
      text: `Are you sure you want to approve "${brandName || 'this brand'}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Approve',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
    });

    if (result.isConfirmed) {
      try {
        await approveMutation.mutateAsync(profileId);
      } catch (error) {
        // Error is handled by mutation's onError
      }
    }
  };

  const handleReject = async (profileId, brandName) => {
    const { value: rejectionReason } = await Swal.fire({
      title: 'Reject Brand',
      text: `Please provide a reason for rejecting "${brandName || 'this brand'}":`,
      input: 'textarea',
      inputPlaceholder: 'Enter rejection reason...',
      inputAttributes: {
        'aria-label': 'Rejection reason'
      },
      showCancelButton: true,
      confirmButtonText: 'Reject Brand',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Rejection reason is required';
        }
        if (value.trim().length < 10) {
          return 'Please provide a more detailed reason (at least 10 characters)';
        }
        return null;
      }
    });

    if (rejectionReason) {
      try {
        await rejectMutation.mutateAsync({ profileId, rejectionReason: rejectionReason.trim() });
      } catch (error) {
        // Error is handled by mutation's onError
      }
    }
  };

  const handleViewDetails = (brandId) => {
    setSelectedBrandId(brandId);
    setIsDetailsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedBrandId(null);
  };

  const statusOptions = [
    { id: "all", label: "All Status", value: "" },
    { id: "pending", label: "Pending", value: "pending" },
    { id: "approved", label: "Approved", value: "approved" },
    { id: "rejected", label: "Rejected", value: "rejected" },
  ];

  if (isLoading) {
    return (
      <div>
        <HeadingDashboard>Brand Management</HeadingDashboard>
        <SkeletonLoader count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <HeadingDashboard>Brand Management</HeadingDashboard>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-5 p-20px mt-30px">
          <p className="text-red-600 dark:text-red-400">
            {error?.message || "Failed to load brands"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <HeadingDashboard>Brand Management</HeadingDashboard>
          
          {/* Filters */}
          <div className="mt-4">
            <AdvancedDropdown
              options={statusOptions}
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              placeholder="Filter by status"
            />
          </div>
        </div>

        {/* Brands Table */}
        {brands.length === 0 ? (
          <NoData message="No brands found." />
        ) : (
          <>
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-borderColor dark:border-borderColor-dark">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Brand Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">User</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Created At</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((brand) => {
                    const getStatusBadge = (status) => {
                      const statusConfig = {
                        pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-400', label: 'Pending' },
                        approved: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-400', label: 'Approved' },
                        rejected: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-400', label: 'Rejected' },
                      };
                      const config = statusConfig[status] || statusConfig.pending;
                      return (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      );
                    };

                    return (
                      <tr key={brand.id} className="border-b border-borderColor dark:border-borderColor-dark hover:bg-lightGrey5 dark:hover:bg-gray-800 transition-colors">
                        <td className="py-3 px-4 text-sm text-contentColor dark:text-contentColor-dark">
                          {brand.brand_name || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-contentColor dark:text-contentColor-dark">
                          {brand.user_name || brand.user_email || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(brand.approval_status)}
                            {brand.approval_status === 'rejected' && brand.rejection_reason && (
                              <span
                                className="group relative cursor-help"
                                title={brand.rejection_reason}
                              >
                                <i className="icofont-info-circle text-red-500 dark:text-red-400 text-sm"></i>
                                <span className="absolute left-0 top-full mt-2 w-64 p-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                  <strong>Rejection Reason:</strong> {brand.rejection_reason}
                                </span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-contentColor dark:text-contentColor-dark">
                          {brand.created_at ? format(new Date(brand.created_at), 'PPP') : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 items-center">
                            {/* View Details - Always available */}
                            <button
                              onClick={() => handleViewDetails(brand.id)}
                              className="p-2 text-contentColor dark:text-contentColor-dark hover:text-primaryColor hover:bg-primaryColor/10 dark:hover:bg-primaryColor/20 rounded-md transition-colors"
                              title="View Details"
                            >
                              <FiEye size={18} />
                            </button>

                            {/* Actions based on status */}
                            {brand.approval_status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(brand.id, brand.brand_name)}
                                  disabled={approveMutation.isPending}
                                  className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-50 rounded-md hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {approveMutation.isPending ? 'Approving...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleReject(brand.id, brand.brand_name)}
                                  disabled={rejectMutation.isPending}
                                  className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-50 rounded-md hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <AdvancedPagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>

      {/* Brand Details Modal */}
      {isDetailsModalOpen && selectedBrandId && (
        <BrandDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={handleCloseModal}
          brandId={selectedBrandId}
        />
      )}
    </div>
  );
}
