"use client";
import React, { useEffect, useState } from "react";
import ButtonPrimary from "../buttons/ButtonPrimary";
import { useUser, useUpdateUser } from "@/hooks/api/useUser.js";
import useSettingsStore from "@/store/settingsStore.js";
import { updateProfileSchema, validateForm } from "@/lib/validation/schemas.js";

const ProfileContent = () => {
  // Fetch user data
  const { data: userData, isLoading: isLoadingUser } = useUser();
  const updateUserMutation = useUpdateUser();

  // Zustand store
  const {
    profileForm,
    setProfileForm,
    errors,
    setErrors,
    clearErrors,
    isLoading,
    setLoading,
    resetProfileForm,
  } = useSettingsStore();

  // Local state for form
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    skill: "",
    displayName: "",
    bio: "",
  });

  // Populate form when user data loads
  useEffect(() => {
    if (userData?.user && !isLoadingUser) {
      const user = userData.user;
      const initialData = {
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
        phone: user.phone || "",
        skill: user.skill || "",
        displayName: user.displayName || "",
        bio: user.bio || "",
      };
      setFormData(initialData);
      setProfileForm(initialData);
    }
  }, [userData, isLoadingUser, setProfileForm]);

  // Handle input change
  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    setProfileForm(newData);

    // Clear error for this field when user starts typing
    if (errors.profile[field]) {
      clearErrors("profile");
      const newErrors = { ...errors.profile };
      delete newErrors[field];
      setErrors("profile", newErrors);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    clearErrors("profile");

    // Validate form
    const validation = validateForm(updateProfileSchema, formData);
    if (!validation.success) {
      setErrors("profile", validation.errors || {});
      return;
    }

    // Set loading state
    setLoading("profile", true);

    try {
      // Prepare data for API (convert empty strings to null)
      const updateData = {};
      Object.keys(validation.data).forEach((key) => {
        const value = validation.data[key];
        updateData[key] = value === "" ? null : value;
      });

      // Submit update
      await updateUserMutation.mutateAsync(updateData);

      // Update local form state
      setFormData({
        firstName: validation.data.firstName || "",
        lastName: validation.data.lastName || "",
        username: validation.data.username || "",
        phone: validation.data.phone || "",
        skill: validation.data.skill || "",
        displayName: validation.data.displayName || "",
        bio: validation.data.bio || "",
      });
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error("Profile update error:", error);
    } finally {
      setLoading("profile", false);
    }
  };

  // Show loading state
  if (isLoadingUser) {
    return (
      <div className="text-center py-10">
        <span className="text-contentColor dark:text-contentColor-dark">Loading...</span>
      </div>
    );
  }

  const isSubmitting = isLoading.profile || updateUserMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="text-sm text-blackColor dark:text-blackColor-dark leading-1.8"
      data-aos="fade-up"
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 mb-15px gap-y-15px gap-x-30px">
        <div>
          <label className="mb-3 block font-semibold">First Name</label>
          <input
            type="text"
            placeholder="John"
            value={formData.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            disabled={isSubmitting}
            className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
              errors.profile.firstName
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          {errors.profile.firstName && (
            <p className="text-red-500 text-xs mt-1">{errors.profile.firstName}</p>
          )}
        </div>
        <div>
          <label className="mb-3 block font-semibold">Last Name</label>
          <input
            type="text"
            placeholder="Due"
            value={formData.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            disabled={isSubmitting}
            className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
              errors.profile.lastName
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          {errors.profile.lastName && (
            <p className="text-red-500 text-xs mt-1">{errors.profile.lastName}</p>
          )}
        </div>
        <div>
          <label className="mb-3 block font-semibold">User Name</label>
          <input
            type="text"
            placeholder="Ntaden Mic"
            value={formData.username}
            onChange={(e) => handleChange("username", e.target.value)}
            disabled={isSubmitting}
            className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
              errors.profile.username
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          {errors.profile.username && (
            <p className="text-red-500 text-xs mt-1">{errors.profile.username}</p>
          )}
        </div>
        <div>
          <label className="mb-3 block font-semibold">Phone Number</label>
          <input
            type="text"
            placeholder="+1-202-555-0174"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            disabled={isSubmitting}
            className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
              errors.profile.phone
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          {errors.profile.phone && (
            <p className="text-red-500 text-xs mt-1">{errors.profile.phone}</p>
          )}
        </div>
        <div>
          <label className="mb-3 block font-semibold">Skill/Occupation</label>
          <input
            type="text"
            placeholder="Full Stack Developer"
            value={formData.skill}
            onChange={(e) => handleChange("skill", e.target.value)}
            disabled={isSubmitting}
            className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
              errors.profile.skill
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          {errors.profile.skill && (
            <p className="text-red-500 text-xs mt-1">{errors.profile.skill}</p>
          )}
        </div>
        <div>
          <label className="mb-3 block font-semibold">Display Name Publicly As</label>
          <input
            type="text"
            placeholder="John"
            value={formData.displayName}
            onChange={(e) => handleChange("displayName", e.target.value)}
            disabled={isSubmitting}
            className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
              errors.profile.displayName
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          {errors.profile.displayName && (
            <p className="text-red-500 text-xs mt-1">{errors.profile.displayName}</p>
          )}
        </div>
      </div>
      <div className="mb-15px">
        <label className="mb-3 block font-semibold">Bio</label>
        <textarea
          className={`w-full py-10px px-5 text-sm text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
            errors.profile.bio
              ? "border-red-500 dark:border-red-500"
              : "border-borderColor dark:border-borderColor-dark"
          } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md ${
            isSubmitting ? "opacity-50 cursor-not-allowed" : ""
          }`}
          cols="30"
          rows="10"
          value={formData.bio}
          onChange={(e) => handleChange("bio", e.target.value)}
          disabled={isSubmitting}
          placeholder="Tell us about yourself..."
        />
        {errors.profile.bio && (
          <p className="text-red-500 text-xs mt-1">{errors.profile.bio}</p>
        )}
      </div>

      <div className="mt-15px">
        <ButtonPrimary type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update Info"}
        </ButtonPrimary>
      </div>
    </form>
  );
};

export default ProfileContent;
