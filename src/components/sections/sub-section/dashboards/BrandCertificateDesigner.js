"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import ImagePicker from "@/components/shared/forms/ImagePicker.js";
import BrandCertificatePreview from "./BrandCertificatePreview.js";
import { 
  FiAward, 
  FiFileText, 
  FiImage, 
  FiLayout, 
  FiDroplet, 
  FiType, 
  FiCheckSquare,
  FiSave,
  FiX,
  FiLoader,
  FiSettings,
  FiTarget,
  FiSliders
} from "react-icons/fi";

export default function BrandCertificateDesigner({ certificateId = null }) {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isEditMode = !!certificateId;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_design: {
      logo_url: "",
      background_color: "#ffffff",
      text_color: "#000000",
      border_color: "#000000",
      border_width: 2,
      font_family: "Arial",
      title_font_size: 24,
      body_font_size: 16,
      layout: "landscape", // landscape or portrait
    },
    criteria: {
      course_completion: false,
      quiz_score_min: null,
      assignment_submission: false,
    },
    auto_issue: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

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

    if (!formData.name || formData.name.trim().length < 3) {
      newErrors.name = "Certificate name is required and must be at least 3 characters";
    }

    if (!formData.template_design.logo_url) {
      newErrors.logo_url = "Brand logo is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createCertificateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/brand/certificates', data);
      if (!response.success) {
        // Provide user-friendly error messages
        let errorMessage = response.error || 'Failed to create certificate template';
        
        // Handle migration-related errors with a more user-friendly message
        if (response.requiresMigration || 
            errorMessage.includes('migration') || 
            errorMessage.includes('not available') ||
            response.status === 503) {
          errorMessage = 'Certificate feature is currently unavailable. Please contact your administrator to set up the required database tables.';
        }
        
        throw new Error(errorMessage);
      }
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['brandCertificates'] });
      createAlert('success', 'Certificate template created successfully!');
      router.push('/dashboards/brand-certificates');
    },
    onError: (error) => {
      // Only log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Create certificate error:', error);
      }
      createAlert('error', error.message || 'Failed to create certificate template');
    },
  });

  const updateCertificateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put(`/brand/certificates/${certificateId}`, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update certificate template');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandCertificates'] });
      createAlert('success', 'Certificate template updated successfully!');
      router.push('/dashboards/brand-certificates');
    },
    onError: (error) => {
      // Only log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Update certificate error:', error);
      }
      createAlert('error', error.message || 'Failed to update certificate template');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await updateCertificateMutation.mutateAsync(formData);
      } else {
        await createCertificateMutation.mutateAsync(formData);
      }
    } catch (error) {
      // Error is already handled by onError handler in the mutation
      // This catch prevents the error from being unhandled
      // The onError handler will show the alert to the user
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="mb-6 pb-6 border-b-2 border-borderColor dark:border-borderColor-dark">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-md">
            <FiAward className="text-whiteColor dark:text-whiteColor-dark" size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-blackColor dark:text-blackColor-dark mb-1">
              {isEditMode ? 'Edit Certificate Template' : 'Create Certificate Template'}
            </h1>
            <p className="text-sm text-contentColor dark:text-contentColor-dark">
              Design a certificate template with your brand logo and customize the appearance.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-lg border border-borderColor dark:border-borderColor-dark overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Basic Information Section */}
          <div className="p-6 border-b border-borderColor dark:border-borderColor-dark bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10">
            <div className="flex items-center gap-2 mb-4">
              <FiFileText className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Basic Information
              </h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiAward size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Certificate Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    errors.name 
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                      : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                  } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark`}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Course Completion Certificate"
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiFileText size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Description
                </label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-lg border border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 transition-all duration-200 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark resize-none"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe this certificate template"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Design Settings Section */}
          <div className="p-6 border-b border-borderColor dark:border-borderColor-dark">
            <div className="flex items-center gap-2 mb-4">
              <FiSliders className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Design Settings
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiImage size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Brand Logo <span className="text-red-500">*</span>
                </label>
                <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 border border-borderColor dark:border-borderColor-dark">
                  <ImagePicker
                    value={formData.template_design.logo_url}
                    onChange={(url) => handleChange('template_design.logo_url', url)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.logo_url && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.logo_url}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiLayout size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Layout
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 transition-all duration-200 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                  value={formData.template_design.layout}
                  onChange={(e) => handleChange('template_design.layout', e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                    <FiDroplet size={14} className="text-primaryColor dark:text-primaryColor-dark" />
                    Background
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-full h-12 rounded-lg border border-borderColor dark:border-borderColor-dark cursor-pointer"
                      value={formData.template_design.background_color}
                      onChange={(e) => handleChange('template_design.background_color', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                    <FiDroplet size={14} className="text-primaryColor dark:text-primaryColor-dark" />
                    Text Color
                  </label>
                  <input
                    type="color"
                    className="w-full h-12 rounded-lg border border-borderColor dark:border-borderColor-dark cursor-pointer"
                    value={formData.template_design.text_color}
                    onChange={(e) => handleChange('template_design.text_color', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                    <FiDroplet size={14} className="text-primaryColor dark:text-primaryColor-dark" />
                    Border Color
                  </label>
                  <input
                    type="color"
                    className="w-full h-12 rounded-lg border border-borderColor dark:border-borderColor-dark cursor-pointer"
                    value={formData.template_design.border_color}
                    onChange={(e) => handleChange('template_design.border_color', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiSettings size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Border Width (px)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 rounded-lg border border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 transition-all duration-200 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                  value={formData.template_design.border_width}
                  onChange={(e) => handleChange('template_design.border_width', parseInt(e.target.value))}
                  min="0"
                  max="10"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiType size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Font Family
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 transition-all duration-200 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                  value={formData.template_design.font_family}
                  onChange={(e) => handleChange('template_design.font_family', e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiType size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Title Font Size (px)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 rounded-lg border border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 transition-all duration-200 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                  value={formData.template_design.title_font_size}
                  onChange={(e) => handleChange('template_design.title_font_size', parseInt(e.target.value))}
                  min="12"
                  max="48"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiType size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Body Font Size (px)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 rounded-lg border border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 transition-all duration-200 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                  value={formData.template_design.body_font_size}
                  onChange={(e) => handleChange('template_design.body_font_size', parseInt(e.target.value))}
                  min="10"
                  max="24"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Issuance Criteria Section */}
          <div className="p-6 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10">
            <div className="flex items-center gap-2 mb-4">
              <FiTarget className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Issuance Criteria
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <div className="flex items-center gap-3 p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark w-full shadow-sm">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-borderColor dark:border-borderColor-dark text-primaryColor focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 cursor-pointer"
                    checked={formData.criteria.course_completion}
                    onChange={(e) => handleChange('criteria.course_completion', e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <label className="text-sm font-semibold text-blackColor dark:text-blackColor-dark cursor-pointer flex-1">
                    Require Course Completion
                  </label>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiTarget size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Minimum Quiz Score (%)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 rounded-lg border border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 transition-all duration-200 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark"
                  value={formData.criteria.quiz_score_min || ''}
                  onChange={(e) => handleChange('criteria.quiz_score_min', e.target.value ? parseInt(e.target.value) : null)}
                  min="0"
                  max="100"
                  placeholder="Leave empty if not required"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center">
                <div className="flex items-center gap-3 p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark w-full shadow-sm">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-borderColor dark:border-borderColor-dark text-primaryColor focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 cursor-pointer"
                    checked={formData.criteria.assignment_submission}
                    onChange={(e) => handleChange('criteria.assignment_submission', e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <label className="text-sm font-semibold text-blackColor dark:text-blackColor-dark cursor-pointer flex-1">
                    Require Assignment Submission
                  </label>
                </div>
              </div>

              <div className="flex items-center">
                <div className="flex items-center gap-3 p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark w-full shadow-sm">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-borderColor dark:border-borderColor-dark text-primaryColor focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 cursor-pointer"
                    checked={formData.auto_issue}
                    onChange={(e) => handleChange('auto_issue', e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <label className="text-sm font-semibold text-blackColor dark:text-blackColor-dark cursor-pointer flex-1">
                    Automatically issue certificate when criteria are met
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 bg-gray-50 dark:bg-gray-900/30 border-t border-borderColor dark:border-borderColor-dark">
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                className="w-full sm:w-auto px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-blackColor dark:text-blackColor-dark font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => router.push('/dashboards/brand-certificates')}
                disabled={isSubmitting}
              >
                <FiX size={18} />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-primaryColor hover:bg-primaryColor/90 dark:bg-primaryColor-dark dark:hover:bg-primaryColor-dark/90 text-whiteColor dark:text-whiteColor-dark font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || createCertificateMutation.isPending || updateCertificateMutation.isPending}
              >
                {isSubmitting || createCertificateMutation.isPending || updateCertificateMutation.isPending ? (
                  <>
                    <FiLoader className="animate-spin" size={18} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FiSave size={18} />
                    <span>{isEditMode ? 'Update Template' : 'Create Template'}</span>
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
