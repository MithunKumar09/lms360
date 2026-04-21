"use client";

import { useState } from "react";
import { useRolePromotionHistory } from "@/hooks/api/useRolePromotionHistory";
import useSweetAlert from "@/hooks/useSweetAlert";

const InstructorRequestReports = () => {
  const createAlert = useSweetAlert();
  const [selectedReport, setSelectedReport] = useState(null);
  const [expandedReports, setExpandedReports] = useState(new Set());

  // Fetch all accepted promotions (reports)
  const { data: historyData, isLoading } = useRolePromotionHistory(
    {
      page: 1,
      limit: 100, // Get more records for reports
    },
    { enabled: true }
  );

  // Filter only accepted promotions (these have user_data_backup)
  const reports = historyData?.history?.filter((item) => item.user_data_backup) || [];

  const toggleReport = (reportId) => {
    const newExpanded = new Set(expandedReports);
    if (newExpanded.has(reportId)) {
      newExpanded.delete(reportId);
    } else {
      newExpanded.add(reportId);
    }
    setExpandedReports(newExpanded);
  };

  const handleExportReport = (report) => {
    try {
      const exportData = {
        report_id: report.id,
        user: report.user,
        promotion_details: {
          from_role: report.from_role,
          to_role: report.to_role,
          promotion_type: report.promotion_type,
          promoted_by: report.promoted_by,
          mfa_method: report.mfa_method,
          created_at: report.created_at,
        },
        user_data_backup: report.user_data_backup,
        exported_at: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-backup-${report.user?.email || report.id}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      createAlert("success", "Report exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      createAlert("error", "Failed to export report");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const renderBackupData = (backupData) => {
    if (!backupData) return <p className="text-sm text-contentColor dark:text-contentColor-dark">No backup data available</p>;

    return (
      <div className="mt-4 space-y-2">
        <div className="bg-darkdeep3 dark:bg-darkdeep3-dark p-4 rounded-md border border-borderColor dark:border-borderColor-dark">
          <pre className="text-xs text-contentColor dark:text-contentColor-dark overflow-x-auto">
            {JSON.stringify(backupData, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading reports...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 bg-darkdeep3 dark:bg-darkdeep3-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
        <i className="icofont-file-alt text-5xl text-contentColor dark:text-contentColor-dark mb-4"></i>
        <p className="text-contentColor dark:text-contentColor-dark text-lg font-semibold mb-2">
          No Reports Available
        </p>
        <p className="text-contentColor dark:text-contentColor-dark">
          Reports will appear here after instructor requests are accepted
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 p-4 bg-primaryColor/10 dark:bg-primaryColor/20 rounded-md border-2 border-primaryColor/30">
        <div className="flex items-center gap-3 mb-2">
          <i className="icofont-info-circle text-primaryColor text-2xl"></i>
          <h3 className="text-lg font-bold text-blackColor dark:text-blackColor-dark">
            User Data Backup Reports
          </h3>
        </div>
        <p className="text-sm text-contentColor dark:text-contentColor-dark">
          Complete user data backups from accepted instructor promotions. These reports contain a full snapshot of user data at the time of promotion.
        </p>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.map((report) => {
          const isExpanded = expandedReports.has(report.id);
          return (
            <div
              key={report.id}
              className="bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark overflow-hidden"
            >
              {/* Report Header */}
              <div className="p-4 bg-darkdeep4 dark:bg-darkdeep4-dark">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <i className="icofont-user text-primaryColor text-xl"></i>
                      <div>
                        <h4 className="text-lg font-bold text-blackColor dark:text-blackColor-dark">
                          {report.user?.display_name || `${report.user?.first_name || ""} ${report.user?.last_name || ""}`.trim() || "Unknown User"}
                        </h4>
                        <p className="text-sm text-contentColor dark:text-contentColor-dark">
                          {report.user?.email || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-contentColor dark:text-contentColor-dark">From Role</p>
                        <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                          {report.from_role || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-contentColor dark:text-contentColor-dark">To Role</p>
                        <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                          {report.to_role || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-contentColor dark:text-contentColor-dark">Promoted By</p>
                        <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                          {report.promoted_by?.email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-contentColor dark:text-contentColor-dark">Date</p>
                        <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                          {formatDate(report.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => toggleReport(report.id)}
                      className="px-4 py-2 text-sm border border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep3 dark:hover:bg-darkdeep3 transition-colors flex items-center gap-2"
                    >
                      <i className={`icofont-${isExpanded ? "up" : "down"}-arrow`}></i>
                      {isExpanded ? "Hide" : "View"} Backup
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportReport(report)}
                      className="px-4 py-2 text-sm bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90 transition-colors flex items-center gap-2"
                    >
                      <i className="icofont-download"></i>
                      Export
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Backup Data */}
              {isExpanded && (
                <div className="p-4 border-t border-borderColor dark:border-borderColor-dark">
                  <div className="mb-4">
                    <h5 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                      User Data Backup (JSON)
                    </h5>
                    <p className="text-xs text-contentColor dark:text-contentColor-dark mb-3">
                      Complete snapshot of user data at the time of promotion
                    </p>
                    {renderBackupData(report.user_data_backup)}
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 pt-4 border-t border-borderColor dark:border-borderColor-dark">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-contentColor dark:text-contentColor-dark">MFA Method</p>
                        <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                          {report.mfa_method || "None"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-contentColor dark:text-contentColor-dark">Promotion Type</p>
                        <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                          {report.promotion_type || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-contentColor dark:text-contentColor-dark">Organization</p>
                        <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                          {report.organization?.name || "N/A"}
                        </p>
                      </div>
                    </div>
                    {report.notes && (
                      <div className="mt-4">
                        <p className="text-xs text-contentColor dark:text-contentColor-dark">Notes</p>
                        <p className="text-sm text-contentColor dark:text-contentColor-dark">
                          {report.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-darkdeep3 dark:bg-darkdeep3-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Total Reports: {reports.length}
            </p>
            <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
              Each report contains a complete backup of user data from accepted promotions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorRequestReports;
