/**
 * Course Level Form Component
 */

"use client";

import { useState, useEffect } from "react";
import ButtonPrimary from "../buttons/ButtonPrimary";
import ToggleSwitch from "./ToggleSwitch";

const CourseLevelForm = ({
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  errors = {},
}) => {
  const [formData, setFormData] = useState({
    name: "",
    status: 1,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        status: initialData.status !== undefined ? initialData.status : 1,
      });
    }
  }, [initialData]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-3 block font-semibold text-blackColor dark:text-blackColor-dark">
          Course Level Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          disabled={loading}
          className={`
            w-full py-10px px-5 text-sm focus:outline-none
            text-contentColor dark:text-contentColor-dark
            bg-whiteColor dark:bg-whiteColor-dark
            border-2 ${
              errors.name
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            }
            placeholder:text-placeholder placeholder:opacity-80
            leading-23px rounded-md
            ${loading ? "opacity-50 cursor-not-allowed" : ""}
          `}
          placeholder="Enter course level (e.g., Beginner, Intermediate, Advanced)"
          required
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <ToggleSwitch
          checked={formData.status === 1}
          onChange={() => handleChange("status", formData.status === 1 ? 0 : 1)}
          disabled={loading}
          label="Status (Active/Inactive)"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <ButtonPrimary type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update Course Level" : "Create Course Level"}
        </ButtonPrimary>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-md border-2 border-borderColor dark:border-borderColor-dark text-blackColor dark:text-blackColor-dark hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default CourseLevelForm;

