"use client";

import React from "react";

/**
 * CapacityProgressBar Component
 * 
 * Displays an animated progress bar with color-coded status
 * 
 * @param {Object} props
 * @param {number} props.current - Current registrations/applications
 * @param {number} props.capacity - Total capacity
 * @param {number|null} props.percentage - Capacity percentage (0-100)
 * @param {string} props.status - Status: 'available', 'warning', 'critical', 'full'
 * @param {number} props.height - Height of progress bar in pixels (default: 8)
 * @param {boolean} props.animated - Whether to animate the progress bar (default: true)
 */
const CapacityProgressBar = ({
  current,
  capacity,
  percentage,
  status = "available",
  height = 8,
  animated = true,
}) => {
  // Calculate percentage if not provided
  const calculatedPercentage = percentage !== null 
    ? percentage 
    : capacity 
      ? Math.round((current / capacity) * 100) 
      : 0;

  // Determine color based on status
  const getColor = () => {
    switch (status) {
      case "full":
        return "bg-red-500";
      case "critical":
        return "bg-orange-500";
      case "warning":
        return "bg-yellow-500";
      default:
        return "bg-green-500";
    }
  };

  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.min(Math.max(calculatedPercentage, 0), 100);

  return (
    <div className="w-full">
      <div
        className="w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
        role="progressbar"
        aria-valuenow={clampedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Capacity: ${clampedPercentage}%`}
      >
        <div
          className={`h-full rounded-full ${getColor()} ${
            animated ? "transition-all duration-500 ease-out" : ""
          }`}
          style={{
            width: `${clampedPercentage}%`,
          }}
          title={`${clampedPercentage}% capacity used`}
        />
      </div>
    </div>
  );
};

export default CapacityProgressBar;
