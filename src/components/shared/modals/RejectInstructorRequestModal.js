"use client";

import { useState } from "react";

const RejectInstructorRequestModal = ({
  isOpen,
  onClose,
  request,
  onReject,
  isLoading,
}) => {
  const [rejectionReason, setRejectionReason] = useState("");

  if (!isOpen || !request) return null;

  const handleReject = () => {
    onReject(rejectionReason.trim() || null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4">
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-borderColor dark:border-borderColor-dark">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Reject Instructor Request
          </h2>
          <p className="text-sm text-contentColor dark:text-contentColor-dark mt-2">
            Reject request from {request.user?.display_name || request.user?.email || "this user"}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Rejection Reason */}
          <div>
            <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              Rejection Reason (Optional)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide a reason for rejection (optional)..."
              rows={4}
              className="w-full py-2 px-3 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md resize-none"
            />
            <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
              This reason will be sent to the user via notification
            </p>
          </div>

          {/* Warning */}
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <i className="icofont-warning text-red-600 dark:text-red-400 text-xl flex-shrink-0 mt-0.5"></i>
              <div className="text-sm text-red-800 dark:text-red-300">
                <p className="font-semibold mb-2">This action will:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Reject the instructor request</li>
                  <li>Send notification to the user</li>
                  <li>Allow the user to submit a new request</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-borderColor dark:border-borderColor-dark flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 text-sm border border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep4 dark:hover:bg-darkdeep4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isLoading}
            className="px-6 py-2 text-sm bg-red-500 text-whiteColor rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Rejecting..." : "Reject Request"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectInstructorRequestModal;

