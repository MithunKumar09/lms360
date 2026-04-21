"use client";

import { useState } from "react";

/**
 * DateRangeFilter Component
 * 
 * Date range picker with preset options and custom range.
 * 
 * @param {Object} props
 * @param {Date} props.fromDate - Start date
 * @param {Date} props.toDate - End date
 * @param {Function} props.onChange - Callback when dates change ({ fromDate, toDate })
 * @param {string} props.className - Additional CSS classes
 */
export default function DateRangeFilter({
  fromDate = null,
  toDate = null,
  onChange,
  className = "",
}) {
  const [preset, setPreset] = useState("");

  const handlePresetChange = (presetValue) => {
    setPreset(presetValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newFromDate = null;
    let newToDate = null;

    switch (presetValue) {
      case "today":
        newFromDate = new Date(today);
        newToDate = new Date(today);
        newToDate.setHours(23, 59, 59, 999);
        break;
      case "this_week":
        const dayOfWeek = today.getDay();
        newFromDate = new Date(today);
        newFromDate.setDate(today.getDate() - dayOfWeek);
        newToDate = new Date(today);
        newToDate.setHours(23, 59, 59, 999);
        break;
      case "this_month":
        newFromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        newToDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        newToDate.setHours(23, 59, 59, 999);
        break;
      case "last_month":
        newFromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        newToDate = new Date(today.getFullYear(), today.getMonth(), 0);
        newToDate.setHours(23, 59, 59, 999);
        break;
      case "last_30_days":
        newFromDate = new Date(today);
        newFromDate.setDate(today.getDate() - 30);
        newToDate = new Date(today);
        newToDate.setHours(23, 59, 59, 999);
        break;
      case "custom":
        // Don't change dates, just allow manual selection
        break;
      default:
        newFromDate = null;
        newToDate = null;
    }

    if (onChange) {
      onChange({ fromDate: newFromDate, toDate: newToDate });
    }
  };

  const handleFromDateChange = (e) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    if (date) {
      date.setHours(0, 0, 0, 0);
    }
    setPreset("custom");
    if (onChange) {
      onChange({ fromDate: date, toDate });
    }
  };

  const handleToDateChange = (e) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    if (date) {
      date.setHours(23, 59, 59, 999);
    }
    setPreset("custom");
    if (onChange) {
      onChange({ fromDate, toDate: date });
    }
  };

  const formatDateForInput = (date) => {
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-10px ${className}`}>
      <select
        value={preset}
        onChange={(e) => handlePresetChange(e.target.value)}
        className="px-15px py-12px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark text-14px focus:outline-none focus:ring-2 focus:ring-primaryColor"
      >
        <option value="">Select Preset</option>
        <option value="today">Today</option>
        <option value="this_week">This Week</option>
        <option value="this_month">This Month</option>
        <option value="last_month">Last Month</option>
        <option value="last_30_days">Last 30 Days</option>
        <option value="custom">Custom Range</option>
      </select>

      <div className="flex gap-10px flex-1">
        <input
          type="date"
          value={formatDateForInput(fromDate)}
          onChange={handleFromDateChange}
          placeholder="From Date"
          className="flex-1 px-15px py-12px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark text-14px focus:outline-none focus:ring-2 focus:ring-primaryColor"
        />
        <input
          type="date"
          value={formatDateForInput(toDate)}
          onChange={handleToDateChange}
          placeholder="To Date"
          className="flex-1 px-15px py-12px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px focus:outline-none focus:ring-2 focus:ring-primaryColor"
        />
      </div>

      {(fromDate || toDate) && (
        <button
          onClick={() => {
            setPreset("");
            if (onChange) {
              onChange({ fromDate: null, toDate: null });
            }
          }}
          className="px-15px py-12px text-14px text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark transition-colors"
          type="button"
        >
          Clear
        </button>
      )}
    </div>
  );
}
