"use client";

import React from "react";
import { useRouter } from "next/navigation";

/**
 * PasswordResetRequiredNotice
 *
 * Persistent panel shown on the login surfaces when a credential check succeeds
 * but the account is flagged `must_reset_password` (API returns 200 with
 * `requiresPasswordReset: true`). It replaces the login form so the user gets a
 * clear, actionable next step instead of a transient toast — and cannot blindly
 * resubmit credentials. The actions adapt to whether a valid reset link already
 * exists so we never push the user to request a second email needlessly.
 *
 * @param {Object} props
 * @param {string}  [props.message] - Server-provided message to display.
 * @param {boolean} [props.hasValidResetToken] - Whether an unexpired reset link already exists.
 * @param {Function} props.onBackToLogin - Dismisses the notice and re-enables the form.
 * @param {Function} [props.onBeforeNavigate] - Optional hook run before navigating away (e.g. close a modal).
 */
const PasswordResetRequiredNotice = ({
  message,
  hasValidResetToken = false,
  onBackToLogin,
  onBeforeNavigate,
}) => {
  const router = useRouter();

  const goToForgotPassword = () => {
    if (typeof onBeforeNavigate === "function") onBeforeNavigate();
    router.push("/auth/forgot-password");
  };

  const fallbackMessage = hasValidResetToken
    ? "A password reset is required before you can sign in. Please use the reset link we already emailed you."
    : "A password reset is required before you can sign in. Request a reset link to continue.";

  return (
    <div className="opacity-100 transition-opacity duration-150 ease-linear">
      <div className="text-center mb-25px">
        <h3 className="text-size-32 font-bold text-blackColor dark:text-blackColor-dark mb-2 leading-normal">
          Password reset required
        </h3>
        <p className="text-contentColor dark:text-contentColor-dark mb-15px">
          {message || fallbackMessage}
        </p>
        {hasValidResetToken && (
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-25px">
            Check your email (including the spam folder) for the reset link we sent.
          </p>
        )}

        <button
          type="button"
          onClick={goToForgotPassword}
          className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px w-full border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark"
        >
          {hasValidResetToken ? "Request a new reset link" : "Request a reset link"}
        </button>

        <div className="mt-15px">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-contentColor dark:text-contentColor-dark hover:text-primaryColor relative after:absolute after:left-0 after:bottom-0.5 after:w-0 after:h-0.5 after:bg-primaryColor after:transition-all after:duration-300 hover:after:w-full"
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetRequiredNotice;
