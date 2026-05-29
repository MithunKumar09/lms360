"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import useSweetAlert from "@/hooks/useSweetAlert";
import { useLogin } from "@/hooks/api/useAuth";
import { loginSchema, validateForm } from "@/lib/validation/schemas.js";
import { formatValidationErrors, getFieldError } from "@/lib/validation/validators.js";
import { handleError } from "@/lib/errors/errorHandler.js";
import ValidationError from "@/components/shared/errors/ValidationError.js";
import ErrorDisplay from "@/components/shared/errors/ErrorDisplay.js";

const LoginForm = () => {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const loginMutation = useLogin();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState("");
  
  const loading = loginMutation.isPending;

  // Form validation using zod schema
  const validateLoginForm = () => {
    const result = validateForm(loginSchema, {
      email: email.trim(),
      password: password,
      rememberMe: rememberMe,
    });

    if (!result.success) {
      setErrors(result.errors);
      return false;
    }

    setErrors({});
    return true;
  };


  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form using zod schema
    const isValid = validateLoginForm();
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      createAlert("error", firstError || "Please fill in all required fields correctly");
      return;
    }

    // Check if account is locked
    if (isLocked) {
      createAlert("error", lockoutMessage);
      return;
    }

    setErrors({});

    // Store remember me preference in localStorage
    if (rememberMe) {
      localStorage.setItem("rememberMe", "true");
      localStorage.setItem("rememberedEmail", email.trim());
    } else {
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("rememberedEmail");
    }

    // Use React Query mutation
    loginMutation.mutate({
      email: email.trim(),
      password: password,
      rememberMe: rememberMe,
    });
  };
  
  // Handle errors from mutation
  React.useEffect(() => {
    if (loginMutation.error) {
      const errorHandling = handleError(loginMutation.error, {
        log: true,
        context: { form: 'login' },
      });

      // Check for specific error types from API response
      const errorData = loginMutation.error.data || {};
      if (errorData.accountLocked) {
        setIsLocked(true);
        setLockoutMessage(errorHandling.message);
        createAlert("error", errorHandling.message);
      } else if (errorData.rateLimited) {
        setErrors({ general: errorHandling.message });
        createAlert("error", errorHandling.message);
      } else {
        setErrors({ general: errorHandling.message });
      }
    }
  }, [loginMutation.error, createAlert]);

  // Load remembered email on mount
  React.useEffect(() => {
    const remembered = localStorage.getItem("rememberMe");
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (remembered === "true" && rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className=" opacity-100 transition-opacity duration-150 ease-linear">
      {/* heading   */}
      <div className="text-center">
        <h3 className="text-size-32 font-bold text-blackColor dark:text-blackColor-dark mb-2 leading-normal">
          Login
        </h3>
        <p className="text-contentColor dark:text-contentColor-dark mb-15px">
          {" Don't"} have an account yet?
          <a
            href="login.html"
            className="hover:text-primaryColor relative after:absolute after:left-0 after:bottom-0.5 after:w-0 after:h-0.5 after:bg-primaryColor after:transition-all after:duration-300 hover:after:w-full"
          >
            Sign up for free
          </a>
        </p>
      </div>

      <form className="pt-25px" data-aos="fade-up" onSubmit={handleSubmit}>
        {errors.general && (
          <ErrorDisplay
            error={errors.general}
            type="inline"
            variant="error"
            className="mb-25px"
          />
        )}

        {isLocked && lockoutMessage && (
          <div className="mb-25px p-15px bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-yellow-600 dark:text-yellow-400 text-sm">
            {lockoutMessage}
          </div>
        )}

        <div className="mb-25px">
          <label className="text-contentColor dark:text-contentColor-dark mb-10px block">
            Username or email
          </label>
          <input
            type="text"
            placeholder="Your username or email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              // Clear error when user starts typing
              if (errors.email) {
                setErrors((prev) => ({ ...prev, email: null }));
              }
            }}
            disabled={loading || isLocked}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
              errors.email
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded ${
              loading || isLocked ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          <ValidationError error={getFieldError(errors, 'email')} field="email" />
        </div>

        <div className="mb-25px">
          <label className="text-contentColor dark:text-contentColor-dark mb-10px block">
            Password
          </label>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              // Clear error when user starts typing
              if (errors.password) {
                setErrors((prev) => ({ ...prev, password: null }));
              }
            }}
            disabled={loading || isLocked}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
              errors.password
                ? "border-red-500 dark:border-red-500"
                : "border-borderColor dark:border-borderColor-dark"
            } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded ${
              loading || isLocked ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          <ValidationError error={getFieldError(errors, 'password')} field="password" />
        </div>

        <div className="text-contentColor dark:text-contentColor-dark flex items-center justify-between">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading || isLocked}
              className="w-18px h-18px mr-2 block box-content"
            />
            <label htmlFor="remember"> Remember me</label>
          </div>
          <div>
<a
  href="#"
  onClick={(e) => {
    e.preventDefault();
    router.push("/auth/forgot-password");
  }}
  className="hover:text-primaryColor relative after:absolute after:left-0 after:bottom-0.5 after:w-0 after:h-0.5 after:bg-primaryColor after:transition-all after:duration-300 hover:after:w-full"
>
  Forgot your password?
</a>
          </div>
        </div>
        <div className="my-25px text-center">
          <button
            type="submit"
            disabled={loading || isLocked}
            className={`text-size-15 text-whiteColor bg-primaryColor px-25px py-10px w-full border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark ${
              loading || isLocked ? "opacity-50 cursor-not-allowed" : ""
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
                Logging in...
              </span>
            ) : (
              "Log in"
            )}
          </button>
        </div>
        {/* other login */}
        {/* <div>
          <p className="text-contentColor dark:text-contentColor-dark text-center relative mb-15px before:w-2/5 before:h-1px before:bg-borderColor4 dark:before:bg-borderColor2-dark before:absolute before:left-0 before:top-4 after:w-2/5 after:h-1px after:bg-borderColor4 dark:after:bg-borderColor2-dark after:absolute after:right-0 after:top-4">
            or Log-in with
          </p>
        </div> */}
        {/* <div className="text-center flex gap-x-1 md:gap-x-15px lg:gap-x-25px gap-y-5 items-center justify-center flex-wrap">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              createAlert("info", "Facebook login coming soon");
            }}
            disabled={loading || isLocked}
            className={`text-size-15 text-whiteColor bg-primaryColor px-11 py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark ${
              loading || isLocked ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <i className="icofont-facebook"></i> Facebook
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              createAlert("info", "Google login coming soon");
            }}
            disabled={loading || isLocked}
            className={`text-size-15 text-whiteColor bg-primaryColor px-11 py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark ${
              loading || isLocked ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <i className="icofont-google-plus"></i> Google
          </button>
        </div> */}
      </form>
    </div>
  );
};

export default LoginForm;
