"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";

/**
 * Brand Profile Status Badge Component
 * 
 * Displays the brand profile approval status with a prominent badge.
 * Used in the main brand dashboard.
 */
const BrandProfileStatusBadge = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['brandProfileStatus', userId],
    queryFn: async () => {
      const response = await apiClient.get('/brand/profile');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch profile status');
      }
      return response.data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (isLoading) {
    return (
      <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-borderColor dark:border-borderColor-dark animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
      </div>
    );
  }

  const approvalStatus = data?.profile?.approval_status || 'pending';
  const isApproved = approvalStatus === 'approved';
  const isRejected = approvalStatus === 'rejected';
  const isPending = approvalStatus === 'pending';

  const getStatusConfig = () => {
    if (isApproved) {
      return {
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        textColor: 'text-green-800 dark:text-green-400',
        icon: '✓',
        label: 'Approved',
        description: 'Your brand profile is approved and active.',
      };
    }
    if (isRejected) {
      return {
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        textColor: 'text-red-800 dark:text-red-400',
        icon: '✗',
        label: 'Rejected',
        description: data?.profile?.rejection_reason || 'Your brand profile was rejected. Please update and resubmit.',
      };
    }
    return {
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      textColor: 'text-yellow-800 dark:text-yellow-400',
      icon: '⏳',
      label: 'Pending Approval',
      description: 'Your brand profile is pending Super Admin approval.',
    };
  };

  const statusConfig = getStatusConfig();

  return (
    <div className={`p-6 rounded-lg border-2 ${statusConfig.bgColor} ${statusConfig.borderColor} shadow-accordion dark:shadow-accordion-dark`}>
      <div className="flex items-center gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-full ${statusConfig.bgColor} ${statusConfig.borderColor} border-2 flex items-center justify-center text-2xl font-bold ${statusConfig.textColor}`}>
          {statusConfig.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-semibold ${statusConfig.textColor} mb-1`}>
            Profile Status: {statusConfig.label}
          </h3>
          <p className={`text-sm ${statusConfig.textColor} opacity-80`}>
            {statusConfig.description}
          </p>
        </div>
        <div className="flex-shrink-0">
          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${statusConfig.bgColor} ${statusConfig.textColor} border-2 ${statusConfig.borderColor}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BrandProfileStatusBadge;
