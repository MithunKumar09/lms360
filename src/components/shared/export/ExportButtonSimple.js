"use client";

import { useState } from "react";
import { exportToCSV } from "@/lib/utils/export/csvExporter.js";

/**
 * ExportButtonSimple Component
 * 
 * Simple export button for client-side CSV export
 * 
 * @param {Object} props
 * @param {Array<Object>} props.data - Data array to export
 * @param {Array<Object>} props.headers - Header configuration [{ key, label, formatter? }]
 * @param {string} props.filename - Filename for export (without extension)
 * @param {Function} props.transform - Optional transformation function
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Button variant ('primary', 'secondary', 'outline')
 */
export default function ExportButtonSimple({
  data = [],
  headers = [],
  filename = "export",
  transform = null,
  className = "",
  variant = "primary",
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (isExporting || !data || data.length === 0) return;

    setIsExporting(true);

    try {
      exportToCSV(data, headers, filename, transform);
    } catch (error) {
      console.error("Export error:", error);
      alert(`Failed to export: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const variantClasses = {
    primary: "bg-primaryColor text-whiteColor hover:bg-primaryColor/90",
    secondary: "bg-gray-600 text-whiteColor hover:bg-gray-700",
    outline: "border-2 border-primaryColor text-primaryColor hover:bg-primaryColor/10",
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || !data || data.length === 0}
      className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${variantClasses[variant]} ${className}`}
    >
      {isExporting ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
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
          Export CSV
        </>
      )}
    </button>
  );
}
