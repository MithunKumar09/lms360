/**
 * SubCategory Form Component
 */

"use client";

import { useState, useEffect } from "react";
import ButtonPrimary from "../buttons/ButtonPrimary";
import ToggleSwitch from "./ToggleSwitch";
import { useCourseSettingsStore } from "@/store/index.js";

const SubCategoryForm = ({
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  errors = {},
}) => {
  const { categories, fetchCategories } = useCourseSettingsStore();
  const [formData, setFormData] = useState({
    category_id: "",
    name: "",
    description: "",
    status: 1,
  });

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        category_id: initialData.category_id || "",
        name: initialData.name || "",
        description: initialData.description || "",
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
          Parent Category <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.category_id}
          onChange={(e) => handleChange("category_id", e.target.value)}
          disabled={loading}
          className={`
            w-full py-10px px-5 text-sm focus:outline-none
            text-contentColor dark:text-contentColor-dark
            bg-whiteColor dark:bg-whiteColor-dark
            border-2 ${
              errors.category_id
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            }
            rounded-md
            ${loading ? "opacity-50 cursor-not-allowed" : ""}
          `}
          required
        >
          <option value="">Select a category</option>
          {categories
            .filter((cat) => cat.status === 1)
            .map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
        </select>
        {errors.category_id && (
          <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>
        )}
      </div>

      <div>
        <label className="mb-3 block font-semibold text-blackColor dark:text-blackColor-dark">
          SubCategory Name <span className="text-red-500">*</span>
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
          placeholder="Enter subcategory name"
          required
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <label className="mb-3 block font-semibold text-blackColor dark:text-blackColor-dark">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          disabled={loading}
          rows={4}
          className={`
            w-full py-10px px-5 text-sm focus:outline-none
            text-contentColor dark:text-contentColor-dark
            bg-whiteColor dark:bg-whiteColor-dark
            border-2 ${
              errors.description
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            }
            placeholder:text-placeholder placeholder:opacity-80
            leading-23px rounded-md
            ${loading ? "opacity-50 cursor-not-allowed" : ""}
          `}
          placeholder="Enter subcategory description (optional)"
        />
        {errors.description && (
          <p className="text-red-500 text-xs mt-1">{errors.description}</p>
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
          {loading ? "Saving..." : initialData ? "Update SubCategory" : "Create SubCategory"}
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

export default SubCategoryForm;

