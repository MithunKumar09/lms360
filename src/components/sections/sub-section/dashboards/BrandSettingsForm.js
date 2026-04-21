"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import { FiBell, FiMonitor, FiAward, FiCalendar, FiSave, FiLoader } from "react-icons/fi";

export default function BrandSettingsForm() {
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  const [formData, setFormData] = useState({
    notifications: {
      email_on_certificate_issued: true,
      email_on_event_registration: true,
      email_on_event_approval: true,
      email_on_profile_approval: true,
    },
    dashboard: {
      show_statistics: true,
      show_recent_activity: true,
      items_per_page: 20,
    },
    certificates: {
      auto_generate_on_issue: true,
      default_format: 'pdf',
    },
    events: {
      auto_propose_on_create: false,
      default_status: 'draft',
    },
  });

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['brandSettings', userId],
    queryFn: async () => {
      const response = await apiClient.get('/brand/settings');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch settings');
      }
      return response.data;
    },
    enabled: !!userId,
    onSuccess: (data) => {
      if (data?.settings) {
        setFormData(data.settings);
      }
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings) => {
      const response = await apiClient.put('/brand/settings', { settings });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update settings');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandSettings', userId] });
      createAlert('success', 'Settings updated successfully!');
    },
    onError: (error) => {
      console.error('Update settings error:', error);
      createAlert('error', error.message || 'Failed to update settings');
    },
  });

  const handleChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateSettingsMutation.mutateAsync(formData);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <FiLoader className="animate-spin mx-auto mb-4 text-primaryColor dark:text-primaryColor-dark" size={32} />
        <p className="text-contentColor dark:text-contentColor-dark">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Brand Settings
          </h2>
          <p className="text-sm text-contentColor dark:text-contentColor-dark mt-2">
            Manage your brand preferences and settings
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Notifications Section */}
          <div className="mb-6 p-6 border border-borderColor dark:border-borderColor-dark rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <FiBell className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Notification Preferences
              </h3>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifications.email_on_certificate_issued}
                  onChange={(e) => handleChange('notifications', 'email_on_certificate_issued', e.target.checked)}
                  className="w-5 h-5 rounded border-borderColor dark:border-borderColor-dark text-primaryColor focus:ring-2 focus:ring-primaryColor/20"
                />
                <span className="text-sm text-contentColor dark:text-contentColor-dark">
                  Email notification when certificate is issued
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifications.email_on_event_registration}
                  onChange={(e) => handleChange('notifications', 'email_on_event_registration', e.target.checked)}
                  className="w-5 h-5 rounded border-borderColor dark:border-borderColor-dark text-primaryColor focus:ring-2 focus:ring-primaryColor/20"
                />
                <span className="text-sm text-contentColor dark:text-contentColor-dark">
                  Email notification when someone registers for your event
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifications.email_on_event_approval}
                  onChange={(e) => handleChange('notifications', 'email_on_event_approval', e.target.checked)}
                  className="w-5 h-5 rounded border-borderColor dark:border-borderColor-dark text-primaryColor focus:ring-2 focus:ring-primaryColor/20"
                />
                <span className="text-sm text-contentColor dark:text-contentColor-dark">
                  Email notification when event is approved/rejected
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifications.email_on_profile_approval}
                  onChange={(e) => handleChange('notifications', 'email_on_profile_approval', e.target.checked)}
                  className="w-5 h-5 rounded border-borderColor dark:border-borderColor-dark text-primaryColor focus:ring-2 focus:ring-primaryColor/20"
                />
                <span className="text-sm text-contentColor dark:text-contentColor-dark">
                  Email notification when profile is approved/rejected
                </span>
              </label>
            </div>
          </div>

          {/* Dashboard Section */}
          <div className="mb-6 p-6 border border-borderColor dark:border-borderColor-dark rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <FiMonitor className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Dashboard Preferences
              </h3>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.dashboard.show_statistics}
                  onChange={(e) => handleChange('dashboard', 'show_statistics', e.target.checked)}
                  className="w-5 h-5 rounded border-borderColor dark:border-borderColor-dark text-primaryColor focus:ring-2 focus:ring-primaryColor/20"
                />
                <span className="text-sm text-contentColor dark:text-contentColor-dark">
                  Show statistics on dashboard
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.dashboard.show_recent_activity}
                  onChange={(e) => handleChange('dashboard', 'show_recent_activity', e.target.checked)}
                  className="w-5 h-5 rounded border-borderColor dark:border-borderColor-dark text-primaryColor focus:ring-2 focus:ring-primaryColor/20"
                />
                <span className="text-sm text-contentColor dark:text-contentColor-dark">
                  Show recent activity on dashboard
                </span>
              </label>
              <div>
                <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                  Items per page
                </label>
                <select
                  value={formData.dashboard.items_per_page}
                  onChange={(e) => handleChange('dashboard', 'items_per_page', parseInt(e.target.value, 10))}
                  className="w-full px-4 py-2 rounded-lg border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Certificates Section */}
          <div className="mb-6 p-6 border border-borderColor dark:border-borderColor-dark rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <FiAward className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Certificate Preferences
              </h3>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.certificates.auto_generate_on_issue}
                  onChange={(e) => handleChange('certificates', 'auto_generate_on_issue', e.target.checked)}
                  className="w-5 h-5 rounded border-borderColor dark:border-borderColor-dark text-primaryColor focus:ring-2 focus:ring-primaryColor/20"
                />
                <span className="text-sm text-contentColor dark:text-contentColor-dark">
                  Automatically generate PDF/image when certificate is issued
                </span>
              </label>
              <div>
                <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                  Default certificate format
                </label>
                <select
                  value={formData.certificates.default_format}
                  onChange={(e) => handleChange('certificates', 'default_format', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                >
                  <option value="pdf">PDF</option>
                  <option value="image">Image (PNG)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Events Section */}
          <div className="mb-6 p-6 border border-borderColor dark:border-borderColor-dark rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <FiCalendar className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Event Preferences
              </h3>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.events.auto_propose_on_create}
                  onChange={(e) => handleChange('events', 'auto_propose_on_create', e.target.checked)}
                  className="w-5 h-5 rounded border-borderColor dark:border-borderColor-dark text-primaryColor focus:ring-2 focus:ring-primaryColor/20"
                />
                <span className="text-sm text-contentColor dark:text-contentColor-dark">
                  Automatically submit events for approval when created
                </span>
              </label>
              <div>
                <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                  Default event status
                </label>
                <select
                  value={formData.events.default_status}
                  onChange={(e) => handleChange('events', 'default_status', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                >
                  <option value="draft">Draft</option>
                  <option value="proposed">Proposed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="px-6 py-3 bg-primaryColor hover:bg-primaryColor/90 dark:bg-primaryColor-dark dark:hover:bg-primaryColor-dark/90 text-whiteColor dark:text-whiteColor-dark font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <FiLoader className="animate-spin" size={18} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FiSave size={18} />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
