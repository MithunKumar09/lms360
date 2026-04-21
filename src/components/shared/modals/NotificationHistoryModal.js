"use client";

import { useState, useEffect } from "react";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification } from "@/hooks/api/useNotifications";
import { useRouter } from "next/navigation";

const NotificationHistoryModal = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [filters, setFilters] = useState({
    read: null, // null = all, true = read, false = unread
    type: "",
    start_date: "",
    end_date: "",
    search: "",
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  // Prepare API params (exclude search as it's client-side)
  const apiParams = {
    page,
    limit,
    read: filters.read,
    type: filters.type || undefined,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined,
  };

  const { data: notificationsData, isLoading, refetch } = useNotifications(apiParams);

  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const allNotifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unread_count || 0;
  const pagination = notificationsData?.pagination || { page: 1, totalPages: 1, total: 0 };

  // Client-side search filtering
  const notifications = filters.search
    ? allNotifications.filter(
        (n) =>
          n.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          n.message.toLowerCase().includes(filters.search.toLowerCase())
      )
    : allNotifications;

  // Reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setFilters({
        read: null,
        type: "",
        start_date: "",
        end_date: "",
        search: "",
      });
      setPage(1);
    }
  }, [isOpen]);

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead.mutateAsync(notification.id);
    }
    if (notification.action_url) {
      router.push(notification.action_url);
      onClose();
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    await markAllAsRead.mutateAsync();
  };

  // Handle delete notification
  const handleDelete = async (notificationId, e) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this notification?")) {
      await deleteNotification.mutateAsync(notificationId);
    }
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case "instructor_request":
        return "icofont-user";
      case "request_accepted":
        return "icofont-check-circled";
      case "request_rejected":
        return "icofont-close-circled";
      default:
        return "icofont-bell";
    }
  };

  // Get notification color
  const getNotificationColor = (type) => {
    switch (type) {
      case "instructor_request":
        return "text-blue-500";
      case "request_accepted":
        return "text-green-500";
      case "request_rejected":
        return "text-red-500";
      default:
        return "text-primaryColor";
    }
  };

  // Format time ago
  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Format date for input
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="p-6 border-b border-borderColor dark:border-borderColor-dark flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
              All Notifications
            </h2>
            {unreadCount > 0 && (
              <p className="text-sm text-contentColor dark:text-contentColor-dark mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark"
          >
            <i className="icofont-close"></i>
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-borderColor dark:border-borderColor-dark bg-darkdeep3 dark:bg-darkdeep3-dark">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Search notifications..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setPage(1);
                }}
                className="w-full py-2 px-3 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              />
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={filters.type}
                onChange={(e) => {
                  setFilters({ ...filters, type: e.target.value });
                  setPage(1);
                }}
                className="w-full py-2 px-3 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              >
                <option value="">All Types</option>
                <option value="instructor_request">Instructor Request</option>
                <option value="request_accepted">Request Accepted</option>
                <option value="request_rejected">Request Rejected</option>
                <option value="general">General</option>
              </select>
            </div>

            {/* Read Status Filter */}
            <div>
              <select
                value={filters.read === null ? "" : filters.read ? "read" : "unread"}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({
                    ...filters,
                    read: value === "" ? null : value === "read",
                  });
                  setPage(1);
                }}
                className="w-full py-2 px-3 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              >
                <option value="">All Status</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-contentColor dark:text-contentColor-dark mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formatDateForInput(filters.start_date)}
                onChange={(e) => {
                  setFilters({ ...filters, start_date: e.target.value });
                  setPage(1);
                }}
                className="w-full py-2 px-3 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs text-contentColor dark:text-contentColor-dark mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formatDateForInput(filters.end_date)}
                onChange={(e) => {
                  setFilters({ ...filters, end_date: e.target.value });
                  setPage(1);
                }}
                className="w-full py-2 px-3 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0 || markAllAsRead.isPending}
              className="px-4 py-2 text-sm bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {markAllAsRead.isPending ? "Marking..." : "Mark All as Read"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters({
                  read: null,
                  type: "",
                  start_date: "",
                  end_date: "",
                  search: "",
                });
                setPage(1);
              }}
              className="px-4 py-2 text-sm text-contentColor dark:text-contentColor-dark hover:text-primaryColor"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8 text-contentColor dark:text-contentColor-dark">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-contentColor dark:text-contentColor-dark">
              No notifications found
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 rounded-md border-2 cursor-pointer transition-colors ${
                    !notification.read
                      ? "bg-primaryColor/5 dark:bg-primaryColor/10 border-primaryColor/20"
                      : "bg-whiteColor dark:bg-whiteColor-dark border-borderColor dark:border-borderColor-dark hover:border-primaryColor/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`${getNotificationColor(
                        notification.type
                      )} text-2xl flex-shrink-0`}
                    >
                      <i className={getNotificationIcon(notification.type)}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-blackColor dark:text-blackColor-dark">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-primaryColor rounded-full flex-shrink-0"></span>
                            )}
                          </div>
                          <p className="text-sm text-contentColor dark:text-contentColor-dark mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-contentColor dark:text-contentColor-dark whitespace-nowrap">
                            {getTimeAgo(notification.created_at)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(notification.id, e)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Delete"
                          >
                            <i className="icofont-trash"></i>
                          </button>
                        </div>
                      </div>
                      {notification.action_url && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notification);
                          }}
                          className="mt-2 text-sm text-primaryColor hover:underline"
                        >
                          View Request →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-6 border-t border-borderColor dark:border-borderColor-dark flex items-center justify-between">
            <div className="text-sm text-contentColor dark:text-contentColor-dark">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} notifications
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-borderColor dark:border-borderColor-dark rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-darkdeep4 dark:hover:bg-darkdeep4"
              >
                Previous
              </button>
              <span className="text-sm text-contentColor dark:text-contentColor-dark">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1 text-sm border border-borderColor dark:border-borderColor-dark rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-darkdeep4 dark:hover:bg-darkdeep4"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationHistoryModal;

