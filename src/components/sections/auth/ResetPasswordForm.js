"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useVerifyResetToken,
  useCompletePasswordReset,
} from "@/hooks/api/usePasswordReset";
import { resetPasswordSchema, validateForm } from "@/lib/validation/schemas.js";
import { getFieldError } from "@/lib/validation/validators.js";
import ValidationError from "@/components/shared/errors/ValidationError.js";

const primaryButton =
  "text-size-15 text-whiteColor bg-primaryColor px-25px py-10px w-full border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark";

const backLink =
  "hover:text-primaryColor relative after:absolute after:left-0 after:bottom-0.5 after:w-0 after:h-0.5 after:bg-primaryColor after:transition-all after:duration-300 hover:after:w-full";

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const verifyMutation = useVerifyResetToken();
  const completeMutation = useCompletePasswordReset();

  // 'validating' | 'valid' | 'invalid' | 'error'
  const [tokenStatus, setTokenStatus] = useState("validating");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);

  const submitting = completeMutation.isPending;

  // Verify the token on mount (and on Retry). The 4 states deliberately separate
  // an invalid/expired link from a transient network/server failure so a flaky
  // connection is never reported to the user as a bad link.
  const verifyToken = useCallback(async () => {
    if (!token) {
      setTokenStatus("invalid");
      return;
    }
    setTokenStatus("validating");
    try {
      const res = await verifyMutation.mutateAsync({ token });
      if (res?.success) {
        setTokenStatus("valid");
      } else if (res?.isNetworkError || res?.status === 0 || res?.status >= 500) {
        setTokenStatus("error");
      } else {
        setTokenStatus("invalid");
      }
    } catch {
      // Unexpected throw — treat as transient, not "invalid link"
      setTokenStatus("error");
    }
    // verifyMutation.mutateAsync is stable; intentionally excluded to avoid re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const result = validateForm(resetPasswordSchema, { password, confirmPassword });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    try {
      const res = await completeMutation.mutateAsync({ token, password });

      if (res?.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login?message=password_reset_success");
        }, 1500);
        return;
      }

      // The link expired or was consumed while the form was open.
      if (res?.error === "INVALID_TOKEN") {
        setTokenStatus("invalid");
        return;
      }
      if (res?.error === "WEAK_PASSWORD") {
        const feedback = Array.isArray(res?.feedback) ? res.feedback.join(" ") : null;
        setSubmitError(
          feedback || res?.message || "Password does not meet the strength requirements."
        );
        return;
      }
      if (res?.isNetworkError || res?.status === 0 || res?.status >= 500) {
        setSubmitError("Something went wrong. Please check your connection and try again.");
        return;
      }
      setSubmitError(res?.message || res?.error || "Failed to reset password. Please try again.");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
  };

  // Lightweight strength hint (display only — gating is done by resetPasswordSchema)
  const strengthScore = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 12) s += 1;
    if (/[A-Z]/.test(password)) s += 1;
    if (/[a-z]/.test(password)) s += 1;
    if (/[0-9]/.test(password)) s += 1;
    if (/[^A-Za-z0-9]/.test(password)) s += 1;
    return s;
  })();
  const strengthColor =
    strengthScore >= 4 ? "bg-green-500" : strengthScore >= 2 ? "bg-yellow-500" : "bg-red-500";

  // ── Status screens ────────────────────────────────────────────────────────
  if (tokenStatus === "validating") {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primaryColor mx-auto"></div>
        <p className="mt-4 text-contentColor dark:text-contentColor-dark">
          Validating reset link...
        </p>
      </div>
    );
  }

  if (tokenStatus === "error") {
    return (
      <div className="text-center mb-25px">
        <h3 className="text-size-32 font-bold text-blackColor dark:text-blackColor-dark mb-2 leading-normal">
          Couldn&apos;t verify your link
        </h3>
        <p className="text-contentColor dark:text-contentColor-dark mb-25px">
          We couldn&apos;t verify your reset link right now. Please check your internet
          connection and try again.
        </p>
        <button type="button" onClick={verifyToken} className={primaryButton}>
          Retry
        </button>
        <div className="mt-15px text-contentColor dark:text-contentColor-dark">
          <Link href="/login" className={backLink}>
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <div className="text-center mb-25px">
        <h3 className="text-size-32 font-bold text-blackColor dark:text-blackColor-dark mb-2 leading-normal">
          Invalid or expired link
        </h3>
        <p className="text-contentColor dark:text-contentColor-dark mb-25px">
          This password reset link is invalid or has expired. Reset links are valid for 24
          hours — please request a new one.
        </p>
        <Link href="/auth/forgot-password" className={primaryButton}>
          Request a new link
        </Link>
        <div className="mt-15px text-contentColor dark:text-contentColor-dark">
          <Link href="/login" className={backLink}>
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center mb-25px">
        <h3 className="text-size-32 font-bold text-blackColor dark:text-blackColor-dark mb-2 leading-normal">
          Password Reset Successful
        </h3>
        <p className="text-contentColor dark:text-contentColor-dark mb-25px">
          Your password has been reset successfully. Redirecting to login...
        </p>
        <Link href="/login" className={primaryButton}>
          Go to Login
        </Link>
      </div>
    );
  }

  // tokenStatus === 'valid' → render the form
  return (
    <div className="opacity-100 transition-opacity duration-150 ease-linear">
      <div className="text-center">
        <h3 className="text-size-32 font-bold text-blackColor dark:text-blackColor-dark mb-2 leading-normal">
          Reset Your Password
        </h3>
        <p className="text-contentColor dark:text-contentColor-dark mb-15px">
          Enter a new password for your account.
        </p>
      </div>

      <form className="pt-25px" data-aos="fade-up" onSubmit={handleSubmit}>
        {submitError && (
          <div
            className="mb-25px bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded p-15px"
            role="alert"
          >
            {submitError}
          </div>
        )}

        {/* New password */}
        <div className="mb-25px">
          <label className="text-contentColor dark:text-contentColor-dark mb-10px block">
            New password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your new password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
              }}
              disabled={submitting}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={`w-full h-52px leading-52px pl-5 pr-16 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                errors.password
                  ? "border-red-500 dark:border-red-500"
                  : "border-borderColor dark:border-borderColor-dark"
              } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded ${
                submitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-4 flex items-center text-sm text-contentColor dark:text-contentColor-dark hover:text-primaryColor"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {password && (
            <div className="mt-2">
              <div className="w-full bg-borderColor dark:bg-borderColor-dark rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${strengthColor}`}
                  style={{ width: `${(strengthScore / 5) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
          <ValidationError error={getFieldError(errors, "password")} field="password" />
        </div>

        {/* Confirm password */}
        <div className="mb-25px">
          <label className="text-contentColor dark:text-contentColor-dark mb-10px block">
            Confirm new password
          </label>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword)
                setErrors((prev) => ({ ...prev, confirmPassword: null }));
            }}
            disabled={submitting}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
            className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
              errors.confirmPassword
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded ${
              submitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          <ValidationError
            error={getFieldError(errors, "confirmPassword")}
            field="confirmPassword"
          />
        </div>

        <div className="my-25px text-center">
          <button
            type="submit"
            disabled={submitting}
            className={`${primaryButton} ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {submitting ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-whiteColor"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Resetting...
              </span>
            ) : (
              "Reset Password"
            )}
          </button>
        </div>

        <div className="text-center text-contentColor dark:text-contentColor-dark">
          <Link href="/login" className={backLink}>
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordForm;
