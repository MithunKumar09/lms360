"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useForgotPassword } from "@/hooks/api/usePasswordReset";
import { forgotPasswordSchema, validateForm } from "@/lib/validation/schemas.js";
import { getFieldError } from "@/lib/validation/validators.js";
import ValidationError from "@/components/shared/errors/ValidationError.js";

const COOLDOWN_SECONDS = 60;

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const forgotPasswordMutation = useForgotPassword();
  const loading = forgotPasswordMutation.isPending;

  // Countdown timer after a submit attempt
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const result = validateForm(forgotPasswordSchema, { email: email.trim() });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    setErrors({});

    forgotPasswordMutation.mutate(
      { email: email.trim() },
      {
        onSettled: () => {
          // Start cooldown regardless of success/failure to prevent spam
          setCooldownSeconds(COOLDOWN_SECONDS);
          setSubmitted(true);
        },
      }
    );
  };

  // Neutral success state — same message whether email exists or not (anti-enumeration)
  if (submitted) {
    return (
      <div className="opacity-100 transition-opacity duration-150 ease-linear">
        <div className="text-center mb-25px">
          <h3 className="text-size-32 font-bold text-blackColor dark:text-blackColor-dark mb-2 leading-normal">
            Check Your Email
          </h3>
          <p className="text-contentColor dark:text-contentColor-dark mb-15px">
            If an account exists with that email address, you will receive a
            password reset link shortly. Check your spam folder if you don&apos;t
            see it within a few minutes.
          </p>
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-25px">
            Didn&apos;t receive an email?{" "}
            {cooldownSeconds > 0 ? (
              <span className="text-primaryColor font-medium">
                Resend available in {cooldownSeconds}s
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="hover:text-primaryColor relative after:absolute after:left-0 after:bottom-0.5 after:w-0 after:h-0.5 after:bg-primaryColor after:transition-all after:duration-300 hover:after:w-full"
              >
                Try again
              </button>
            )}
          </p>
          <Link
            href="/login"
            className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px inline-block border border-primaryColor hover:text-primaryColor hover:bg-whiteColor rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="opacity-100 transition-opacity duration-150 ease-linear">
      {/* Heading */}
      <div className="text-center">
        <h3 className="text-size-32 font-bold text-blackColor dark:text-blackColor-dark mb-2 leading-normal">
          Forgot Password
        </h3>
        <p className="text-contentColor dark:text-contentColor-dark mb-15px">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

      <form className="pt-25px" data-aos="fade-up" onSubmit={handleSubmit}>
        <div className="mb-25px">
          <label className="text-contentColor dark:text-contentColor-dark mb-10px block">
            Email address
          </label>
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) {
                setErrors((prev) => ({ ...prev, email: null }));
              }
            }}
            disabled={loading}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
              errors.email
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          <ValidationError error={getFieldError(errors, "email")} field="email" />
        </div>

        <div className="my-25px text-center">
          <button
            type="submit"
            disabled={loading || cooldownSeconds > 0}
            className={`text-size-15 text-whiteColor bg-primaryColor px-25px py-10px w-full border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark ${
              loading || cooldownSeconds > 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? (
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
                Sending...
              </span>
            ) : cooldownSeconds > 0 ? (
              `Resend available in ${cooldownSeconds}s`
            ) : (
              "Send Reset Link"
            )}
          </button>
        </div>

        <div className="text-center text-contentColor dark:text-contentColor-dark">
          <Link
            href="/login"
            className="hover:text-primaryColor relative after:absolute after:left-0 after:bottom-0.5 after:w-0 after:h-0.5 after:bg-primaryColor after:transition-all after:duration-300 hover:after:w-full"
          >
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ForgotPasswordForm;
