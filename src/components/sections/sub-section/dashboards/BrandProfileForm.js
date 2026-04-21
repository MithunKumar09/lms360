"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import ImagePicker from "@/components/shared/forms/ImagePicker.js";
import { 
  FiHome, 
  FiBriefcase, 
  FiGlobe, 
  FiMail, 
  FiPhone, 
  FiFileText, 
  FiTarget, 
  FiHeart, 
  FiAward,
  FiSave,
  FiLoader
} from "react-icons/fi";

export default function BrandProfileForm() {
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  const [formData, setFormData] = useState({
    brand_name: "",
    industry: "",
    logo_url: "",
    website_url: "",
    contact_email: "",
    contact_phone: "",
    csr_initiatives: "",
    focus_areas: "",
    mission: "",
    values: "",
    description: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing brand profile
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['brandProfile', userId],
    queryFn: async () => {
      const response = await apiClient.get('/brand/profile');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch profile');
      }
      return response.data;
    },
    enabled: !!userId,
  });

  // Load profile data when available
  useEffect(() => {
    if (profileData?.profile) {
      const profile = profileData.profile;
      setFormData({
        brand_name: profile.brand_name || "",
        industry: profile.industry || "",
        logo_url: profile.logo_url || "",
        website_url: profile.website_url || "",
        contact_email: profile.contact_email || "",
        contact_phone: profile.contact_phone || "",
        csr_initiatives: profile.csr_initiatives || "",
        focus_areas: profile.focus_areas || "",
        mission: profile.mission || "",
        values: profile.values || "",
        description: profile.description || "",
      });
    }
  }, [profileData]);

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

    if (!formData.brand_name || formData.brand_name.trim().length < 2) {
      newErrors.brand_name = "Brand name is required and must be at least 2 characters";
    }

    if (!formData.industry || formData.industry.trim().length < 2) {
      newErrors.industry = "Industry is required";
    }

    if (formData.website_url && !/^https?:\/\/.+/.test(formData.website_url)) {
      newErrors.website_url = "Website URL must be a valid URL starting with http:// or https://";
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = "Contact email must be a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put('/brand/profile', data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update profile');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandProfile'] });
      createAlert('success', 'Profile updated successfully!');
    },
    onError: (error) => {
      console.error('Update profile error:', error);
      createAlert('error', error.message || 'Failed to update profile');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfileMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <FiLoader className="animate-spin mx-auto mb-4 text-primaryColor dark:text-primaryColor-dark" size={32} />
          <p className="text-contentColor dark:text-contentColor-dark text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="mb-6 pb-6 border-b-2 border-borderColor dark:border-borderColor-dark">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-gradient-to-br from-primaryColor to-secondaryColor rounded-lg shadow-md">
            <FiHome className="text-whiteColor dark:text-whiteColor-dark" size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-blackColor dark:text-blackColor-dark mb-1">
              Brand Profile
            </h1>
            <p className="text-sm text-contentColor dark:text-contentColor-dark">
              Set up and manage your brand profile information
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-lg border border-borderColor dark:border-borderColor-dark overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Basic Information Section */}
          <div className="p-6 border-b border-borderColor dark:border-borderColor-dark bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10">
            <div className="flex items-center gap-2 mb-4">
              <FiBriefcase className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Basic Information
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiHome size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    errors.brand_name 
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                      : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                  } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark`}
                  value={formData.brand_name}
                  onChange={(e) => handleChange('brand_name', e.target.value)}
                  placeholder="Enter your brand name"
                  disabled={isSubmitting}
                />
                {errors.brand_name && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.brand_name}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiBriefcase size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Industry <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    errors.industry 
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                      : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                  } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark`}
                  value={formData.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  placeholder="e.g., Technology, Education, Healthcare"
                  disabled={isSubmitting}
                />
                {errors.industry && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.industry}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Brand Identity Section */}
          <div className="p-6 border-b border-borderColor dark:border-borderColor-dark">
            <div className="flex items-center gap-2 mb-4">
              <FiAward className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Brand Identity
              </h2>
            </div>
            
            <div className="mb-6">
              <label className="flex items-center gap-2 mb-3 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                <FiAward size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                Brand Logo
              </label>
              <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 border border-borderColor dark:border-borderColor-dark">
                <ImagePicker
                  value={formData.logo_url}
                  onChange={(url) => handleChange('logo_url', url)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiGlobe size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Website URL
                </label>
                <input
                  type="url"
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    errors.website_url 
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                      : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                  } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark`}
                  value={formData.website_url}
                  onChange={(e) => handleChange('website_url', e.target.value)}
                  placeholder="https://example.com"
                  disabled={isSubmitting}
                />
                {errors.website_url && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.website_url}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiMail size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Contact Email
                </label>
                <input
                  type="email"
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                    errors.contact_email 
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                      : 'border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20'
                  } bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark`}
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="contact@example.com"
                  disabled={isSubmitting}
                />
                {errors.contact_email && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.contact_email}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiPhone size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Contact Phone
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-2.5 rounded-lg border border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 transition-all duration-200 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Brand Description Section */}
          <div className="p-6 border-b border-borderColor dark:border-borderColor-dark">
            <div className="flex items-center gap-2 mb-4">
              <FiFileText className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Brand Description
              </h2>
            </div>
            
            <div className="mb-6">
              <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                <FiFileText size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                Description
              </label>
              <textarea
                className="w-full px-4 py-2.5 rounded-lg border border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 transition-all duration-200 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark resize-none"
                rows="4"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Brief description of your brand"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Mission & Values Section */}
          <div className="p-6 border-b border-borderColor dark:border-borderColor-dark bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10">
            <div className="flex items-center gap-2 mb-4">
              <FiHeart className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Mission & Values
              </h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiTarget size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Mission Statement
                </label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-lg border border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 transition-all duration-200 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark resize-none"
                  rows="3"
                  value={formData.mission}
                  onChange={(e) => handleChange('mission', e.target.value)}
                  placeholder="Your brand's mission statement"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiHeart size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Core Values
                </label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-lg border border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 transition-all duration-200 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark resize-none"
                  rows="3"
                  value={formData.values}
                  onChange={(e) => handleChange('values', e.target.value)}
                  placeholder="Your brand's core values"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* CSR & Focus Areas Section */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiTarget className="text-primaryColor dark:text-primaryColor-dark" size={20} />
              <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                CSR & Focus Areas
              </h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiAward size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  CSR Initiatives
                </label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-lg border border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 transition-all duration-200 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark resize-none"
                  rows="3"
                  value={formData.csr_initiatives}
                  onChange={(e) => handleChange('csr_initiatives', e.target.value)}
                  placeholder="List your Corporate Social Responsibility initiatives"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  <FiTarget size={16} className="text-primaryColor dark:text-primaryColor-dark" />
                  Focus Areas
                </label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-lg border border-borderColor dark:border-borderColor-dark focus:border-primaryColor dark:focus:border-primaryColor-dark focus:ring-2 focus:ring-primaryColor/20 dark:focus:ring-primaryColor-dark/20 transition-all duration-200 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark resize-none"
                  rows="3"
                  value={formData.focus_areas}
                  onChange={(e) => handleChange('focus_areas', e.target.value)}
                  placeholder="Areas of focus (e.g., Education, Technology, Innovation)"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 bg-gray-50 dark:bg-gray-900/30 border-t border-borderColor dark:border-borderColor-dark">
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-primaryColor hover:bg-primaryColor/90 dark:bg-primaryColor-dark dark:hover:bg-primaryColor-dark/90 text-whiteColor dark:text-whiteColor-dark font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || updateProfileMutation.isPending}
              >
                {isSubmitting || updateProfileMutation.isPending ? (
                  <>
                    <FiLoader className="animate-spin" size={18} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FiSave size={18} />
                    <span>Save Profile</span>
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
