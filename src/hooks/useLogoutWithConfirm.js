"use client";

import { useState, useEffect } from "react";
import { useLogout } from "@/hooks/api/useAuth";
import LogoutConfirmModal from "@/components/shared/modals/LogoutConfirmModal";

/**
 * useLogoutWithConfirm Hook
 * 
 * Centralized logout functionality with confirmation modal.
 * Provides a consistent logout experience across the application.
 * 
 * @returns {Object} Logout functions and state
 * @returns {Function} handleLogout - Function to trigger logout (shows confirmation)
 * @returns {Function} logoutDirectly - Function to logout without confirmation (for programmatic use)
 * @returns {JSX.Element} LogoutModal - Modal component to render
 * @returns {boolean} isLoggingOut - Whether logout is in progress
 */
export const useLogoutWithConfirm = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const logoutMutation = useLogout();

  /**
   * Handle logout with confirmation
   * Opens the confirmation modal
   */
  const handleLogout = () => {
    setIsModalOpen(true);
  };

  /**
   * Confirm logout
   * Called when user confirms in the modal
   */
  const confirmLogout = () => {
    logoutMutation.mutate();
  };

  /**
   * Cancel logout
   * Called when user cancels in the modal
   */
  const cancelLogout = () => {
    if (!logoutMutation.isPending) {
      setIsModalOpen(false);
    }
  };

  /**
   * Logout directly without confirmation
   * Use this for programmatic logout (e.g., session expiration)
   */
  const logoutDirectly = () => {
    logoutMutation.mutate();
  };

  // Close modal when logout completes (success or error)
  useEffect(() => {
    if ((logoutMutation.isSuccess || logoutMutation.isError) && isModalOpen) {
      setIsModalOpen(false);
    }
  }, [logoutMutation.isSuccess, logoutMutation.isError, isModalOpen]);

  return {
    handleLogout,
    logoutDirectly,
    LogoutModal: (
      <LogoutConfirmModal
        isOpen={isModalOpen}
        onClose={cancelLogout}
        onConfirm={confirmLogout}
        isLoading={logoutMutation.isPending}
      />
    ),
    isLoggingOut: logoutMutation.isPending,
  };
};

export default useLogoutWithConfirm;

