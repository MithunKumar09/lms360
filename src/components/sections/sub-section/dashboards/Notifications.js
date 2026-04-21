"use client";

import { useNotifications } from "@/hooks/api/useNotifications";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const Notifications = () => {
  // Fetch unread notifications (limit to 5 for dashboard display)
  const { data, isLoading, error } = useNotifications(
    {
      page: 1,
      limit: 5,
      read: false, // Only show unread notifications
    },
    { enabled: true }
  );

  const notifications = data?.notifications || [];

  // Format time ago
  const getTimeAgo = (dateString) => {
    if (!dateString) return "Just now";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Just now";
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

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 max-h-137.5 overflow-auto">
      <HeadingDashboard path="/dashboards/notifications">Notifications</HeadingDashboard>

      {/* Loading state */}
      {isLoading && (
        <div className="py-15px text-center text-contentColor dark:text-contentColor-dark">
          Loading notifications...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-15px text-center text-red-500">
          Failed to load notifications
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && notifications.length === 0 && (
        <div className="py-15px text-center text-contentColor dark:text-contentColor-dark">
          No new notifications
        </div>
      )}

      {/* Notifications list */}
      {!isLoading && !error && notifications.length > 0 && (
        <ul>
          {notifications.map((notification, idx) => (
            <li
              key={notification.id}
              className={`flex items-center flex-wrap ${
                idx === notifications.length - 1
                  ? "pt-15px"
                  : "py-15px border-b border-borderColor dark:border-borderColor-dark"
              }`}
            >
              {/* Icon */}
              <div className="max-w-full md:max-w-1/5 pr-5">
                <i
                  className={`${getNotificationIcon(notification.type)} text-2xl text-primaryColor`}
                />
              </div>
              {/* Details */}
              <div className="max-w-full md:max-w-4/5 pr-10px">
                <div>
                  <h5 className="text-lg leading-1 font-bold text-contentColor dark:text-contentColor-dark mb-5px">
                    <Link
                      className="hover:text-primaryColor"
                      href={notification.action_url || "#"}
                    >
                      {notification.title}
                    </Link>
                  </h5>
                  <div className="text-darkblack dark:text-darkblack-dark leading-1.8">
                    <p className="text-sm mb-1">{notification.message}</p>
                    <p className="text-xs text-contentColor dark:text-contentColor-dark">
                      {getTimeAgo(notification.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
