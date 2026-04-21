"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import { format } from "date-fns";
import AdvancedPagination from "@/components/shared/courses/AdvancedPagination";
import NotificationItem from "@/components/shared/notifications/NotificationItem";
import NotificationSettings from "@/components/shared/notifications/NotificationSettings";

export default function MentorNotificationsMain() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const limit = 20;

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', page, typeFilter, readFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }
      if (readFilter !== 'all') {
        params.append('read', readFilter);
      }
      const response = await apiClient.get(`/mentors/notifications?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch notifications');
      }
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const notifications = notificationsData?.notifications || [];
  const pagination = notificationsData?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };
  const unreadCount = notificationsData?.unread_count || 0;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      const response = await apiClient.put(`/mentors/notifications/${notificationId}`, {
        read: true,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark as read');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/mentors/notifications', {
        mark_all_read: true,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark all as read');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (notificationId) => {
      const response = await apiClient.delete(`/mentors/notifications/${notificationId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete notification');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
    },
  });

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading notifications...</p>
      </div>
    );
  }

  if (showSettings) {
    return (
      <NotificationSettings
        onBack={() => setShowSettings(false)}
      />
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Notifications</h1>
              <p className="text-muted mb-0 small">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up!'}
              </p>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold text-primaryColor bg-primaryColor/10 rounded-md hover:bg-primaryColor/20 transition-colors disabled:opacity-50"
                >
                  {markAllReadMutation.isPending ? 'Marking...' : 'Mark All as Read'}
                </button>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-lightGrey5 dark:bg-whiteColor-dark rounded-md hover:bg-opacity-80 transition-colors"
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 mb-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="all">All Types</option>
              <option value="new_registration">New Registration</option>
              <option value="new_application">New Application</option>
              <option value="capacity_warning">Capacity Warning</option>
              <option value="capacity_full">Capacity Full</option>
              <option value="event_reminder">Event Reminder</option>
              <option value="workshop_reminder">Workshop Reminder</option>
              <option value="application_status_change">Status Change</option>
              <option value="system_announcement">System Announcement</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Status
            </label>
            <select
              value={readFilter}
              onChange={(e) => {
                setReadFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="all">All</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            No notifications found.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <NotificationItem
                      notification={notification}
                      onClick={() => {
                        if (!notification.read) {
                          markAsReadMutation.mutate(notification.id);
                        }
                      }}
                      onMarkAsRead={() => markAsReadMutation.mutate(notification.id)}
                    />
                  </div>
                  <div className="flex gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        disabled={markAsReadMutation.isPending}
                        className="px-3 py-1 text-xs font-semibold text-primaryColor bg-primaryColor/10 rounded-md hover:bg-primaryColor/20 transition-colors disabled:opacity-50"
                      >
                        Mark as Read
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(notification.id)}
                      disabled={deleteMutation.isPending}
                      className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-50 rounded-md hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <AdvancedPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}
