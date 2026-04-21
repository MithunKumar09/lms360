"use client";
import React, { useEffect, useState } from "react";
import ButtonPrimary from "../buttons/ButtonPrimary";
import { useSocialLinks, useUpdateSocialLinks } from "@/hooks/api/useUser.js";
import useSettingsStore from "@/store/settingsStore.js";
import { socialLinksSchema, validateForm } from "@/lib/validation/schemas.js";

const SocialIconContent = () => {
  // Fetch social links
  const { data: socialLinksData, isLoading: isLoadingLinks } = useSocialLinks();
  const updateSocialLinksMutation = useUpdateSocialLinks();

  // Zustand store
  const {
    socialLinksForm,
    setSocialLinksForm,
    errors,
    setErrors,
    clearErrors,
    isLoading,
    setLoading,
  } = useSettingsStore();

  // Local state for form
  const [formData, setFormData] = useState({
    facebook: "",
    twitter: "",
    linkedin: "",
    website: "",
    github: "",
  });

  // Populate form when social links data loads
  useEffect(() => {
    if (socialLinksData?.socialLinks && !isLoadingLinks) {
      const links = socialLinksData.socialLinks;
      const initialData = {
        facebook: links.facebook || "",
        twitter: links.twitter || "",
        linkedin: links.linkedin || "",
        website: links.website || "",
        github: links.github || "",
      };
      setFormData(initialData);
      setSocialLinksForm(initialData);
    }
  }, [socialLinksData, isLoadingLinks, setSocialLinksForm]);

  // Handle input change
  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    setSocialLinksForm(newData);

    // Clear error for this field when user starts typing
    if (errors.socialLinks[field]) {
      clearErrors("socialLinks");
      const newErrors = { ...errors.socialLinks };
      delete newErrors[field];
      setErrors("socialLinks", newErrors);
    }
  };

  // Validate URL format
  const validateUrl = (url) => {
    if (!url || url.trim() === "") return true; // Empty is valid (optional field)
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    clearErrors("socialLinks");

    // Validate URLs before schema validation
    const urlErrors = {};
    Object.keys(formData).forEach((key) => {
      if (formData[key] && !validateUrl(formData[key])) {
        urlErrors[key] = `Invalid ${key} URL format`;
      }
    });

    if (Object.keys(urlErrors).length > 0) {
      setErrors("socialLinks", urlErrors);
      return;
    }

    // Validate form with schema
    const validation = validateForm(socialLinksSchema, formData);
    if (!validation.success) {
      setErrors("socialLinks", validation.errors || {});
      return;
    }

    // Set loading state
    setLoading("socialLinks", true);

    try {
      // Prepare data for API (convert empty strings to null)
      const updateData = {};
      Object.keys(validation.data).forEach((key) => {
        const value = validation.data[key];
        updateData[key] = value === "" ? null : value;
      });

      // Submit update
      await updateSocialLinksMutation.mutateAsync(updateData);

      // Update local form state
      setFormData({
        facebook: validation.data.facebook || "",
        twitter: validation.data.twitter || "",
        linkedin: validation.data.linkedin || "",
        website: validation.data.website || "",
        github: validation.data.github || "",
      });
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error("Social links update error:", error);
    } finally {
      setLoading("socialLinks", false);
    }
  };

  // Show loading state
  if (isLoadingLinks) {
    return (
      <div className="text-center py-10">
        <span className="text-contentColor dark:text-contentColor-dark">Loading...</span>
      </div>
    );
  }

  const isSubmitting = isLoading.socialLinks || updateSocialLinksMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="text-sm text-blackColor dark:text-blackColor-dark leading-1.8"
      data-aos="fade-up"
    >
      <div className="grid grid-cols-1 mb-15px gap-y-15px gap-x-30px">
        <div>
          <label className="mb-3 block font-semibold">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-facebook inline-block mr-1"
            >
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
            </svg>
            Facebook
          </label>
          <input
            type="text"
            placeholder="https://facebook.com/"
            value={formData.facebook}
            onChange={(e) => handleChange("facebook", e.target.value)}
            disabled={isSubmitting}
            className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
              errors.socialLinks.facebook
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          {errors.socialLinks.facebook && (
            <p className="text-red-500 text-xs mt-1">{errors.socialLinks.facebook}</p>
          )}
        </div>

        <div>
          <label className="mb-3 block font-semibold">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-twitter inline-block mr-1"
            >
              <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
            </svg>
            Twitter
          </label>
          <input
            type="text"
            placeholder="https://twitter.com/"
            value={formData.twitter}
            onChange={(e) => handleChange("twitter", e.target.value)}
            disabled={isSubmitting}
            className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
              errors.socialLinks.twitter
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          {errors.socialLinks.twitter && (
            <p className="text-red-500 text-xs mt-1">{errors.socialLinks.twitter}</p>
          )}
        </div>

        <div>
          <label className="mb-3 block font-semibold">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-linkedin inline-block mr-1"
            >
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
              <rect x="2" y="9" width="4" height="12"></rect>
              <circle cx="4" cy="4" r="2"></circle>
            </svg>
            Linkedin
          </label>
          <input
            type="text"
            placeholder="https://linkedin.com/"
            value={formData.linkedin}
            onChange={(e) => handleChange("linkedin", e.target.value)}
            disabled={isSubmitting}
            className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
              errors.socialLinks.linkedin
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          {errors.socialLinks.linkedin && (
            <p className="text-red-500 text-xs mt-1">{errors.socialLinks.linkedin}</p>
          )}
        </div>

        <div>
          <label className="mb-3 block font-semibold">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-layout inline-block mr-1"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            Website
          </label>
          <input
            type="text"
            placeholder="https://website.com/"
            value={formData.website}
            onChange={(e) => handleChange("website", e.target.value)}
            disabled={isSubmitting}
            className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
              errors.socialLinks.website
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          {errors.socialLinks.website && (
            <p className="text-red-500 text-xs mt-1">{errors.socialLinks.website}</p>
          )}
        </div>

        <div>
          <label className="mb-3 block font-semibold">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-github inline-block mr-1"
            >
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            Github
          </label>
          <input
            type="text"
            placeholder="https://github.com/"
            value={formData.github}
            onChange={(e) => handleChange("github", e.target.value)}
            disabled={isSubmitting}
            className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
              errors.socialLinks.github
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          {errors.socialLinks.github && (
            <p className="text-red-500 text-xs mt-1">{errors.socialLinks.github}</p>
          )}
        </div>
      </div>

      <div className="mt-15px">
        <ButtonPrimary type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update Social"}
        </ButtonPrimary>
      </div>
    </form>
  );
};

export default SocialIconContent;
