/**
 * Category Form Component
 */

"use client";

import { useState, useEffect } from "react";
import ButtonPrimary from "../buttons/ButtonPrimary";
import ImageUpload from "./ImageUpload";
import ToggleSwitch from "./ToggleSwitch";

const CategoryForm = ({
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  errors = {},
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    thumbnail_url: null,
    status: 1,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        thumbnail_url: initialData.thumbnail_url || null,
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
          Category Name <span className="text-red-500">*</span>
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
          placeholder="Enter category name"
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
          placeholder="Enter category description (optional)"
        />
        {errors.description && (
          <p className="text-red-500 text-xs mt-1">{errors.description}</p>
        )}
      </div>

      <ImageUpload
        value={formData.thumbnail_url}
        onChange={(url) => handleChange("thumbnail_url", url)}
        label="Category Thumbnail"
        disabled={loading}
        error={errors.thumbnail_url}
      />

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
          {loading ? "Saving..." : initialData ? "Update Category" : "Create Category"}
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

export default CategoryForm;

