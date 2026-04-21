"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLogout } from "@/hooks/api/useAuth";

const PromotionSuccessModal = ({ isOpen, onClose, onContinue }) => {
  const router = useRouter();
  const logoutMutation = useLogout();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleContinue = async () => {
    setIsLoggingOut(true);
    
    try {
      // Call the onContinue callback if provided (for custom handling)
      if (onContinue) {
        await onContinue();
      } else {
        // Default: Logout and redirect to login
        // The logout mutation will handle clearing state and redirecting
        await logoutMutation.mutateAsync();
        // Note: useLogout hook already redirects to /login in its onSuccess
      }
    } catch (error) {
      console.error("Error during logout:", error);
      setIsLoggingOut(false);
      // Still redirect to login even if logout fails
      router.push("/login");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 dark:bg-black/80 p-4">
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
        {/* Success Icon/Image Section */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 p-8 text-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-green-200/30 dark:bg-green-800/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-green-200/30 dark:bg-green-800/20 rounded-full translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative z-10">
            <div className="mx-auto w-28 h-28 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-6 shadow-2xl animate-bounce-slow">
              <i className="icofont-check-circled text-whiteColor text-6xl"></i>
            </div>
            <div className="w-20 h-20 mx-auto bg-green-400/20 dark:bg-green-600/20 rounded-full flex items-center justify-center">
              <i className="icofont-trophy-alt text-green-600 dark:text-green-400 text-4xl"></i>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 text-center">
          <h2 className="text-3xl font-bold text-blackColor dark:text-blackColor-dark mb-4">
            🎉 Congratulations!
          </h2>
          <p className="text-lg text-contentColor dark:text-contentColor-dark mb-2 leading-relaxed">
            You have been successfully promoted to <span className="font-bold text-primaryColor">Instructor</span> role!
          </p>
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-6 leading-relaxed">
            Your request has been accepted by the organization admin. You can now access instructor features and create courses.
          </p>

          {/* Information Box */}
          <div className="bg-primaryColor/10 dark:bg-primaryColor/20 border-2 border-primaryColor/30 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <i className="icofont-info-circle text-primaryColor text-xl flex-shrink-0 mt-0.5"></i>
              <div className="text-sm text-contentColor dark:text-contentColor-dark">
                <p className="font-semibold mb-1">What&apos;s Next?</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>You will be logged out automatically</li>
                  <li>Please log in again to access your new instructor dashboard</li>
                  <li>You can now create and manage courses</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={isLoggingOut || logoutMutation.isPending}
            className="w-full px-8 py-4 bg-gradient-to-r from-primaryColor to-primaryColor/90 text-whiteColor font-bold text-lg rounded-lg hover:from-primaryColor/90 hover:to-primaryColor shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
          >
            {isLoggingOut || logoutMutation.isPending ? (
              <>
                <i className="icofont-spinner-alt animate-spin"></i>
                <span>Logging out...</span>
              </>
            ) : (
              <>
                <span>Continue Process</span>
                <i className="icofont-arrow-right"></i>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromotionSuccessModal;

