"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import ImagePicker from "@/components/shared/forms/ImagePicker.js";
import { 
  FiCalendar, 
  FiClock, 
  FiMapPin, 
  FiLink, 
  FiDollarSign, 
  FiUsers, 
  FiImage, 
  FiFileText,
  FiType,
  FiGlobe,
  FiSave,
  FiX,
  FiLoader,
  FiZap
} from "react-icons/fi";

export default function BrandEventProposal({ mode = 'create', eventId = null, initialData = null, onComplete = null }) {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const isEditMode = mode === 'edit';
  
  // Initialize form data from initialData if in edit mode
  const getInitialFormData = () => {
    if (isEditMode && initialData) {
      return {
        title: initialData.title || "",
        description: initialData.description || "",
        banner_url: initialData.banner_url || "",
        event_type: initialData.event_type || "seminar",
        start_date: initialData.start_date || "",
        start_time: initialData.start_time || "",
        end_date: initialData.end_date || "",
        end_time: initialData.end_time || "",
        mode: initialData.mode || "online",
        external_link: initialData.external_link || "",
        is_free: initialData.is_free !== false,
        price: initialData.price || "",
        capacity: initialData.capacity || "",
        status: initialData.status || "draft",
      };
    }
    return {
      title: "",
      description: "",
      banner_url: "",
      event_type: "seminar",
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
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
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

    if (!formData.description || formData.description.trim().length < 10) {
      newErrors.description = "Description is required and must be at least 10 characters";
    }

    if (!formData.event_type) {
      newErrors.event_type = "Event type is required";
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

    // Validate date order
    if (formData.start_date && formData.end_date) {
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);
      if (endDateTime <= startDateTime) {
        newErrors.end_date = "End date/time must be after start date/time";
      }
    }

    if (formData.mode === "online" && !formData.external_link) {
      newErrors.external_link = "External link is required for online events";
    }

    if (formData.is_free === false) {
      if (!formData.price || parseFloat(formData.price) < 0) {
        newErrors.price = "Price is required and must be >= 0 for paid events";
      }
    }

    if (formData.capacity && parseInt(formData.capacity, 10) <= 0) {
      newErrors.capacity = "Capacity must be greater than 0 if provided";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createEventMutation = useMutation({
    mutationFn: async (data) => {
      if (isEditMode && eventId) {
        const response = await apiClient.put(`/brand/events/${eventId}`, data);
        if (!response.success) {
          throw new Error(response.error || 'Failed to update event');
        }
        return response;
      } else {
        const response = await apiClient.post('/brand/events', data);
        if (!response.success) {
          throw new Error(response.error || 'Failed to create event');
        }
        return response;
      }
    },
    onSuccess: (data) => {
      if (isEditMode) {
        createAlert('success', 'Event updated successfully!');
        if (onComplete) {
          onComplete();
        } else {
          router.push(`/dashboards/brand-events/${eventId}`);
        }
      } else {
        createAlert('success', 'Event proposal created successfully! You can submit it for approval from the events list.');
        router.push('/dashboards/brand-events');
      }
    },
    onError: (error) => {
      console.error(isEditMode ? 'Update event error:' : 'Create event error:', error);
      createAlert('error', error.message || (isEditMode ? 'Failed to update event' : 'Failed to create event proposal'));
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        start_date: `${formData.start_date}T${formData.start_time}`,
        end_date: `${formData.end_date}T${formData.end_time}`,
      };
      delete submitData.start_time;
      delete submitData.end_time;

      await createEventMutation.mutateAsync(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const eventTypes = [
    { value: 'seminar', label: 'Seminar' },
    { value: 'hackathon', label: 'Hackathon' },
    { value: 'challenge', label: 'Challenge' },
    { value: 'competition', label: 'Competition' },
    { value: 'awareness_campaign', label: 'Awareness Campaign' },
  ];

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="mb-6 pb-6 border-b-2 border-borderColor dark:border-borderColor-dark">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
            <FiZap className="text-whiteColor dark:text-whiteColor-dark" size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-blackColor dark:text-blackColor-dark mb-1">
              {isEditMode ? 'Edit Event' : 'Propose New Event'}
            </h1>
            <p className="text-sm text-contentColor dark:text-contentColor-dark">
              {isEditMode 
                ? 'Update your event details. Changes will be saved immediately.'
                : 'Create an event proposal. After creation, you can submit it for Super Admin approval.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-lg border border-borderColor dark:border-borderColor-dark overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Event Basic Information */}
          <div className="p-6 border-b border-borderColor dark:border-borderColor-dark bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10">
            <div className="flex items-center gap-2 mb-4">
              <FiFileText className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Event Information
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiFileText size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    errors.title 
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                      : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                  } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark`}
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Enter event title"
                  disabled={isSubmitting}
                />
                {errors.title && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.title}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiType size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Event Type <span className="text-red-500">*</span>
                </label>
                <select
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    errors.event_type 
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                      : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                  } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark`}
                  value={formData.event_type}
                  onChange={(e) => handleChange('event_type', e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Select event type</option>
                  {eventTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.event_type && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.event_type}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiImage size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Banner Image
                </label>
                <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 border border-borderColor dark:border-borderColor-dark">
                  <ImagePicker
                    value={formData.banner_url}
                    onChange={(url) => handleChange('banner_url', url)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiFileText size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    errors.description 
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                      : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                  } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark resize-none`}
                  rows="5"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Provide a detailed description of the event"
                  disabled={isSubmitting}
                />
                {errors.description && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Date & Time Section */}
          <div className="p-6 border-b border-borderColor dark:border-borderColor-dark">
            <div className="flex items-center gap-2 mb-4">
              <FiCalendar className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Date & Time
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiCalendar size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    errors.start_date 
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                      : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                  } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark`}
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.start_date && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.start_date}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiClock size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    errors.start_time 
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                      : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                  } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark`}
                  value={formData.start_time}
                  onChange={(e) => handleChange('start_time', e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.start_time && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.start_time}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiCalendar size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    errors.end_date 
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                      : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                  } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark`}
                  value={formData.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.end_date && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.end_date}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiClock size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    errors.end_time 
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                      : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                  } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark`}
                  value={formData.end_time}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.end_time && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.end_time}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Event Details Section */}
          <div className="p-6 border-b border-borderColor dark:border-borderColor-dark bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10">
            <div className="flex items-center gap-2 mb-4">
              <FiMapPin className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Event Details
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiGlobe size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Mode <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 transition-all duration-200 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                  value={formData.mode}
                  onChange={(e) => handleChange('mode', e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              {formData.mode === "online" && (
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                    <FiLink size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                    External Link <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                      errors.external_link 
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                        : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                    } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark`}
                    value={formData.external_link}
                    onChange={(e) => handleChange('external_link', e.target.value)}
                    placeholder="https://..."
                    disabled={isSubmitting}
                  />
                  {errors.external_link && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <span>•</span> {errors.external_link}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiUsers size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Capacity
                </label>
                <input
                  type="number"
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    errors.capacity 
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                      : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                  } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark`}
                  value={formData.capacity}
                  onChange={(e) => handleChange('capacity', e.target.value)}
                  min="1"
                  placeholder="Maximum attendees"
                  disabled={isSubmitting}
                />
                {errors.capacity && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.capacity}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiDollarSign className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Pricing
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-borderColor dark:border-borderColor-dark w-full">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-borderColor dark:border-borderColor-dark text-primaryColor focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 cursor-pointer"
                    checked={formData.is_free}
                    onChange={(e) => handleChange('is_free', e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <label className="text-sm font-semibold text-blackColor dark:text-blackColor-dark cursor-pointer flex-1">
                    Free Event
                  </label>
                </div>
              </div>

              {!formData.is_free && (
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                    <FiDollarSign size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                    Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                      errors.price 
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                        : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                    } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark`}
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    disabled={isSubmitting}
                  />
                  {errors.price && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <span>•</span> {errors.price}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 bg-gray-50 dark:bg-gray-900/30 border-t border-borderColor dark:border-borderColor-dark">
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                className="w-full sm:w-auto px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-blackColor dark:text-blackColor-dark font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  if (isEditMode && onComplete) {
                    onComplete();
                  } else {
                    router.push('/dashboards/brand-events');
                  }
                }}
                disabled={isSubmitting}
              >
                <FiX size={18} />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-primaryColor hover:bg-primaryColor/90 dark:bg-primaryColor-dark dark:hover:bg-primaryColor-dark/90 text-whiteColor dark:text-whiteColor-dark font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || createEventMutation.isPending}
              >
                {isSubmitting || createEventMutation.isPending ? (
                  <>
                    <FiLoader className="animate-spin" size={18} />
                    <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <FiSave size={18} />
                    <span>{isEditMode ? 'Update Event' : 'Create Proposal'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
