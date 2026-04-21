"use client";

import React from "react";
import CapacityProgressBar from "./CapacityProgressBar";

/**
 * CapacityIndicator Component
 * 
 * Displays capacity information with visual indicators
 * 
 * @param {Object} props
 * @param {number|null} props.capacity - Total capacity
 * @param {number} props.current - Current registrations/applications
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showProgressBar - Whether to show progress bar
 * @param {boolean} props.showBadge - Whether to show status badge
 * @param {string} props.label - Custom label (default: "Registrations")
 */
const CapacityIndicator = ({
  capacity,
  current,
  className = "",
  showProgressBar = true,
  showBadge = true,
  label = "Registrations",
}) => {
  // Calculate metrics
  const available = capacity ? capacity - current : null;
  const percentage = capacity ? Math.round((current / capacity) * 100) : null;

  // Determine status
  let status = "available";
  let statusText = "Available";
  let statusColor = "green";

  if (percentage !== null) {
    if (percentage >= 100) {
      status = "full";
      statusText = "Full";
      statusColor = "red";
    } else if (percentage >= 90) {
      status = "critical";
      statusText = "Critical";
      statusColor = "orange";
    } else if (percentage >= 80) {
      status = "warning";
      statusText = "Warning";
      statusColor = "yellow";
    }
  }

  return (
    <div className={`capacity-indicator ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-blackColor dark:text-whiteColor">
          {label}
        </span>
        {showBadge && (
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              status === "full"
                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                : status === "critical"
                ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                : status === "warning"
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            }`}
          >
            {statusText}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-bold text-primaryColor">
          {current}
          {capacity && ` / ${capacity}`}
        </span>
        {percentage !== null && (
          <span className="text-sm text-contentColor dark:text-contentColor-dark">
            {percentage}% full
          </span>
        )}
      </div>

      {showProgressBar && capacity && (
        <CapacityProgressBar
          current={current}
          capacity={capacity}
          percentage={percentage}
          status={status}
        />
      )}

      {available !== null && (
        <p className="text-xs text-contentColor dark:text-contentColor-dark mt-2">
          {available} {available === 1 ? "slot" : "slots"} available
        </p>
      )}
    </div>
  );
};

export default CapacityIndicator;
