/**
 * Sidebar Access Control Filters Component
 * 
 * Filter component for scope type, sidebar name, etc.
 */

"use client";

import { useState } from "react";

const SidebarAccessControlFilters = ({ onFilterChange, filters = {} }) => {
  const [localFilters, setLocalFilters] = useState({
    scopeType: filters.scopeType || "",
    sidebarName: filters.sidebarName || "",
    isEnabled: filters.isEnabled === undefined ? "" : filters.isEnabled ? "true" : "false",
  });

  const handleFilterChange = (key, value) => {
    const newFilters = {
      ...localFilters,
      [key]: value,
    };
    setLocalFilters(newFilters);

    // Convert to API format
    const apiFilters = {
      ...newFilters,
      isEnabled: newFilters.isEnabled === "" ? undefined : newFilters.isEnabled === "true",
    };

    // Remove empty filters
    Object.keys(apiFilters).forEach((k) => {
      if (apiFilters[k] === "" || apiFilters[k] === undefined) {
        delete apiFilters[k];
      }
    });

    onFilterChange(apiFilters);
  };

  const handleClear = () => {
    const clearedFilters = {
      scopeType: "",
      sidebarName: "",
      isEnabled: "",
    };
    setLocalFilters(clearedFilters);
    onFilterChange({});
  };

  return (
    <div className="mb-6 p-4 bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Scope Type Filter */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
            Scope Type
          </label>
          <select
            value={localFilters.scopeType}
            onChange={(e) => handleFilterChange("scopeType", e.target.value)}
            className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
          >
            <option value="">All Scopes</option>
            <option value="global">Global</option>
            <option value="role">Role</option>
            <option value="organization">Organization</option>
            <option value="user">User</option>
          </select>
        </div>

        {/* Sidebar Name Filter */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
            Sidebar
          </label>
          <select
            value={localFilters.sidebarName}
            onChange={(e) => handleFilterChange("sidebarName", e.target.value)}
            className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
          >
            <option value="">All Sidebars</option>
            <option value="superadmin">Superadmin</option>
            <option value="admin">Admin</option>
            <option value="instructor">Instructor</option>
            <option value="vendor">Vendor</option>
            <option value="mentor">Mentor</option>
            <option value="student">Student</option>
          </select>
        </div>

        {/* Enabled Status Filter */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
            Status
          </label>
          <select
            value={localFilters.isEnabled}
            onChange={(e) => handleFilterChange("isEnabled", e.target.value)}
            className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
          >
            <option value="">All Status</option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>

        {/* Clear Button */}
        <div>
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-blackColor dark:text-blackColor-dark rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default SidebarAccessControlFilters;
