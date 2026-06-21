/**
 * Login Modal Component
 * 
 * Displays a login modal when unauthenticated users try to perform
 * wishlist actions. Uses LoginForm component and handles redirect after login.
 */

"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLogin } from "@/hooks/api/useAuth";
import { useAuthStore } from "@/store/index.js";
import { useQueryClient } from "@tanstack/react-query";
import useSweetAlert from "@/hooks/useSweetAlert";
import { loginSchema, validateForm } from "@/lib/validation/schemas.js";
import ValidationError from "@/components/shared/errors/ValidationError.js";
import PasswordResetRequiredNotice from "@/components/shared/login/PasswordResetRequiredNotice";

const LoginModal = ({ isOpen, onClose, onLoginSuccess, message }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const loginMutation = useLogin();

  // Prevent redirect in modal context by overriding router.push
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      // Invalidate wishlist to sync after login
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      
      if (onLoginSuccess) {
        // Small delay to ensure state is updated
        setTimeout(() => {
          onLoginSuccess();
          onClose();
        }, 300);
      } else {
        onClose();
      }
    }
  }, [isAuthenticated, isOpen, onClose, onLoginSuccess, queryClient]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setPassword("");
      setRememberMe(false);
      setErrors({});
    }
  }, [isOpen]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isValid = validateLoginForm();
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      createAlert("error", firstError || "Please fill in all required fields correctly");
      return;
    }

    setErrors({});

    // Store remember me preference
    if (rememberMe) {
      localStorage.setItem("rememberMe", "true");
      localStorage.setItem("rememberedEmail", email.trim());
    } else {
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("rememberedEmail");
    }

    // Use login mutation
    loginMutation.mutate({
      email: email.trim(),
      password: password,
      rememberMe: rememberMe,
    });
  };

  // Handle login success without redirect
  useEffect(() => {
    if (loginMutation.isSuccess && loginMutation.data) {
      const data = loginMutation.data;
      
      // Don't redirect if MFA is required - let the user handle it
      if (data.requiresMfa || data.requiresMfaSetup) {
        return;
      }

      if (data.success && data.user) {
        createAlert('success', 'Login successful!');
        
        // Update auth store
        login(
          data.user,
          data.sessionToken || null,
          data.refreshToken || null,
          data.expiresAt ? new Date(data.expiresAt) : null
        );

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.invalidateQueries({ queryKey: ['session'] });
        queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      }
    }
  }, [loginMutation.isSuccess, loginMutation.data, login, queryClient, createAlert]);

  // Handle login errors
  useEffect(() => {
    if (loginMutation.isError) {
      const error = loginMutation.error;
      const errorMessage = error?.message || error?.error || 'Login failed. Please try again.';
      setErrors({ general: errorMessage });
    }
  }, [loginMutation.isError, loginMutation.error]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-whiteColor dark:bg-whiteColor-dark border-b border-borderColor dark:border-borderColor-dark px-6 py-4 flex justify-between items-center rounded-t-lg z-10">
          <h2 className="text-xl font-semibold text-blackColor dark:text-blackColor-dark">
            Login Required
          </h2>
          <button
            onClick={onClose}
            className="text-contentColor dark:text-contentColor-dark hover:text-primaryColor text-2xl leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4">
          {message && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {message}
              </p>
            </div>
          )}

          {loginMutation.data?.requiresPasswordReset ? (
            <PasswordResetRequiredNotice
              message={loginMutation.data.message}
              hasValidResetToken={loginMutation.data.hasValidResetToken}
              onBackToLogin={() => loginMutation.reset()}
              onBeforeNavigate={onClose}
            />
          ) : (
          <>
          <p className="mb-4 text-contentColor dark:text-contentColor-dark">
            Please login to add courses to your wishlist and access all features.
          </p>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {errors.general}
                </p>
              </div>
            )}

            <div>
              <label htmlFor="modal-email" className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
                Email
              </label>
              <input
                id="modal-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-borderColor dark:border-borderColor-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all"
                placeholder="your@email.com"
                disabled={loginMutation.isPending}
              />
              {errors.email && <ValidationError message={errors.email} />}
            </div>

            <div>
              <label htmlFor="modal-password" className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
                Password
              </label>
              <input
                id="modal-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-borderColor dark:border-borderColor-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all"
                placeholder="••••••••"
                disabled={loginMutation.isPending}
              />
              {errors.password && <ValidationError message={errors.password} />}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mr-2 w-4 h-4 text-primaryColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor focus:ring-2 cursor-pointer"
                  disabled={loginMutation.isPending}
                />
                <span className="text-sm text-contentColor dark:text-contentColor-dark">
                  Remember me
                </span>
              </label>
              <a
                href="/auth/forgot-password"
                className="text-sm text-primaryColor hover:text-secondaryColor transition-colors duration-200"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  router.push("/auth/forgot-password");
                }}
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-primaryColor text-whiteColor py-2.5 px-4 rounded-lg hover:bg-secondaryColor transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-md"
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </button>
          </form>
          </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-whiteColor dark:bg-whiteColor-dark border-t border-borderColor dark:border-borderColor-dark px-6 py-4 rounded-b-lg">
          <p className="text-sm text-center text-contentColor dark:text-contentColor-dark">
            Don&apos;t have an account?{" "}
            <a
              href="/signup"
              className="text-primaryColor hover:text-secondaryColor font-semibold"
              onClick={(e) => {
                e.preventDefault();
                onClose();
                router.push("/signup");
              }}
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;

