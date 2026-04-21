/**
 * Course Skill Form Component
 */

"use client";

import { useState, useEffect } from "react";
import ButtonPrimary from "../buttons/ButtonPrimary";
import ToggleSwitch from "./ToggleSwitch";
import { useCourseSettingsStore } from "@/store/index.js";

const CourseSkillForm = ({
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  errors = {},
}) => {
  const { categories, subcategories, fetchCategories, fetchSubcategories } = useCourseSettingsStore();
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    subcategory_id: "",
    status: 1,
  });

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
  }, [fetchCategories, fetchSubcategories]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        category_id: initialData.category_id || "",
        subcategory_id: initialData.subcategory_id || "",
        status: initialData.status !== undefined ? initialData.status : 1,
      });
    }
  }, [initialData]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear subcategory if category changes
    if (field === "category_id") {
      setFormData((prev) => ({ ...prev, subcategory_id: "" }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      category_id: formData.category_id || null,
      subcategory_id: formData.subcategory_id || null,
    };
    onSubmit(submitData);
  };

  // Filter subcategories by selected category
  const filteredSubcategories = formData.category_id
    ? subcategories.filter((sub) => sub.category_id === formData.category_id)
    : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-3 block font-semibold text-blackColor dark:text-blackColor-dark">
          Skill Name <span className="text-red-500">*</span>
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
          placeholder="Enter skill name (e.g., JavaScript, React, Communication)"
          required
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <label className="mb-3 block font-semibold text-blackColor dark:text-blackColor-dark">
          Category (Optional)
        </label>
        <select
          value={formData.category_id}
          onChange={(e) => handleChange("category_id", e.target.value)}
          disabled={loading}
          className={`
            w-full py-10px px-5 text-sm focus:outline-none
            text-contentColor dark:text-contentColor-dark
            bg-whiteColor dark:bg-whiteColor-dark
            border-2 border-borderColor dark:border-borderColor-dark
            rounded-md
            ${loading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <option value="">None</option>
          {categories
            .filter((cat) => cat.status === 1)
            .map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="mb-3 block font-semibold text-blackColor dark:text-blackColor-dark">
          SubCategory (Optional)
        </label>
        <select
          value={formData.subcategory_id}
          onChange={(e) => handleChange("subcategory_id", e.target.value)}
          disabled={loading || !formData.category_id}
          className={`
            w-full py-10px px-5 text-sm focus:outline-none
            text-contentColor dark:text-contentColor-dark
            bg-whiteColor dark:bg-whiteColor-dark
            border-2 border-borderColor dark:border-borderColor-dark
            rounded-md
            ${loading || !formData.category_id ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <option value="">None</option>
          {filteredSubcategories
            .filter((sub) => sub.status === 1)
            .map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
        </select>
        {!formData.category_id && (
          <p className="text-xs text-gray-500 mt-1">Select a category first</p>
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
          {loading ? "Saving..." : initialData ? "Update Course Skill" : "Create Course Skill"}
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

export default CourseSkillForm;

