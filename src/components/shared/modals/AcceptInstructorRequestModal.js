"use client";

import { useState } from "react";

const AcceptInstructorRequestModal = ({
  isOpen,
  onClose,
  request,
  onAccept,
  isLoading,
}) => {
  const [mfaMethod, setMfaMethod] = useState("none");
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen || !request) return null;

  const handleAccept = async () => {
    setShowProgress(true);
    setProgress(0);

    // Simulate progress during data backup (more realistic steps)
    const progressSteps = [
      { progress: 20, delay: 300 },
      { progress: 40, delay: 400 },
      { progress: 60, delay: 500 },
      { progress: 80, delay: 400 },
      { progress: 90, delay: 300 },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        setProgress(progressSteps[currentStep].progress);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 300);

    try {
      await onAccept(mfaMethod);
      setProgress(100);
      setTimeout(() => {
        setShowProgress(false);
        setProgress(0);
        onClose();
      }, 500);
    } catch (error) {
      clearInterval(interval);
      setShowProgress(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4">
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-borderColor dark:border-borderColor-dark">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Accept Instructor Request
          </h2>
          <p className="text-sm text-contentColor dark:text-contentColor-dark mt-2">
            Promote {request.user?.display_name || request.user?.email || "this user"} to instructor role
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* MFA Method Selection */}
          <div>
            <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-3">
              MFA Method for First Login
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border-2 border-borderColor dark:border-borderColor-dark rounded-md cursor-pointer hover:border-primaryColor transition-colors">
                <input
                  type="radio"
                  name="mfa_method"
                  value="totp"
                  checked={mfaMethod === "totp"}
                  onChange={(e) => setMfaMethod(e.target.value)}
                  className="w-4 h-4 text-primaryColor focus:ring-primaryColor"
                />
                <div className="flex-1">
                  <div className="font-semibold text-blackColor dark:text-blackColor-dark">TOTP</div>
                  <div className="text-xs text-contentColor dark:text-contentColor-dark">
                    Time-based One-Time Password (Google Authenticator, etc.)
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border-2 border-borderColor dark:border-borderColor-dark rounded-md cursor-pointer hover:border-primaryColor transition-colors">
                <input
                  type="radio"
                  name="mfa_method"
                  value="email_otp"
                  checked={mfaMethod === "email_otp"}
                  onChange={(e) => setMfaMethod(e.target.value)}
                  className="w-4 h-4 text-primaryColor focus:ring-primaryColor"
                />
                <div className="flex-1">
                  <div className="font-semibold text-blackColor dark:text-blackColor-dark">Email OTP</div>
                  <div className="text-xs text-contentColor dark:text-contentColor-dark">
                    One-Time Password sent via email
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border-2 border-borderColor dark:border-borderColor-dark rounded-md cursor-pointer hover:border-primaryColor transition-colors">
                <input
                  type="radio"
                  name="mfa_method"
                  value="none"
                  checked={mfaMethod === "none"}
                  onChange={(e) => setMfaMethod(e.target.value)}
                  className="w-4 h-4 text-primaryColor focus:ring-primaryColor"
                />
                <div className="flex-1">
                  <div className="font-semibold text-blackColor dark:text-blackColor-dark">None</div>
                  <div className="text-xs text-contentColor dark:text-contentColor-dark">
                    No MFA required for first login
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Note:</strong> This action will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Backup all current user data</li>
                <li>Update user role to instructor</li>
                <li>Set MFA method for first login</li>
                <li>Send notification to the user</li>
              </ul>
            </p>
          </div>

          {/* Progress Bar */}
          {showProgress && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-contentColor dark:text-contentColor-dark font-medium">
                  <i className="icofont-spinner-alt animate-spin mr-2"></i>
                  Backing up user data...
                </span>
                <span className="text-primaryColor font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-darkdeep4 dark:bg-darkdeep4 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primaryColor to-primaryColor/80 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                  style={{ width: `${progress}%` }}
                >
                  {progress > 10 && (
                    <span className="text-whiteColor text-xs font-bold">{progress}%</span>
                  )}
                </div>
              </div>
              <div className="text-xs text-contentColor dark:text-contentColor-dark space-y-1">
                <p className="flex items-center gap-2">
                  <i className={`icofont-check ${progress > 20 ? 'text-green-500' : 'text-gray-400'}`}></i>
                  <span>Collecting user profile data...</span>
                </p>
                <p className="flex items-center gap-2">
                  <i className={`icofont-check ${progress > 50 ? 'text-green-500' : 'text-gray-400'}`}></i>
                  <span>Backing up user settings...</span>
                </p>
                <p className="flex items-center gap-2">
                  <i className={`icofont-check ${progress > 80 ? 'text-green-500' : 'text-gray-400'}`}></i>
                  <span>Storing promotion history...</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-borderColor dark:border-borderColor-dark flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading || showProgress}
            className="px-6 py-2 text-sm border border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep4 dark:hover:bg-darkdeep4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={isLoading || showProgress}
            className="px-6 py-2 text-sm bg-green-500 text-whiteColor rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {showProgress ? "Processing..." : isLoading ? "Accepting..." : "Accept Request"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcceptInstructorRequestModal;

