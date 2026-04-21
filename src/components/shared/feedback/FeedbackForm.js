'use client';

import React, { useState } from 'react';
import { useCreateFeedback } from '@/hooks/api/useFeedback.js';
import { FEEDBACK_CATEGORIES } from '@/lib/validation/feedbackSchemas.js';

/**
 * Emotion options with emojis
 */
const EMOTIONS = [
	{ value: 1, emoji: '😄', label: 'Satisfied' },
	{ value: 2, emoji: '🙂', label: 'Happy' },
	{ value: 3, emoji: '😐', label: 'Neutral' },
	{ value: 4, emoji: '😕', label: 'Unhappy' },
	{ value: 5, emoji: '😢', label: 'Dissatisfied' },
];

/**
 * Feedback Form Component
 * 
 * Redesigned form with emoji-based emotion selection.
 */
export default function FeedbackForm({ onSuccess }) {
	const [formData, setFormData] = useState({
		message: '',
		emotion: null,
		category: null,
	});

	const [errors, setErrors] = useState({});
	const [touched, setTouched] = useState({});

	const createFeedback = useCreateFeedback();

	/**
	 * Handle input change
	 */
	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value === '' ? null : value,
		}));

		// Clear error when user starts typing
		if (errors[name]) {
			setErrors((prev) => ({
				...prev,
				[name]: '',
			}));
		}
	};

	/**
	 * Handle emotion selection
	 */
	const handleEmotionChange = (emotionValue) => {
		setFormData((prev) => ({
			...prev,
			emotion: prev.emotion === emotionValue ? null : emotionValue,
		}));

		if (errors.emotion) {
			setErrors((prev) => ({
				...prev,
				emotion: '',
			}));
		}
	};

	/**
	 * Handle blur (mark field as touched)
	 */
	const handleBlur = (e) => {
		const { name } = e.target;
		setTouched((prev) => ({
			...prev,
			[name]: true,
		}));
		validateField(name, formData[name]);
	};

	/**
	 * Validate single field
	 */
	const validateField = (name, value) => {
		const newErrors = { ...errors };

		switch (name) {
			case 'message':
				if (value && value.trim() !== '') {
					if (value.trim().length < 10) {
						newErrors.message = 'Message must be at least 10 characters';
					} else if (value.length > 5000) {
						newErrors.message = 'Message must be at most 5000 characters';
					} else {
						delete newErrors.message;
					}
				} else {
					delete newErrors.message;
				}
				break;

			default:
				break;
		}

		setErrors(newErrors);
		return !newErrors[name];
	};

	/**
	 * Validate entire form
	 */
	const validateForm = () => {
		const newErrors = {};

		// Message is optional, but if provided, must meet requirements
		if (formData.message && formData.message.trim() !== '') {
			if (formData.message.trim().length < 10) {
				newErrors.message = 'Message must be at least 10 characters';
			} else if (formData.message.length > 5000) {
				newErrors.message = 'Message must be at most 5000 characters';
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	/**
	 * Handle form submission
	 */
	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!validateForm()) {
			// Mark message as touched to show errors
			setTouched({
				message: true,
			});
			return;
		}

		try {
			// Prepare submission data
			const submissionData = {
				message: formData.message?.trim() || null,
				emotion: formData.emotion || null,
				category: formData.category || null,
			};

			await createFeedback.mutateAsync(submissionData);

			// Reset form
			setFormData({
				message: '',
				emotion: null,
				category: null,
			});
			setErrors({});
			setTouched({});

			// Call success callback
			if (onSuccess) {
				onSuccess();
			}
		} catch (error) {
			// Error is handled by the hook
			console.error('Feedback submission error:', error);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="feedback-form">
			{/* Emotion Selection */}
			<div className="mb-25px">
				<label className="block text-size-16 font-semibold text-blackColor dark:text-blackColor-dark mb-15px text-center">
					How was your experience?
				</label>
				<div className="flex items-center justify-center gap-15px">
					{EMOTIONS.map((emotion) => (
						<button
							key={emotion.value}
							type="button"
							onClick={() => handleEmotionChange(emotion.value)}
							disabled={createFeedback.isPending}
							className={`flex flex-col items-center gap-5px transition-all duration-200 ${
								formData.emotion === emotion.value
									? 'scale-110 opacity-100'
									: 'opacity-60 hover:opacity-80 hover:scale-105'
							} disabled:opacity-50 disabled:cursor-not-allowed`}
							aria-label={emotion.label}
						>
							<span
								className={`text-size-40 transition-transform ${
									formData.emotion === emotion.value ? 'scale-110' : ''
								}`}
							>
								{emotion.emoji}
							</span>
							{formData.emotion === emotion.value && (
								<span className="text-size-12 text-contentColor dark:text-contentColor-dark font-medium">
									{emotion.label}
								</span>
							)}
						</button>
					))}
				</div>
			</div>

			{/* Additional Feedback Section */}
			<div className="mb-25px">
				<label
					htmlFor="feedback-message"
					className="block text-size-14 font-semibold text-blackColor dark:text-blackColor-dark mb-10px"
				>
					Additional feedback (optional)
				</label>
				<textarea
					id="feedback-message"
					name="message"
					value={formData.message}
					onChange={handleChange}
					onBlur={handleBlur}
					placeholder="Briefly explain what happened."
					rows={4}
					className={`w-full p-12px text-size-14 bg-transparent border rounded-standard resize-none ${
						errors.message && touched.message
							? 'border-red-500 dark:border-red-500'
							: 'border-borderColor dark:border-borderColor-dark'
					} text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor transition-colors`}
					disabled={createFeedback.isPending}
					maxLength={5000}
				/>
				<div className="flex justify-between items-center mt-5px">
					{errors.message && touched.message ? (
						<p className="text-red-500 text-size-12">{errors.message}</p>
					) : (
						<div />
					)}
					{formData.message && (
						<p className="text-size-12 text-contentColor dark:text-contentColor-dark">
							{formData.message.length}/5000
						</p>
					)}
				</div>
			</div>

			{/* Category Field (Optional) */}
			<div className="mb-25px">
				<label
					htmlFor="feedback-category"
					className="block text-size-14 font-semibold text-blackColor dark:text-blackColor-dark mb-10px"
				>
					Category (optional)
				</label>
				<select
					id="feedback-category"
					name="category"
					value={formData.category || ''}
					onChange={handleChange}
					className="w-full p-12px text-size-14 bg-transparent border border-borderColor dark:border-borderColor-dark rounded-standard text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor transition-colors"
					disabled={createFeedback.isPending}
				>
					<option value="">Select a category</option>
					{FEEDBACK_CATEGORIES.map((category) => (
						<option key={category} value={category}>
							{category.charAt(0).toUpperCase() + category.slice(1).replace(/\//g, ' / ')}
						</option>
					))}
				</select>
			</div>

			{/* Submit Button */}
			<div className="flex justify-center">
				<button
					type="submit"
					disabled={createFeedback.isPending}
					className="w-full text-size-15 font-semibold text-whiteColor bg-primaryColor px-30px py-12px border border-primaryColor hover:bg-primaryColor/90 dark:hover:bg-primaryColor/90 rounded-standard transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
					style={{
						backgroundColor: '#66A69A',
						borderColor: '#66A69A',
					}}
				>
					{createFeedback.isPending ? 'Submitting...' : 'Submit'}
				</button>
			</div>
		</form>
	);
}
