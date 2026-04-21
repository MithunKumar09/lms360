"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";

/**
 * NotificationSettings Component
 * 
 * Notification preferences settings
 * 
 * @param {Object} props
 * @param {Function} props.onBack - Callback to go back
 */
export default function NotificationSettings({ onBack }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();

  const [preferences, setPreferences] = useState([]);

  // Fetch preferences
  const { data: preferencesData, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const response = await apiClient.get('/mentors/notifications/preferences');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch preferences');
      }
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (preferencesData?.preferences) {
      setPreferences(preferencesData.preferences);
    }
  }, [preferencesData]);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updatedPreferences) => {
      const response = await apiClient.put('/mentors/notifications/preferences', {
        preferences: updatedPreferences,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update preferences');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      createAlert('success', 'Notification preferences updated successfully!');
    },
    onError: (error) => {
      console.error('Update preferences error:', error);
      createAlert('error', error.message || 'Failed to update preferences');
    },
  });

  const handleToggle = (type, field, value) => {
    const updated = preferences.map((pref) =>
      pref.notification_type === type ? { ...pref, [field]: value } : pref
    );
    setPreferences(updated);
  };

  const handleSave = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  const getTypeLabel = (type) => {
    const labels = {
      new_registration: 'New Registration',
      new_application: 'New Application',
      capacity_warning: 'Capacity Warning (80-89%)',
      capacity_full: 'Capacity Full (100%)',
      event_reminder: 'Event Reminder',
      workshop_reminder: 'Workshop Reminder',
      application_status_change: 'Application Status Change',
      system_announcement: 'System Announcement',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <button
                onClick={onBack}
                className="mb-3 text-sm text-primaryColor hover:underline flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                Back to Notifications
              </button>
              <h1 className="h3 mb-2 fw-bold text-dark">Notification Settings</h1>
              <p className="text-muted mb-0 small">
                Configure which notifications you want to receive
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={updatePreferencesMutation.isPending}
              className="px-4 py-2 text-sm font-semibold text-whiteColor bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50"
            >
              {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>

      {/* Preferences List */}
      <div className="space-y-4">
        {preferences.map((pref) => (
          <div
            key={pref.notification_type}
            className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor">
                  {getTypeLabel(pref.notification_type)}
                </h3>
                <p className="text-sm text-contentColor dark:text-contentColor-dark mt-1">
                  Receive notifications for {getTypeLabel(pref.notification_type).toLowerCase()}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pref.enabled}
                  onChange={(e) => handleToggle(pref.notification_type, 'enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primaryColor/20 dark:peer-focus:ring-primaryColor/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primaryColor"></div>
              </label>
            </div>

            {pref.enabled && (
              <div className="mt-4">
                <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Notification Channel
                </label>
                <div className="flex gap-4">
                  {['in_app', 'email', 'both'].map((channel) => (
                    <label
                      key={channel}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={`channel-${pref.notification_type}`}
                        value={channel}
                        checked={pref.channel === channel}
                        onChange={(e) => handleToggle(pref.notification_type, 'channel', e.target.value)}
                        className="w-4 h-4 text-primaryColor border-borderColor dark:border-borderColor-dark focus:ring-primaryColor"
                      />
                      <span className="text-sm text-contentColor dark:text-contentColor-dark capitalize">
                        {channel.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
