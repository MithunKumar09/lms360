"use client";

import { useState, useRef, useEffect } from "react";
import { useNotifications, useMarkNotificationRead } from "@/hooks/api/useNotifications";
import NotificationHistoryModal from "@/components/shared/modals/NotificationHistoryModal";
import Link from "next/link";
import { useRouter } from "next/navigation";

const NotificationBell = ({ variant = "default" }) => {
  const isLightVariant = variant === "light";
  const [isOpen, setIsOpen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Fetch recent notifications (last 5 unread + 5 read)
  const { data: notificationsData, isLoading } = useNotifications({
    page: 1,
    limit: 10,
  });

  const markAsRead = useMarkNotificationRead();

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unread_count || 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead.mutateAsync(notification.id);
    }

    // Close dropdown
    setIsOpen(false);

    // Navigate to action URL if available
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case "instructor_request":
        return "icofont-user";
      case "vendor_request":
        return "icofont-briefcase";
      case "mentor_request":
        return "icofont-graduation-cap";
      case "request_accepted":
        return "icofont-check-circled";
      case "request_rejected":
        return "icofont-close-circled";
      default:
        return "icofont-bell";
    }
  };

  // Get notification color based on type
  const getNotificationColor = (type) => {
    switch (type) {
      case "instructor_request":
        return "text-blue-500";
      case "vendor_request":
        return "text-purple-500";
      case "mentor_request":
        return "text-indigo-500";
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

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 transition-colors ${
            isLightVariant
              ? "text-whiteColor hover:text-yellow"
              : "text-contentColor dark:text-contentColor-dark hover:text-primaryColor dark:hover:text-primaryColor"
          }`}
          aria-label="Notifications"
        >
          <i className="icofont-bell text-2xl"></i>
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-whiteColor text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 md:w-96 bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-borderColor dark:border-borderColor-dark flex items-center justify-between">
              <h3 className="font-bold text-blackColor dark:text-blackColor-dark">
                Notifications
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowHistoryModal(true);
                }}
                className="text-sm text-primaryColor hover:underline"
              >
                See All
              </button>
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
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer hover:bg-darkdeep4 dark:hover:bg-darkdeep4 transition-colors ${
                        !notification.read
                          ? "bg-primaryColor/5 dark:bg-primaryColor/10"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`${getNotificationColor(
                            notification.type
                          )} text-xl mt-1`}
                        >
                          <i className={getNotificationIcon(notification.type)}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm text-blackColor dark:text-blackColor-dark">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-primaryColor rounded-full flex-shrink-0 mt-1"></span>
                            )}
                          </div>
                          <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-contentColor dark:text-contentColor-dark">
                              {getTimeAgo(notification.created_at)}
                            </span>
                            {notification.action_url && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationClick(notification);
                                }}
                                className="text-xs text-primaryColor hover:underline"
                              >
                                View
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-borderColor dark:border-borderColor-dark">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setShowHistoryModal(true);
                  }}
                  className="w-full text-center text-sm text-primaryColor hover:underline"
                >
                  See All Notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <NotificationHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </>
  );
};

export default NotificationBell;

