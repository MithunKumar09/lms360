"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import ImagePicker from "@/components/shared/forms/ImagePicker.js";

export default function MentorAddWorkshopMain() {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    banner_url: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    mode: "online",
    external_link: "",
    is_free: true,
    price: "",
    capacity: "",
    status: "draft",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title || formData.title.trim().length < 3) {
      newErrors.title = "Title is required and must be at least 3 characters";
    }

    if (!formData.start_date) {
      newErrors.start_date = "Start date is required";
    }

    if (!formData.start_time) {
      newErrors.start_time = "Start time is required";
    }

    if (!formData.end_date) {
      newErrors.end_date = "End date is required";
    }

    if (!formData.end_time) {
      newErrors.end_time = "End time is required";
    }

    if (formData.start_date && formData.end_date) {
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);
      if (endDateTime <= startDateTime) {
        newErrors.end_date = "End date/time must be after start date/time";
      }
    }

    if (formData.mode === "online" && !formData.external_link) {
      newErrors.external_link = "External link is required for online workshops";
    }

    if (formData.is_free === false) {
      if (!formData.price || parseFloat(formData.price) < 0) {
        newErrors.price = "Price is required and must be >= 0 for paid workshops";
      }
    }

    if (formData.capacity && parseInt(formData.capacity, 10) <= 0) {
      newErrors.capacity = "Capacity must be greater than 0 if provided";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createWorkshopMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post("/workshops", data);
      if (!response.success) {
        throw new Error(response.error || "Failed to create workshop");
      }
      return response;
    },
    onSuccess: () => {
      createAlert("success", "Workshop created successfully!");
      router.push("/dashboards/mentor-manage-workshops");
    },
    onError: (error) => {
      console.error("Create workshop error:", error);
      createAlert("error", error.message || "Failed to create workshop");
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) {
      createAlert("error", "Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);

    const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`).toISOString();
    const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`).toISOString();

    const payload = {
      title: formData.title.trim(),
      description: formData.description?.trim() || null,
      banner_url: formData.banner_url || null,
      start_date: startDateTime,
      end_date: endDateTime,
      mode: formData.mode,
      external_link: formData.mode === "online" ? formData.external_link : null,
      is_free: formData.is_free,
      price: formData.is_free === false ? parseFloat(formData.price) : null,
      capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
      status: formData.status,
    };

    try {
      await createWorkshopMutation.mutateAsync(payload);
    } catch (error) {
      // Error handled in mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return "";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="w-full">
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Add Workshop</h1>
              <p className="text-muted mb-0 small">
                Create a new workshop
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark p-6">
          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Enter workshop title"
              className={`w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                errors.title ? "border-red-500 dark:border-red-500" : "border-borderColor dark:border-borderColor-dark"
              } rounded-md`}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Enter workshop description"
              rows={4}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Banner Image
            </label>
            <ImagePicker
              value={formData.banner_url}
              onChange={(url) => handleChange("banner_url", url)}
              label="Workshop Banner"
              name="banner_url"
              keyPrefix="workshops/banners"
              error={errors.banner_url}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleChange("start_date", e.target.value)}
                className={`w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                  errors.start_date ? "border-red-500 dark:border-red-500" : "border-borderColor dark:border-borderColor-dark"
                } rounded-md`}
              />
              {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => handleChange("start_time", e.target.value)}
                className={`w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                  errors.start_time ? "border-red-500 dark:border-red-500" : "border-borderColor dark:border-borderColor-dark"
                } rounded-md`}
              />
              {errors.start_time && <p className="text-red-500 text-xs mt-1">{errors.start_time}</p>}
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleChange("end_date", e.target.value)}
                min={formData.start_date || undefined}
                className={`w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                  errors.end_date ? "border-red-500 dark:border-red-500" : "border-borderColor dark:border-borderColor-dark"
                } rounded-md`}
              />
              {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => handleChange("end_time", e.target.value)}
                className={`w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                  errors.end_time ? "border-red-500 dark:border-red-500" : "border-borderColor dark:border-borderColor-dark"
                } rounded-md`}
              />
              {errors.end_time && <p className="text-red-500 text-xs mt-1">{errors.end_time}</p>}
            </div>
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.mode}
              onChange={(e) => handleChange("mode", e.target.value)}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="live">Live</option>
            </select>
          </div>

          {formData.mode === "online" && (
            <div className="mb-4">
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                External Link (Zoom/Meet/YouTube) <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={formData.external_link}
                onChange={(e) => handleChange("external_link", e.target.value)}
                placeholder="https://zoom.us/j/..."
                className={`w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                  errors.external_link ? "border-red-500 dark:border-red-500" : "border-borderColor dark:border-borderColor-dark"
                } rounded-md`}
              />
              {errors.external_link && <p className="text-red-500 text-xs mt-1">{errors.external_link}</p>}
            </div>
          )}

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_free}
                onChange={(e) => handleChange("is_free", e.target.checked)}
                className="w-4 h-4 text-primaryColor border-borderColor rounded focus:ring-primaryColor"
              />
              <span className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Free Workshop
              </span>
            </label>
          </div>

          {!formData.is_free && (
            <div className="mb-4">
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Price (INR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={`w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                  errors.price ? "border-red-500 dark:border-red-500" : "border-borderColor dark:border-borderColor-dark"
                } rounded-md`}
              />
              {formData.price && (
                <p className="text-sm text-contentColor dark:text-contentColor-dark mt-1">
                  {formatPrice(parseFloat(formData.price))}
                </p>
              )}
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
            </div>
          )}

          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Capacity (leave empty for unlimited)
            </label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => handleChange("capacity", e.target.value)}
              placeholder="e.g., 100"
              min="1"
              className={`w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                errors.capacity ? "border-red-500 dark:border-red-500" : "border-borderColor dark:border-borderColor-dark"
              } rounded-md`}
            />
            {errors.capacity && <p className="text-red-500 text-xs mt-1">{errors.capacity}</p>}
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep3 dark:hover:bg-darkdeep3-dark transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Workshop"}
          </button>
        </div>
      </form>
    </div>
  );
}

