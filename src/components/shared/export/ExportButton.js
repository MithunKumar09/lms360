"use client";

import { useState } from "react";
import { buildFilterParams } from "@/lib/api/filters";

/**
 * ExportButton Component
 * 
 * Reusable export button for vendor dashboard pages.
 * Supports CSV and XLSX formats.
 * 
 * @param {Object} props
 * @param {string} props.endpoint - Export API endpoint
 * @param {Object} props.filters - Current filter state
 * @param {string} props.filenamePrefix - Filename prefix for export
 * @param {string} props.defaultFormat - Default format (csv or xlsx)
 * @param {string} props.className - Additional CSS classes
 */
export default function ExportButton({
  endpoint,
  filters = {},
  filenamePrefix = "export",
  defaultFormat = "csv",
  className = "",
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState(defaultFormat);

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);

    try {
      // Build query params from filters
      const params = buildFilterParams(filters);
      params.format = format;

      const queryString = new URLSearchParams(params).toString();
      const url = `${endpoint}?${queryString}`;

      // Fetch export data
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${filenamePrefix}-${new Date().toISOString().split("T")[0]}.${format}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Get blob
      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Export error:", error);
      alert(`Failed to export: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex items-center gap-10px ${className}`}>
      <select
        value={format}
        onChange={(e) => setFormat(e.target.value)}
        disabled={isExporting}
        className="px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark text-14px focus:outline-none focus:ring-2 focus:ring-primaryColor"
      >
        <option value="csv">CSV</option>
        <option value="xlsx">XLSX</option>
      </select>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="px-20px py-10px bg-primaryColor text-whiteColor rounded-5 text-14px font-semibold hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-8px"
      >
        {isExporting ? (
          <>
            <svg
              className="animate-spin h-16px w-16px"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export
          </>
        )}
      </button>
    </div>
  );
}
