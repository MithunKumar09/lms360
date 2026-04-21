/**
 * Sidebar Access Control Main Component
 * 
 * Superadmin only - Controls sidebar visibility at global, role, organization, or user level
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import useTab from "@/hooks/useTab";
import TabButtonSecondary from "@/components/shared/buttons/TabButtonSecondary";
import TabContentWrapper from "@/components/shared/wrappers/TabContentWrapper";
import SidebarAccessControlTable from "@/components/shared/sidebar-access-control/SidebarAccessControlTable";
import SidebarAccessControlForm from "@/components/shared/sidebar-access-control/SidebarAccessControlForm";
import SidebarAccessControlFilters from "@/components/shared/sidebar-access-control/SidebarAccessControlFilters";
import ButtonPrimary from "@/components/shared/buttons/ButtonPrimary";
import useSweetAlert from "@/hooks/useSweetAlert";

const SCOPE_TYPES = [
  { key: "global", label: "Global", description: "Apply to all users" },
  { key: "role", label: "Role-Based", description: "Apply to specific role" },
  { key: "organization", label: "Organization-Based", description: "Apply to specific organization" },
  { key: "user", label: "User-Based", description: "Apply to specific user" },
];

const SidebarAccessControlMain = () => {
  const createAlert = useSweetAlert();
  const { currentIdx, handleTabClick } = useTab();

  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSetting, setEditingSetting] = useState(null);
  const [filters, setFilters] = useState({});
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Use ref to track if fetch is in progress (prevents infinite loops)
  const isFetchingRef = useRef(false);

  // Fetch settings - stable function that doesn't cause infinite loops
  const fetchSettings = useCallback(async (scopeType = null, currentFilters = {}) => {
    // Prevent multiple simultaneous requests
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (scopeType) {
        queryParams.append("scopeType", scopeType);
      }
      if (currentFilters.sidebarName) {
        queryParams.append("sidebarName", currentFilters.sidebarName);
      }
      if (currentFilters.isEnabled !== undefined) {
        queryParams.append("isEnabled", currentFilters.isEnabled);
      }

      const response = await fetch(
        `/api/sidebar-access-control?${queryParams.toString()}`,
        {
          credentials: 'include', // Include cookies for session
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        // Don't show alert for auth errors - let guards handle it
        if (response.status === 401 || response.status === 403) {
          console.error("Authentication error:", error);
          setSettings([]);
          setIsInitialLoad(false);
          return;
        }
        throw new Error(error.error || "Failed to fetch settings");
      }

      const data = await response.json();
      setSettings(data.data || []);
      setIsInitialLoad(false);
    } catch (error) {
      console.error("Error fetching settings:", error);
      // Only show alert for non-auth errors
      if (!error.message?.includes('Authentication') && !error.message?.includes('Unauthorized')) {
        createAlert("error", error.message || "Failed to load settings");
      }
      setSettings([]);
      setIsInitialLoad(false);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [createAlert]);

  // Load settings on mount and when tab or filters change
  // Use individual filter values in dependency array to prevent infinite loops
  useEffect(() => {
    const scopeType = SCOPE_TYPES[currentIdx]?.key || null;
    fetchSettings(scopeType, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, filters.scopeType, filters.sidebarName, filters.isEnabled]); // Only depend on currentIdx and individual filter values

  // Handle toggle
  const handleToggle = useCallback(async (setting) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/sidebar-access-control/${setting.id}`, {
        method: "PUT",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isEnabled: !setting.is_enabled,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update setting");
      }

      // Refresh settings
      const scopeType = SCOPE_TYPES[currentIdx]?.key || null;
      await fetchSettings(scopeType, filters);
      createAlert("success", "Setting updated successfully");
    } catch (error) {
      console.error("Error toggling setting:", error);
      createAlert("error", error.message || "Failed to update setting");
    } finally {
      setSaving(false);
    }
  }, [currentIdx, filters, fetchSettings, createAlert]);

  // Handle form submit
  const handleFormSubmit = useCallback(async (formData) => {
    try {
      setSaving(true);
      const url = editingSetting
        ? `/api/sidebar-access-control/${editingSetting.id}`
        : "/api/sidebar-access-control";
      const method = editingSetting ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scopeType: formData.scopeType,
          scopeValue: formData.scopeValue,
          sidebarName: formData.sidebarName,
          isEnabled: formData.isEnabled,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save setting");
      }

      // Refresh settings
      const scopeType = SCOPE_TYPES[currentIdx]?.key || null;
      await fetchSettings(scopeType, filters);
      setShowForm(false);
      setEditingSetting(null);
      createAlert("success", editingSetting ? "Setting updated successfully" : "Setting created successfully");
    } catch (error) {
      console.error("Error saving setting:", error);
      createAlert("error", error.message || "Failed to save setting");
    } finally {
      setSaving(false);
    }
  }, [editingSetting, currentIdx, filters, fetchSettings, createAlert]);

  // Handle delete
  const handleDelete = useCallback(async (setting) => {
    if (!confirm("Are you sure you want to delete this setting?")) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/sidebar-access-control/${setting.id}`, {
        method: "DELETE",
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete setting");
      }

      // Refresh settings
      const scopeType = SCOPE_TYPES[currentIdx]?.key || null;
      await fetchSettings(scopeType, filters);
      createAlert("success", "Setting deleted successfully");
    } catch (error) {
      console.error("Error deleting setting:", error);
      createAlert("error", error.message || "Failed to delete setting");
    } finally {
      setSaving(false);
    }
  }, [currentIdx, filters, fetchSettings, createAlert]);

  // Handle filter change
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  // Get filtered settings for current scope
  const getFilteredSettings = useMemo(() => {
    const scopeType = SCOPE_TYPES[currentIdx]?.key;
    return settings.filter((setting) => {
      if (scopeType && setting.scope_type !== scopeType) {
        return false;
      }
      return true;
    });
  }, [settings, currentIdx]);

  const tabButtons = SCOPE_TYPES.map((scope) => ({
    name: scope.label.toUpperCase(),
    content: (
      <div className="space-y-4">
        {/* Filters */}
        <SidebarAccessControlFilters
          onFilterChange={handleFilterChange}
          filters={filters}
        />

        {/* Table */}
        <SidebarAccessControlTable
          settings={getFilteredSettings}
          onToggle={handleToggle}
          onEdit={(setting) => {
            setEditingSetting(setting);
            setShowForm(true);
          }}
          onDelete={handleDelete}
          loading={loading || saving}
          scopeType={scope.key}
        />

        {/* Actions */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-contentColor dark:text-contentColor-dark">
            {getFilteredSettings.length} setting(s) found
          </div>
          <ButtonPrimary
            type="button"
            onClick={() => {
              setEditingSetting(null);
              setShowForm(true);
            }}
            disabled={loading || saving}
          >
            Add New Setting
          </ButtonPrimary>
        </div>
      </div>
    ),
  }));

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      {/* Heading */}
      <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
        <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
          Sidebar Access Control
        </h2>
        <p className="text-sm text-contentColor dark:text-contentColor-dark mt-2">
          Control sidebar visibility at global, role, organization, or user level.
          Priority: User &gt; Organization &gt; Role &gt; Global
        </p>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex flex-wrap mb-10px lg:mb-50px rounded gap-10px">
          {tabButtons?.map(({ name }, idx) => (
            <TabButtonSecondary
              key={idx}
              name={name}
              currentIdx={currentIdx}
              idx={idx}
              handleTabClick={handleTabClick}
              button={"small"}
            />
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {tabButtons?.map(({ content }, idx) => (
            <TabContentWrapper
              key={idx}
              isShow={currentIdx === idx ? true : false}
            >
              {content}
            </TabContentWrapper>
          ))}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
                {editingSetting ? "Edit Setting" : "Create New Setting"}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingSetting(null);
                }}
                className="text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark"
              >
                ✕
              </button>
            </div>
            <SidebarAccessControlForm
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingSetting(null);
              }}
              initialData={editingSetting}
              loading={saving}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarAccessControlMain;
