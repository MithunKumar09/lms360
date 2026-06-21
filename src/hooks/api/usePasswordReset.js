"use client";

import { useMutation } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { getEndpoint } from "@/lib/api/endpoints.js";
import useSweetAlert from "@/hooks/useSweetAlert";

/**
 * Hook for requesting a password reset email.
 * Success state is intentionally NOT surfaced via toast here —
 * the calling component shows a neutral inline message to prevent
 * email-enumeration side-channels.
 */
export const useForgotPassword = () => {
  const createAlert = useSweetAlert();
  return useMutation({
    mutationFn: (data) =>
      apiClient.post(getEndpoint("auth.passwordReset.request"), data),
    onSuccess: () => {
      // Neutral success state is managed by the component (anti-enumeration)
    },
    onError: (error) => {
      createAlert(
        "error",
        error?.message || "Something went wrong. Please try again."
      );
    },
  });
};

/**
 * Hook for verifying that a password reset token is valid and unexpired.
 */
export const useVerifyResetToken = () => {
  return useMutation({
    mutationFn: (data) =>
      apiClient.post(getEndpoint("auth.passwordReset.verify"), data),
  });
};

/**
 * Hook for completing a password reset (setting the new password).
 */
export const useCompletePasswordReset = () => {
  const createAlert = useSweetAlert();
  return useMutation({
    mutationFn: (data) =>
      apiClient.post(getEndpoint("auth.passwordReset.complete"), data),
    onSuccess: (res) => {
      // apiClient resolves (does not throw) for non-2xx responses, so only
      // celebrate when the request actually succeeded — otherwise a 400
      // (weak/invalid) would surface a false "success" toast.
      if (res?.success) {
        createAlert("success", "Password reset successfully. Redirecting to login...");
      }
    },
    onError: (error) => {
      createAlert(
        "error",
        error?.message || "Failed to reset password. Please try again."
      );
    },
  });
};
