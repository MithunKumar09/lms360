"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import NotificationItem from "./NotificationItem";
import { format } from "date-fns";

/**
 * NotificationDropdown Component
 * 
 * Dropdown list of recent notifications
 * 
 * @param {Object} props
 * @param {Function} props.onClose - Callback to close dropdown
 * @param {Function} props.onNotificationRead - Callback when notification is read
 */
export default function NotificationDropdown({ onClose, onNotificationRead }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();

  // Fetch recent notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: async () => {
      const response = await apiClient.get('/mentors/notifications?limit=10&sort=created_at_desc');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch notifications');
      }
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 10 * 1000,
    gcTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unread_count || 0;

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
      onNotificationRead?.();
    },
  });

  // Mark single notification as read
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
      onNotificationRead?.();
    },
  });

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate based on notification type
    if (notification.data) {
      if (notification.data.event_id) {
        router.push(`/dashboards/mentor-event-registrations/${notification.data.event_id}`);
      } else if (notification.data.workshop_id) {
        router.push(`/dashboards/mentor-workshop-registrations/${notification.data.workshop_id}`);
      } else if (notification.data.job_id) {
        router.push(`/dashboards/mentor-job-applications/${notification.data.job_id}`);
      }
    }

    onClose();
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-borderColor dark:border-borderColor-dark flex items-center justify-between">
        <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor">
          Notifications
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="text-xs text-primaryColor hover:text-primaryColor/70 font-medium transition-colors disabled:opacity-50"
          >
            {markAllReadMutation.isPending ? "Marking..." : "Mark all as read"}
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-contentColor dark:text-contentColor-dark">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-contentColor dark:text-contentColor-dark">
            No notifications
          </div>
        ) : (
          <div className="divide-y divide-borderColor dark:divide-borderColor-dark">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                onMarkAsRead={() => markAsReadMutation.mutate(notification.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-borderColor dark:border-borderColor-dark">
        <button
          onClick={() => {
            router.push('/dashboards/mentor-notifications');
            onClose();
          }}
          className="w-full py-2 text-sm font-semibold text-primaryColor hover:text-primaryColor/70 transition-colors text-center"
        >
          View All Notifications
        </button>
      </div>
    </div>
  );
}
