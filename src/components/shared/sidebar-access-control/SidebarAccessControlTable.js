/**
 * Sidebar Access Control Table Component
 * 
 * Table component displaying sidebar access control settings
 */

"use client";

import ToggleSwitch from "@/components/shared/course-settings/ToggleSwitch";
import useSweetAlert from "@/hooks/useSweetAlert";

const SidebarAccessControlTable = ({
  settings = [],
  onToggle,
  onEdit,
  onDelete,
  loading = false,
  scopeType = null,
}) => {
  const createAlert = useSweetAlert();

  const handleToggle = async (setting) => {
    try {
      await onToggle(setting);
    } catch (error) {
      createAlert("error", error.message || "Failed to update setting");
    }
  };

  const getScopeDisplay = (setting) => {
    if (setting.scope_type === "global") {
      return "All Users";
    }
    if (setting.scope_type === "role") {
      return `Role: ${setting.scope_value}`;
    }
    if (setting.scope_type === "organization") {
      return `Org: ${setting.scope_value?.substring(0, 8)}...`;
    }
    if (setting.scope_type === "user") {
      return `User: ${setting.scope_value?.substring(0, 8)}...`;
    }
    return setting.scope_value || "N/A";
  };

  const getSidebarDisplayName = (sidebarName) => {
    const names = {
      superadmin: "Superadmin",
      admin: "Admin",
      instructor: "Instructor",
      vendor: "Vendor",
      mentor: "Mentor",
      student: "Student",
    };
    return names[sidebarName] || sidebarName;
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <span className="text-contentColor dark:text-contentColor-dark">Loading...</span>
      </div>
    );
  }

  if (settings.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-contentColor dark:text-contentColor-dark">
          No access control settings found.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="bg-lightGrey5 dark:bg-whiteColor-dark border-b-2 border-borderColor dark:border-borderColor-dark">
            {!scopeType && (
              <th className="px-5 py-3 font-semibold text-blackColor dark:text-blackColor-dark">
                Scope
              </th>
            )}
            {!scopeType && (
              <th className="px-5 py-3 font-semibold text-blackColor dark:text-blackColor-dark">
                Sidebar
              </th>
            )}
            <th className="px-5 py-3 font-semibold text-blackColor dark:text-blackColor-dark">
              Status
            </th>
            <th className="px-5 py-3 font-semibold text-blackColor dark:text-blackColor-dark">
              Toggle
            </th>
            {(onEdit || onDelete) && (
              <th className="px-5 py-3 font-semibold text-blackColor dark:text-blackColor-dark">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {settings.map((setting, idx) => (
            <tr
              key={setting.id}
              className={`
                leading-1.8 md:leading-1.8
                ${idx % 2 === 0
                  ? "bg-whiteColor dark:bg-whiteColor-dark"
                  : "bg-lightGrey5 dark:bg-whiteColor-dark"
                }
              `}
            >
              {!scopeType && (
                <td className="px-5 py-3 text-blackColor dark:text-blackColor-dark">
                  {getScopeDisplay(setting)}
                </td>
              )}
              {!scopeType && (
                <td className="px-5 py-3 text-blackColor dark:text-blackColor-dark">
                  {getSidebarDisplayName(setting.sidebar_name)}
                </td>
              )}
              <td className="px-5 py-3">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    setting.is_enabled
                      ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                      : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                  }`}
                >
                  {setting.is_enabled ? "Enabled" : "Disabled"}
                </span>
              </td>
              <td className="px-5 py-3">
                <ToggleSwitch
                  checked={setting.is_enabled}
                  onChange={() => handleToggle(setting)}
                  disabled={loading}
                />
              </td>
              {(onEdit || onDelete) && (
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(setting)}
                        className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        disabled={loading}
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(setting)}
                        className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                        disabled={loading}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SidebarAccessControlTable;
