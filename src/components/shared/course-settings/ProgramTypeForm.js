/**
 * Program Type Form Component
 */

"use client";

import { useState, useEffect } from "react";
import ButtonPrimary from "../buttons/ButtonPrimary";
import ToggleSwitch from "./ToggleSwitch";

const ProgramTypeForm = ({
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  errors = {},
}) => {
  const [formData, setFormData] = useState({
    name: "",
    icon: "",
    color: "",
    status: 1,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        icon: initialData.icon || "",
        color: initialData.color || "",
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
          Program Type Name <span className="text-red-500">*</span>
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
          placeholder="Enter program type name (e.g., Academic, Workshop)"
          required
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <label className="mb-3 block font-semibold text-blackColor dark:text-blackColor-dark">
          Icon (Optional)
        </label>
        <input
          type="text"
          value={formData.icon}
          onChange={(e) => handleChange("icon", e.target.value)}
          disabled={loading}
          className={`
            w-full py-10px px-5 text-sm focus:outline-none
            text-contentColor dark:text-contentColor-dark
            bg-whiteColor dark:bg-whiteColor-dark
            border-2 border-borderColor dark:border-borderColor-dark
            placeholder:text-placeholder placeholder:opacity-80
            leading-23px rounded-md
            ${loading ? "opacity-50 cursor-not-allowed" : ""}
          `}
          placeholder="Icon class or name (e.g., icofont-book)"
        />
      </div>

      <div>
        <label className="mb-3 block font-semibold text-blackColor dark:text-blackColor-dark">
          Color (Optional)
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={formData.color || "#5f2ded"}
            onChange={(e) => handleChange("color", e.target.value)}
            disabled={loading}
            className="w-16 h-10 rounded cursor-pointer"
          />
          <input
            type="text"
            value={formData.color}
            onChange={(e) => handleChange("color", e.target.value)}
            disabled={loading}
            className={`
              flex-1 py-10px px-5 text-sm focus:outline-none
              text-contentColor dark:text-contentColor-dark
              bg-whiteColor dark:bg-whiteColor-dark
              border-2 border-borderColor dark:border-borderColor-dark
              placeholder:text-placeholder placeholder:opacity-80
              leading-23px rounded-md
              ${loading ? "opacity-50 cursor-not-allowed" : ""}
            `}
            placeholder="#5f2ded"
            pattern="^#[0-9A-Fa-f]{6}$"
          />
        </div>
        {errors.color && (
          <p className="text-red-500 text-xs mt-1">{errors.color}</p>
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
          {loading ? "Saving..." : initialData ? "Update Program Type" : "Create Program Type"}
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

export default ProgramTypeForm;

