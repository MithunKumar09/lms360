"use client";
import React, { useState } from "react";
import ButtonPrimary from "../buttons/ButtonPrimary";
import { useChangePassword } from "@/hooks/api/useUser.js";
import useSettingsStore from "@/store/settingsStore.js";
import { changePasswordSchema, validateForm } from "@/lib/validation/schemas.js";

const PasswordContent = () => {
  const changePasswordMutation = useChangePassword();

  // Zustand store
  const {
    passwordForm,
    setPasswordForm,
    errors,
    setErrors,
    clearErrors,
    isLoading,
    setLoading,
    resetPasswordForm,
  } = useSettingsStore();

  // Local state for form
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Password visibility states
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Handle input change
  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    setPasswordForm(newData);

    // Clear error for this field when user starts typing
    if (errors.password[field]) {
      clearErrors("password");
      const newErrors = { ...errors.password };
      delete newErrors[field];
      setErrors("password", newErrors);
    }
  };

  // Calculate password strength
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: "", color: "" };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const strengths = [
      { strength: 1, label: "Very Weak", color: "bg-red-500" },
      { strength: 2, label: "Weak", color: "bg-orange-500" },
      { strength: 3, label: "Fair", color: "bg-yellow-500" },
      { strength: 4, label: "Good", color: "bg-blue-500" },
      { strength: 5, label: "Strong", color: "bg-green-500" },
    ];

    return strengths[strength - 1] || { strength: 0, label: "", color: "" };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    clearErrors("password");

    // Validate form
    const validation = validateForm(changePasswordSchema, formData);
    if (!validation.success) {
      setErrors("password", validation.errors || {});
      return;
    }

    // Set loading state
    setLoading("password", true);

    try {
      // Submit password change
      await changePasswordMutation.mutateAsync({
        currentPassword: validation.data.currentPassword,
        newPassword: validation.data.newPassword,
      });

      // Clear form on success
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      resetPasswordForm();
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error("Password change error:", error);
    } finally {
      setLoading("password", false);
    }
  };

  const isSubmitting = isLoading.password || changePasswordMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="text-sm text-blackColor dark:text-blackColor-dark leading-1.8"
      data-aos="fade-up"
    >
      <div className="grid grid-cols-1 mb-15px gap-y-15px gap-x-30px">
        <div>
          <label className="mb-3 block font-semibold">Current Password</label>
          <div className="relative">
            <input
              type={showPasswords.current ? "text" : "password"}
              placeholder="Current password"
              value={formData.currentPassword}
              onChange={(e) => handleChange("currentPassword", e.target.value)}
              disabled={isSubmitting}
              className={`w-full py-10px px-5 pr-10 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                errors.password.currentPassword
                  ? "border-red-500 dark:border-red-500"
                  : "border-borderColor dark:border-borderColor-dark"
              } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
            <button
              type="button"
              onClick={() =>
                setShowPasswords({ ...showPasswords, current: !showPasswords.current })
              }
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-contentColor dark:text-contentColor-dark hover:text-primaryColor"
            >
              <i
                className={showPasswords.current ? "icofont-eye" : "icofont-eye-blocked"}
              ></i>
            </button>
          </div>
          {errors.password.currentPassword && (
            <p className="text-red-500 text-xs mt-1">{errors.password.currentPassword}</p>
          )}
        </div>

        <div>
          <label className="mb-3 block font-semibold">New Password</label>
          <div className="relative">
            <input
              type={showPasswords.new ? "text" : "password"}
              placeholder="New Password"
              value={formData.newPassword}
              onChange={(e) => handleChange("newPassword", e.target.value)}
              disabled={isSubmitting}
              className={`w-full py-10px px-5 pr-10 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                errors.password.newPassword
                  ? "border-red-500 dark:border-red-500"
                  : "border-borderColor dark:border-borderColor-dark"
              } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
            <button
              type="button"
              onClick={() =>
                setShowPasswords({ ...showPasswords, new: !showPasswords.new })
              }
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-contentColor dark:text-contentColor-dark hover:text-primaryColor"
            >
              <i
                className={showPasswords.new ? "icofont-eye" : "icofont-eye-blocked"}
              ></i>
            </button>
          </div>
          {formData.newPassword && passwordStrength.strength > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
                    style={{
                      width: `${(passwordStrength.strength / 5) * 100}%`,
                    }}
                  ></div>
                </div>
                <span className="text-xs text-contentColor dark:text-contentColor-dark">
                  {passwordStrength.label}
                </span>
              </div>
            </div>
          )}
          {errors.password.newPassword && (
            <p className="text-red-500 text-xs mt-1">{errors.password.newPassword}</p>
          )}
        </div>

        <div>
          <label className="mb-3 block font-semibold">Re-Type New Password</label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? "text" : "password"}
              placeholder="Re-Type New Password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              disabled={isSubmitting}
              className={`w-full py-10px px-5 pr-10 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                errors.password.confirmPassword
                  ? "border-red-500 dark:border-red-500"
                  : "border-borderColor dark:border-borderColor-dark"
              } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
            <button
              type="button"
              onClick={() =>
                setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
              }
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-contentColor dark:text-contentColor-dark hover:text-primaryColor"
            >
              <i
                className={showPasswords.confirm ? "icofont-eye" : "icofont-eye-blocked"}
              ></i>
            </button>
          </div>
          {errors.password.confirmPassword && (
            <p className="text-red-500 text-xs mt-1">{errors.password.confirmPassword}</p>
          )}
        </div>
      </div>

      <div className="mt-15px">
        <ButtonPrimary type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update Password"}
        </ButtonPrimary>
      </div>
    </form>
  );
};

export default PasswordContent;
