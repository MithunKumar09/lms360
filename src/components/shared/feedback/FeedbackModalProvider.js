'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store';

/**
 * Feedback Modal Context
 */
const FeedbackModalContext = createContext({
	isOpen: false,
	openModal: () => {},
	closeModal: () => {},
});

/**
 * Feedback Modal Provider
 * 
 * Manages feedback modal state and auto-display logic.
 * - Auto-displays on mount if authenticated and 2 hours have passed
 * - Auto-displays every 2 hours
 * - Tracks last display time in localStorage
 */
export function FeedbackModalProvider({ children }) {
	const [isOpen, setIsOpen] = useState(false);
	const [dismissedInSession, setDismissedInSession] = useState(false);
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const user = useAuthStore((state) => state.user);
	const userRole = user?.role;

	// Check if user can submit feedback (all roles except superadmin)
	const canSubmitFeedback = isAuthenticated && userRole && userRole !== 'superadmin';

	/**
	 * Open modal
	 * @param {boolean} force - If true, bypasses dismissedInSession check (for manual opening)
	 */
	const openModal = useCallback((force = false) => {
		if (canSubmitFeedback && (force || !dismissedInSession)) {
			setIsOpen(true);
			// Update last display time
			localStorage.setItem('feedback_last_display', Date.now().toString());
		}
	}, [canSubmitFeedback, dismissedInSession]);

	/**
	 * Close modal
	 */
	const closeModal = useCallback(() => {
		setIsOpen(false);
		setDismissedInSession(true);
	}, []);

	/**
	 * Check if modal should auto-display (for interval checks)
	 */
	const checkAutoDisplay = useCallback(() => {
		if (!canSubmitFeedback || dismissedInSession) {
			return false;
		}

		const lastDisplay = localStorage.getItem('feedback_last_display');
		const now = Date.now();
		const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

		// If no last display time or 2 hours have passed, show modal
		if (!lastDisplay || (now - parseInt(lastDisplay)) >= twoHours) {
			return true;
		}

		return false;
	}, [canSubmitFeedback, dismissedInSession]);

	/**
	 * Auto-display on page load/mount
	 * Shows modal automatically when page loads (if authenticated and not dismissed in session)
	 */
	useEffect(() => {
		// Small delay to ensure page is fully loaded and auth state is ready
		const timer = setTimeout(() => {
			// Show on every page load if user can submit feedback and hasn't dismissed in this session
			if (canSubmitFeedback && !dismissedInSession) {
				setIsOpen(true);
				localStorage.setItem('feedback_last_display', Date.now().toString());
			}
		}, 500); // 500ms delay for better UX

		return () => clearTimeout(timer);
	}, [canSubmitFeedback, dismissedInSession]);

	/**
	 * Set up interval to check every 2 hours
	 */
	useEffect(() => {
		if (!canSubmitFeedback) {
			return;
		}

		const twoHours = 2 * 60 * 60 * 1000;

		// Set interval to check every 2 hours
		const interval = setInterval(() => {
			if (checkAutoDisplay() && !dismissedInSession) {
				setIsOpen(true);
				localStorage.setItem('feedback_last_display', Date.now().toString());
			}
		}, twoHours);

		return () => clearInterval(interval);
	}, [canSubmitFeedback, checkAutoDisplay, dismissedInSession]);

	/**
	 * Reset dismissed state when user changes
	 */
	useEffect(() => {
		setDismissedInSession(false);
	}, [user?.id]);

	const value = {
		isOpen,
		openModal,
		closeModal,
		canSubmitFeedback,
	};

	return (
		<FeedbackModalContext.Provider value={value}>
			{children}
		</FeedbackModalContext.Provider>
	);
}

/**
 * useFeedbackModal Hook
 * 
 * Hook to access feedback modal context.
 */
export function useFeedbackModal() {
	const context = useContext(FeedbackModalContext);
	if (!context) {
		throw new Error('useFeedbackModal must be used within FeedbackModalProvider');
	}
	return context;
}

