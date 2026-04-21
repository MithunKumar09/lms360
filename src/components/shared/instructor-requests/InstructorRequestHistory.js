"use client";

import { useState, useEffect } from "react";
import { useRolePromotionHistory } from "@/hooks/api/useRolePromotionHistory";
import useSweetAlert from "@/hooks/useSweetAlert";
import apiClient from "@/lib/api/client.js";

const InstructorRequestHistory = ({ page, setPage, filters, setFilters }) => {
  const createAlert = useSweetAlert();
  const [localFilters, setLocalFilters] = useState({
    search: filters?.search || "",
    start_date: "",
    end_date: "",
    user_id: "",
  });
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch history with filters
  const { data: historyData, isLoading, refetch } = useRolePromotionHistory(
    {
      page,
      limit: 20,
      start_date: localFilters.start_date || undefined,
      end_date: localFilters.end_date || undefined,
      user_id: localFilters.user_id || undefined,
    },
    { enabled: true }
  );

  // Handle search (client-side filtering for user names/emails)
  const filteredHistory = historyData?.history?.filter((item) => {
    if (!localFilters.search) return true;
    const searchLower = localFilters.search.toLowerCase();
    return (
      item.user?.email?.toLowerCase().includes(searchLower) ||
      item.user?.display_name?.toLowerCase().includes(searchLower) ||
      item.user?.first_name?.toLowerCase().includes(searchLower) ||
      item.user?.last_name?.toLowerCase().includes(searchLower) ||
      item.from_role?.toLowerCase().includes(searchLower) ||
      item.to_role?.toLowerCase().includes(searchLower) ||
      item.promotion_type?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const handleExport = async (format = "csv") => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("format", format);
      if (localFilters.start_date) params.append("start_date", localFilters.start_date);
      if (localFilters.end_date) params.append("end_date", localFilters.end_date);
      if (localFilters.user_id) params.append("user_id", localFilters.user_id);

      const response = await fetch(`/api/role-promotion-history/export?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Handle different response types
      const contentType = response.headers.get("content-type");
      let blob;
      let filename;

      if (contentType?.includes("application/json")) {
        const data = await response.json();
        blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        filename = `promotion-history-${Date.now()}.json`;
      } else if (contentType?.includes("spreadsheetml")) {
        blob = await response.blob();
        filename = `promotion-history-${Date.now()}.xlsx`;
      } else {
        blob = await response.blob();
        filename = `promotion-history-${Date.now()}.csv`;
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      createAlert("success", `History exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      createAlert("error", "Failed to export history");
    } finally {
      setExportLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const getRoleBadge = (role) => {
    const badges = {
      student: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      instructor: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      alumni: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return badges[role] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

  const getMfaBadge = (mfaMethod) => {
    if (!mfaMethod || mfaMethod === "none") return "None";
    return mfaMethod.toUpperCase();
  };

  return (
    <div className="w-full">
      {/* Filters and Export */}
      <div className="mb-6 p-4 bg-darkdeep3 dark:bg-darkdeep3-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name, email, role..."
              value={localFilters.search}
              onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
              className="w-full px-4 py-2 text-sm border-2 border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:border-primaryColor bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={localFilters.start_date}
              onChange={(e) => {
                setLocalFilters({ ...localFilters, start_date: e.target.value });
                setPage(1);
              }}
              className="w-full px-4 py-2 text-sm border-2 border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:border-primaryColor bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              End Date
            </label>
            <input
              type="date"
              value={localFilters.end_date}
              onChange={(e) => {
                setLocalFilters({ ...localFilters, end_date: e.target.value });
                setPage(1);
              }}
              className="w-full px-4 py-2 text-sm border-2 border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:border-primaryColor bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setLocalFilters({ search: "", start_date: "", end_date: "", user_id: "" });
                setPage(1);
                refetch();
              }}
              className="w-full px-4 py-2 text-sm border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep4 dark:hover:bg-darkdeep4 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={exportLoading || !historyData?.history?.length}
            className="px-4 py-2 text-sm bg-green-500 text-whiteColor rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <i className="icofont-download"></i>
            {exportLoading ? "Exporting..." : "Export CSV"}
          </button>
          <button
            type="button"
            onClick={() => handleExport("xlsx")}
            disabled={exportLoading || !historyData?.history?.length}
            className="px-4 py-2 text-sm bg-blue-500 text-whiteColor rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <i className="icofont-file-excel"></i>
            {exportLoading ? "Exporting..." : "Export XLSX"}
          </button>
          <button
            type="button"
            onClick={() => handleExport("json")}
            disabled={exportLoading || !historyData?.history?.length}
            className="px-4 py-2 text-sm bg-purple-500 text-whiteColor rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <i className="icofont-file-code"></i>
            {exportLoading ? "Exporting..." : "Export JSON"}
          </button>
        </div>
      </div>

      {/* History Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-contentColor dark:text-contentColor-dark">Loading history...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-12 bg-darkdeep3 dark:bg-darkdeep3-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            No history records found
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-whiteColor dark:bg-whiteColor-dark rounded-md overflow-hidden">
            <thead>
              <tr className="bg-darkdeep4 dark:bg-darkdeep4-dark border-b-2 border-borderColor dark:border-borderColor-dark">
                <th className="px-4 py-3 text-left text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  User
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  From Role
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  To Role
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  MFA Method
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Promoted By
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-borderColor dark:border-borderColor-dark hover:bg-darkdeep3 dark:hover:bg-darkdeep3-dark transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                        {item.user?.display_name || `${item.user?.first_name || ""} ${item.user?.last_name || ""}`.trim() || "N/A"}
                      </p>
                      <p className="text-xs text-contentColor dark:text-contentColor-dark">
                        {item.user?.email || "N/A"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(item.from_role)}`}>
                      {item.from_role || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(item.to_role)}`}>
                      {item.to_role || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-contentColor dark:text-contentColor-dark">
                      {item.promotion_type || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-contentColor dark:text-contentColor-dark">
                      {getMfaBadge(item.mfa_method)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-contentColor dark:text-contentColor-dark">
                        {item.promoted_by?.email || "N/A"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-contentColor dark:text-contentColor-dark">
                      {item.organization?.name || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-contentColor dark:text-contentColor-dark">
                      {formatDate(item.created_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {historyData?.pagination && historyData.pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-contentColor dark:text-contentColor-dark">
                Showing {((page - 1) * historyData.pagination.limit) + 1} to{" "}
                {Math.min(page * historyData.pagination.limit, historyData.pagination.total)} of{" "}
                {historyData.pagination.total} records
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm border border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep4 dark:hover:bg-darkdeep4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(historyData.pagination.totalPages, page + 1))}
                  disabled={page >= historyData.pagination.totalPages}
                  className="px-4 py-2 text-sm border border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep4 dark:hover:bg-darkdeep4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InstructorRequestHistory;
