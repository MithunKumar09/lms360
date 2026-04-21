"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import NotificationDropdown from "./NotificationDropdown";

/**
 * NotificationBell Component
 * 
 * Bell icon with unread count badge and dropdown
 * 
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 */
export default function NotificationBell({ className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Fetch unread count
  const { data: unreadData, refetch } = useQuery({
    queryKey: ['notification-unread-count'],
    queryFn: async () => {
      const response = await apiClient.get('/mentors/notifications/unread-count');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch unread count');
      }
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 30 * 1000,
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const unreadCount = unreadData?.unread_count || 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  if (!isAuthenticated) return null;

  return (
    <div className={`relative ${className}`} ref={bellRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-contentColor dark:text-contentColor-dark hover:text-primaryColor transition-colors"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-whiteColor bg-red-600 rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          onClose={() => setIsOpen(false)}
          onNotificationRead={() => refetch()}
        />
      )}
    </div>
  );
}
