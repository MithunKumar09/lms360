/**
 * Testimonial Form Component
 */

"use client";

import { useState, useEffect } from "react";
import ButtonPrimary from "../buttons/ButtonPrimary";
import ImageUpload from "./ImageUpload";
import ToggleSwitch from "./ToggleSwitch";

const TestimonialForm = ({
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  errors = {},
  courses = [], // Optional: pass courses list if available
}) => {
  const [formData, setFormData] = useState({
    student_name: "",
    photo_url: null,
    course_id: "",
    rating: 5,
    message: "",
    status: 1,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        student_name: initialData.student_name || "",
        photo_url: initialData.photo_url || null,
        course_id: initialData.course_id || "",
        rating: initialData.rating || 5,
        message: initialData.message || "",
        status: initialData.status !== undefined ? initialData.status : 1,
      });
    }
  }, [initialData]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      course_id: formData.course_id || null,
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-3 block font-semibold text-blackColor dark:text-blackColor-dark">
          Student Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.student_name}
          onChange={(e) => handleChange("student_name", e.target.value)}
          disabled={loading}
          className={`
            w-full py-10px px-5 text-sm focus:outline-none
            text-contentColor dark:text-contentColor-dark
            bg-whiteColor dark:bg-whiteColor-dark
            border-2 ${
              errors.student_name
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            }
            placeholder:text-placeholder placeholder:opacity-80
            leading-23px rounded-md
            ${loading ? "opacity-50 cursor-not-allowed" : ""}
          `}
          placeholder="Enter student name"
          required
        />
        {errors.student_name && (
          <p className="text-red-500 text-xs mt-1">{errors.student_name}</p>
        )}
      </div>

      <ImageUpload
        value={formData.photo_url}
        onChange={(url) => handleChange("photo_url", url)}
        label="Student Photo"
        uploadPath="/course-settings/testimonials/upload"
        disabled={loading}
        error={errors.photo_url}
      />

      {courses.length > 0 && (
        <div>
          <label className="mb-3 block font-semibold text-blackColor dark:text-blackColor-dark">
            Course (Optional)
          </label>
          <select
            value={formData.course_id}
            onChange={(e) => handleChange("course_id", e.target.value)}
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
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name || course.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-3 block font-semibold text-blackColor dark:text-blackColor-dark">
          Rating <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleChange("rating", star)}
              disabled={loading}
              className={`
                text-2xl focus:outline-none
                ${formData.rating >= star
                  ? "text-yellow-400"
                  : "text-gray-300 dark:text-gray-600"
                }
                ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-110"}
                transition-transform
              `}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-sm text-contentColor dark:text-contentColor-dark">
            ({formData.rating} / 5)
          </span>
        </div>
        {errors.rating && (
          <p className="text-red-500 text-xs mt-1">{errors.rating}</p>
        )}
      </div>

      <div>
        <label className="mb-3 block font-semibold text-blackColor dark:text-blackColor-dark">
          Testimonial Message <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => handleChange("message", e.target.value)}
          disabled={loading}
          rows={5}
          className={`
            w-full py-10px px-5 text-sm focus:outline-none
            text-contentColor dark:text-contentColor-dark
            bg-whiteColor dark:bg-whiteColor-dark
            border-2 ${
              errors.message
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            }
            placeholder:text-placeholder placeholder:opacity-80
            leading-23px rounded-md
            ${loading ? "opacity-50 cursor-not-allowed" : ""}
          `}
          placeholder="Enter testimonial message"
          required
        />
        {errors.message && (
          <p className="text-red-500 text-xs mt-1">{errors.message}</p>
        )}
      </div>

      <div>
        <ToggleSwitch
          checked={formData.status === 1}
          onChange={() => handleChange("status", formData.status === 1 ? 0 : 1)}
          disabled={loading}
          label="Status (Active/Hidden)"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <ButtonPrimary type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update Testimonial" : "Create Testimonial"}
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

export default TestimonialForm;

