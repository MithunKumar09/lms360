/**
 * Sidebar Access Control Form Component
 * 
 * Form for creating/editing sidebar access control settings
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import ButtonPrimary from "@/components/shared/buttons/ButtonPrimary";
import useSweetAlert from "@/hooks/useSweetAlert";
import { SIDEBAR_ITEMS_BY_ROLE, getSidebarItemsForRole } from "@/lib/sidebar-items";

const SidebarAccessControlForm = ({
  onSubmit,
  onCancel,
  initialData = null,
  loading = false,
}) => {
  const createAlert = useSweetAlert();
  const [formData, setFormData] = useState({
    scopeType: initialData?.scope_type || "global",
    scopeValue: initialData?.scope_value || "",
    sidebarName: initialData?.sidebar_name || "",
    isEnabled: initialData?.is_enabled !== undefined ? initialData.is_enabled : true,
  });

  useEffect(() => {
    if (initialData) {
      // If editing, reconstruct the sidebar item format (role:itemName)
      // Since we only store role name, we'll show the first item for that role
      let sidebarName = initialData.sidebar_name || "";
      if (sidebarName && SIDEBAR_ITEMS_BY_ROLE[sidebarName]) {
        const firstItem = SIDEBAR_ITEMS_BY_ROLE[sidebarName][0];
        if (firstItem) {
          sidebarName = `${sidebarName}:${firstItem.name}`;
        }
      }
      
      setFormData({
        scopeType: initialData.scope_type || "global",
        scopeValue: initialData.scope_value || "",
        sidebarName: sidebarName,
        isEnabled: initialData.is_enabled !== undefined ? initialData.is_enabled : true,
      });
    }
  }, [initialData]);

  // Filter sidebar items based on selected scope type and value
  const filteredSidebarItems = useMemo(() => {
    // If scope type is "role" and scope value is set, filter by that role
    if (formData.scopeType === "role" && formData.scopeValue) {
      const role = formData.scopeValue.toLowerCase().trim();
      if (SIDEBAR_ITEMS_BY_ROLE[role]) {
        return { [role]: SIDEBAR_ITEMS_BY_ROLE[role] };
      }
    }
    
    // For global, organization, or user scope, show all roles
    // Or if role scope but no value yet, show all
    return SIDEBAR_ITEMS_BY_ROLE;
  }, [formData.scopeType, formData.scopeValue]);

  // Reset sidebar name when scope changes
  useEffect(() => {
    // If scope type or value changes, reset sidebar selection
    setFormData(prev => ({
      ...prev,
      sidebarName: "",
    }));
  }, [formData.scopeType, formData.scopeValue]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.sidebarName) {
      createAlert("error", "Sidebar item is required");
      return;
    }

    if (formData.scopeType !== "global" && !formData.scopeValue) {
      createAlert("error", `Scope value is required for ${formData.scopeType} scope`);
      return;
    }

    // Extract role name from sidebar item selection (format: "role:itemName")
    // For backward compatibility, we store just the role name
    let sidebarName = formData.sidebarName;
    if (sidebarName.includes(':')) {
      sidebarName = sidebarName.split(':')[0]; // Extract role name
    }

    onSubmit({
      ...formData,
      sidebarName: sidebarName, // Store role name only
      scopeValue: formData.scopeType === "global" ? null : formData.scopeValue,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Scope Type */}
      <div>
        <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
          Scope Type <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.scopeType}
          onChange={(e) =>
            setFormData({ ...formData, scopeType: e.target.value, scopeValue: "" })
          }
          className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
          required
        >
          <option value="global">Global (All Users)</option>
          <option value="role">Role</option>
          <option value="organization">Organization</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Scope Value */}
      {formData.scopeType !== "global" && (
        <div>
          <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
            Scope Value <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.scopeValue}
            onChange={(e) => setFormData({ ...formData, scopeValue: e.target.value })}
            placeholder={
              formData.scopeType === "role"
                ? "e.g., admin, instructor"
                : formData.scopeType === "organization"
                ? "Organization ID (UUID)"
                : "User ID (UUID)"
            }
            className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            required={formData.scopeType !== "global"}
          />
          <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
            {formData.scopeType === "role"
              ? "Enter role name (e.g., admin, instructor, student)"
              : formData.scopeType === "organization"
              ? "Enter organization UUID"
              : "Enter user UUID"}
          </p>
        </div>
      )}

      {/* Sidebar Name - Filtered based on scope type and role */}
      <div>
        <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
          Sidebar Item <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.sidebarName}
          onChange={(e) => setFormData({ ...formData, sidebarName: e.target.value })}
          className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
          required
          disabled={formData.scopeType === "role" && !formData.scopeValue}
        >
          <option value="">
            {formData.scopeType === "role" && !formData.scopeValue
              ? "Enter role name first"
              : "Select Sidebar Item"}
          </option>
          {Object.entries(filteredSidebarItems).map(([role, items]) => (
            <optgroup key={role} label={`${role.charAt(0).toUpperCase() + role.slice(1)} Sidebar`}>
              {items.map((item) => (
                <option key={`${role}-${item.name}`} value={`${role}:${item.name}`}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
          {formData.scopeType === "role" && formData.scopeValue
            ? `Showing sidebar items for ${formData.scopeValue} role`
            : formData.scopeType === "role" && !formData.scopeValue
            ? "Enter a role name above to see available sidebar items"
            : "Select a specific sidebar menu item to control its visibility"}
        </p>
      </div>

      {/* Enabled Status */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isEnabled}
            onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
            className="w-4 h-4 text-primaryColor bg-gray-100 border-gray-300 rounded focus:ring-primaryColor"
          />
          <span className="text-sm font-medium text-blackColor dark:text-blackColor-dark">
            Enable Sidebar
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-borderColor dark:border-borderColor-dark rounded text-blackColor dark:text-blackColor-dark hover:bg-lightGrey5 dark:hover:bg-whiteColor-dark transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <ButtonPrimary type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update" : "Create"}
        </ButtonPrimary>
      </div>
    </form>
  );
};

export default SidebarAccessControlForm;
