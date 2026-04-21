'use client';

import React, { useEffect, useRef } from 'react';
import { useFeedbackModal } from './FeedbackModalProvider';
import FeedbackForm from './FeedbackForm';

/**
 * Feedback Modal Component
 * 
 * Modal for submitting website feedback.
 * Auto-displays based on provider logic.
 */
export default function FeedbackModal() {
	const { isOpen, closeModal, canSubmitFeedback } = useFeedbackModal();
	const modalRef = useRef(null);
	const contentRef = useRef(null);

	/**
	 * Handle escape key press
	 */
	useEffect(() => {
		const handleEscape = (e) => {
			if (e.key === 'Escape' && isOpen) {
				closeModal();
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleEscape);
			// Prevent body scroll when modal is open
			document.body.style.overflow = 'hidden';
		}

		return () => {
			document.removeEventListener('keydown', handleEscape);
			document.body.style.overflow = 'auto';
		};
	}, [isOpen, closeModal]);

	/**
	 * Handle click outside modal
	 */
	const handleBackdropClick = (e) => {
		if (e.target === modalRef.current) {
			closeModal();
		}
	};

	/**
	 * Handle form success (close modal after submission)
	 */
	const handleFormSuccess = () => {
		// Close modal after a short delay to show success message
		setTimeout(() => {
			closeModal();
		}, 1500);
	};

	// Don't render if user can't submit feedback
	if (!canSubmitFeedback) {
		return null;
	}

	if (!isOpen) {
		return null;
	}

	return (
		<div
			ref={modalRef}
			className="fixed inset-0 z-xxxl flex items-center justify-center p-15px transition-all duration-300"
			style={{
				backgroundColor: 'rgba(0, 0, 0, 0.5)', // Subtle blur - bg-lightBlack with opacity-50
				backdropFilter: 'blur(2px)',
			}}
			onClick={handleBackdropClick}
			role="dialog"
			aria-modal="true"
			aria-labelledby="feedback-modal-title"
		>
			<div
				ref={contentRef}
				className="bg-whiteColor dark:bg-whiteColor-dark rounded-standard p-25px max-w-450px w-full max-h-[90vh] overflow-y-auto shadow-dropdown relative z-small transition-all duration-300"
				onClick={(e) => e.stopPropagation()}
				style={{ maxWidth: '450px' }}
			>
				{/* Close Button */}
				<button
					type="button"
					onClick={closeModal}
					className="absolute top-12px right-12px text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark opacity-50 hover:opacity-75 transition-opacity p-5px"
					aria-label="Close feedback modal"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						className="w-5 h-5 fill-current"
					>
						<path d="M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z"></path>
					</svg>
				</button>

				{/* Modal Header */}
				<div className="mb-20px text-center">
					<h2
						id="feedback-modal-title"
						className="text-size-20 font-bold text-blackColor dark:text-blackColor-dark mb-5px"
					>
						Help us improve
					</h2>
				</div>

				{/* Modal Content - Feedback Form */}
				<FeedbackForm onSuccess={handleFormSuccess} />
			</div>
		</div>
	);
}

