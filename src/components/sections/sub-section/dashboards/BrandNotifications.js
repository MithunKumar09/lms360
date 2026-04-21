"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import { format } from "date-fns";
import { FiBell, FiCheck, FiCheckCircle, FiTrash2, FiLoader } from "react-icons/fi";
import AdvancedPagination from "@/components/shared/courses/AdvancedPagination";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";

export default function BrandNotifications() {
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', userId, page, limit, filter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (filter === 'unread') params.append('read', 'false');
      if (filter === 'read') params.append('read', 'true');

      const response = await apiClient.get(`/notifications?${params}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch notifications');
      }
      return response.data;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Poll every minute
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      const response = await apiClient.patch(`/notifications/${notificationId}/read`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark notification as read');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Mark as read error:', error);
      createAlert('error', error.message || 'Failed to mark notification as read');
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.patch('/notifications/read-all');
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark all notifications as read');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      createAlert('success', 'All notifications marked as read!');
    },
    onError: (error) => {
      console.error('Mark all as read error:', error);
      createAlert('error', error.message || 'Failed to mark all notifications as read');
    },
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unread_count || 0;
  const pagination = notificationsData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleMarkAsRead = async (notificationId) => {
    await markAsReadMutation.mutateAsync(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) {
      createAlert('info', 'No unread notifications');
      return;
    }
    if (!confirm(`Mark all ${unreadCount} notification(s) as read?`)) {
      return;
    }
    await markAllAsReadMutation.mutateAsync();
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      certificate_issued: '🎓',
      event_registration: '📅',
      event_approval: '✅',
      profile_approval: '👤',
      default: '🔔',
    };
    return iconMap[type] || iconMap.default;
  };

  if (isLoading) {
    return (
      <div>
        <SkeletonLoader count={6} />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        {/* Header */}
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
                Notifications
              </h2>
              <p className="text-contentColor dark:text-contentColor-dark">
                {unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="px-4 py-2 text-sm font-semibold text-whiteColor bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {markAllAsReadMutation.isPending ? (
                  <>
                    <FiLoader className="animate-spin" size={16} />
                    <span>Marking...</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={16} />
                    <span>Mark All as Read</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-primaryColor text-whiteColor'
                  : 'bg-lightGrey5 dark:bg-gray-800 text-contentColor dark:text-contentColor-dark hover:bg-lightGrey6 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                filter === 'unread'
                  ? 'bg-primaryColor text-whiteColor'
                  : 'bg-lightGrey5 dark:bg-gray-800 text-contentColor dark:text-contentColor-dark hover:bg-lightGrey6 dark:hover:bg-gray-700'
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                filter === 'read'
                  ? 'bg-primaryColor text-whiteColor'
                  : 'bg-lightGrey5 dark:bg-gray-800 text-contentColor dark:text-contentColor-dark hover:bg-lightGrey6 dark:hover:bg-gray-700'
              }`}
            >
              Read
            </button>
          </div>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <NoData message="No notifications found." />
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    notification.read
                      ? 'bg-lightGrey5 dark:bg-gray-800 border-borderColor dark:border-borderColor-dark'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 text-2xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className={`text-base font-semibold mb-1 ${
                            notification.read
                              ? 'text-contentColor dark:text-contentColor-dark'
                              : 'text-blackColor dark:text-blackColor-dark'
                          }`}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-contentColor dark:text-contentColor-dark opacity-70">
                            {format(new Date(notification.created_at), 'PPP p')}
                          </p>
                        </div>
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markAsReadMutation.isPending}
                            className="flex-shrink-0 px-3 py-1 text-xs font-semibold text-primaryColor bg-primaryColor/10 rounded-md hover:bg-primaryColor/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                            title="Mark as read"
                          >
                            <FiCheck size={14} />
                            <span>Mark Read</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
    </div>
  );
}
