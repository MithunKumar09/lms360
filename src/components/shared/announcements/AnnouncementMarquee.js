"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/store/index";
import Image from "next/image";

const AnnouncementMarquee = () => {
	const user = useAuthStore((state) => state.user);
	const userRole = user?.role || null;
	const userOrgId = user?.orgId || null;
	const marqueeRef = useRef(null);
	const [isPaused, setIsPaused] = useState(false);

	// Fetch active announcements for marquee
		const { data, isLoading } = useQuery({
		queryKey: ['announcements', 'marquee', userRole, userOrgId],
		queryFn: async () => {
			// console.log('🔵 [CLIENT] [AnnouncementMarquee] ===== FETCH STARTED =====');
			// console.log('🔵 [CLIENT] [AnnouncementMarquee] User role:', userRole);
			// console.log('🔵 [CLIENT] [AnnouncementMarquee] User orgId:', userOrgId);

			// Build query params - fetch active announcements within time window
			const params = {
				page: '1',
				limit: '50', // Get more announcements for smooth marquee
				status: 'active',
				activeWindow: 'true', // Only get announcements that are currently active
			};

			// Add org_id filter for non-superadmin users
			if (userRole !== 'superadmin' && userOrgId) {
				params.org_id = userOrgId;
			}

			const response = await apiClient.get('/announcements', params);
			// console.log('🔵 [CLIENT] [AnnouncementMarquee] Response:', {
			// 	success: response.success,
			// 	count: response.announcements?.length || 0,
			// 	announcements: response.announcements,
			// });

			if (!response.success) {
				throw new Error(response.error || 'Failed to fetch announcements');
			}

			const announcements = response.announcements || [];
			// console.log('🔵 [CLIENT] [AnnouncementMarquee] Raw announcements from API:', announcements.length);
			const now = new Date();
			const nowTime = now.getTime();

			// Map target role from form to actual user role
			const mapTargetRoleToUserRole = (targetRole) => {
				const mapping = {
					'students': 'student',
					'teachers': 'instructor',
					'admin': 'admin',
					'instructor': 'instructor',
					'student': 'student',
					'superadmin': 'superadmin',
					'vendor': 'vendor',
					'all': 'all',
				};
				return mapping[targetRole?.toLowerCase()] || targetRole?.toLowerCase();
			};

			// Filter announcements:
			// 1. Active window: (end_at IS NULL OR now <= end_at) - already handled by API activeWindow filter
			// 2. Target role matching (if targets exist, check if user's role matches)
			// 3. Remove if start date time exactly equals current time (exact minute match) - per user requirement
			const filtered = announcements.filter((ann) => {
				if (!ann.start_at) {
					// console.log('🔵 [CLIENT] [AnnouncementMarquee] Removing announcement (no start_at):', ann.id);
					return false;
				}

				const startDate = new Date(ann.start_at);
				const startTime = startDate.getTime();

				// Remove if start date time exactly equals current time (within same minute) - per user requirement
				const startMinute = Math.floor(startTime / 60000);
				const nowMinute = Math.floor(nowTime / 60000);
				if (startMinute === nowMinute) {
					// console.log('🔵 [CLIENT] [AnnouncementMarquee] Removing announcement (exact time match):', ann.id);
					return false; // Exact time match - remove immediately as per requirement
				}

				// Allow scheduled announcements (start_at in future) - they will show in marquee

				// Check target roles if they exist
				if (ann.targets && Array.isArray(ann.targets) && ann.targets.length > 0) {
					const targetRoles = ann.targets
						.map((t) => t.target_role)
						.filter(Boolean)
						.map(mapTargetRoleToUserRole); // Map form roles to user roles
					
					// console.log('🔵 [CLIENT] [AnnouncementMarquee] Announcement targets:', {
					// 	id: ann.id,
					// 	title: ann.title,
					// 	rawTargets: ann.targets,
					// 	mappedTargetRoles: targetRoles,
					// 	userRole: userRole,
					// });
					
					if (targetRoles.length > 0) {
						// Normalize user role for matching
						const normalizedUserRole = userRole === 'orgadmin' ? 'admin' : userRole;
						
						// Check if user role matches any target role, or if 'all' is in targets
						const matches = targetRoles.some(
							(role) => role === normalizedUserRole || role === 'all'
						);
						
						if (!matches) {
							// console.log('🔵 [CLIENT] [AnnouncementMarquee] Removing announcement (role mismatch):', {
							// 	id: ann.id,
							// 	title: ann.title,
							// 	targetRoles,
							// 	normalizedUserRole,
							// });
							return false; // User role doesn't match targets
						} else {
							// console.log('🟢 [CLIENT] [AnnouncementMarquee] Announcement matches user role:', {
							// 	id: ann.id,
							// 	title: ann.title,
							// 	targetRoles,
							// 	normalizedUserRole,
							// });
						}
					} else {
						// If targets array exists but has no valid roles, show to all (no filtering)
						// console.log('🟡 [CLIENT] [AnnouncementMarquee] Announcement has empty targets, showing to all:', ann.id);
					}
				} else {
					// If no targets specified, show to all users
					// console.log('🟡 [CLIENT] [AnnouncementMarquee] Announcement has no targets, showing to all:', ann.id);
				}

				return true;
			});

			// console.log('🔵 [CLIENT] [AnnouncementMarquee] Filtered announcements:', filtered.length);
			// console.log('🟢 [CLIENT] [AnnouncementMarquee] ===== FETCH SUCCESSFUL =====');
			return filtered;
		},
		enabled: !!userRole && (userRole === 'superadmin' || !!userOrgId),
		staleTime: 1 * 60 * 1000, // 1 minute
		refetchInterval: 30 * 1000, // Refetch every 30 seconds to remove expired announcements
		refetchOnWindowFocus: true,
	});

	const announcements = data || [];

	// Don't render if no announcements
	if (isLoading || announcements.length === 0) {
		return null;
	}

	// For seamless continuous marquee loop, we need to duplicate items
	// The CSS animation moves from 0% to -50%, so we need even duplications (2x, 4x, etc.)
	// This ensures when animation resets, it seamlessly continues from the duplicate set
	// More duplicates = smoother continuous effect, especially with fewer items
	const getMarqueeItems = () => {
		if (announcements.length === 0) return [];
		
		// Always duplicate in even numbers (2x, 4x, 6x) so -50% animation works perfectly
		// For very few items, duplicate more times for smoother continuous loop
		if (announcements.length === 1) {
			// Single announcement: duplicate 4 times (even number) for smooth continuous loop
			return [...announcements, ...announcements, ...announcements, ...announcements];
		} else if (announcements.length === 2) {
			// Two announcements: duplicate 4 times for smooth continuous loop
			return [...announcements, ...announcements, ...announcements, ...announcements];
		} else if (announcements.length <= 5) {
			// 3-5 announcements: duplicate 2 times (standard seamless marquee pattern)
			return [...announcements, ...announcements];
		} else {
			// Many announcements: duplicate 2 times (standard seamless marquee pattern)
			// This ensures the loop is continuous and seamless
			return [...announcements, ...announcements];
		}
	};

	const marqueeItems = getMarqueeItems();

	// Get thumbnail from attachments (first image attachment)
	const getThumbnail = (ann) => {
		// Handle both array and JSON string formats
		let attachmentsArray = ann.attachments;
		if (typeof attachmentsArray === 'string') {
			try {
				attachmentsArray = JSON.parse(attachmentsArray);
			} catch (e) {
				console.warn('Failed to parse attachments JSON:', e);
				attachmentsArray = [];
			}
		}
		
		if (attachmentsArray && Array.isArray(attachmentsArray) && attachmentsArray.length > 0) {
			// Filter out null/undefined entries (PostgreSQL json_agg can include nulls)
			const validAttachments = attachmentsArray.filter(att => att && typeof att === 'object');
			const imageAttachment = validAttachments.find(
				(att) => att.content_type && att.content_type.startsWith('image/')
			);
			if (imageAttachment?.url) {
				// console.log('🟢 [Marquee] Found image attachment:', imageAttachment.url);
				return imageAttachment.url;
			}
		}
		// Fallback placeholder
		// console.log('🟡 [Marquee] No image attachment found for announcement:', ann.id, 'Attachments:', ann.attachments);
		return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect fill='%23e5e7eb' width='60' height='60'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='12' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3EAnn%3C/text%3E%3C/svg%3E";
	};

	// Format date
	const formatDate = (dateString) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	// Get category badge color
	const getCategoryColor = (category) => {
		const colors = {
			general: 'bg-blue-100 text-blue-800',
			exam: 'bg-red-100 text-red-800',
			assignment: 'bg-purple-100 text-purple-800',
			notice: 'bg-green-100 text-green-800',
			holiday: 'bg-yellow-100 text-yellow-800',
			event: 'bg-pink-100 text-pink-800',
			admission: 'bg-indigo-100 text-indigo-800',
			job_vacancy: 'bg-orange-100 text-orange-800',
			circular: 'bg-teal-100 text-teal-800',
			public_notice: 'bg-cyan-100 text-cyan-800',
			others: 'bg-gray-100 text-gray-800',
		};
		return colors[category] || colors.others;
	};

	// Calculate animation duration based on number of items for smooth continuous scrolling
	// More items = slower speed, fewer items = faster speed (but still smooth and readable)
	// Duration is based on original item count, not duplicated count
	const getAnimationDuration = () => {
		const baseDuration = 30; // Base duration in seconds
		const itemCount = announcements.length;
		
		if (itemCount === 1) {
			return 20; // Faster for single item (since it's duplicated 4x, moves faster)
		} else if (itemCount === 2) {
			return 25; // Medium speed for 2 items (duplicated 4x)
		} else if (itemCount <= 5) {
			return baseDuration; // Standard speed for 3-5 items
		} else {
			// Slightly slower for many items to maintain readability
			return baseDuration + (itemCount - 5) * 2;
		}
	};

	return (
		<div
			className="w-full bg-white py-3 mt-4"
			onMouseEnter={() => setIsPaused(true)}
			onMouseLeave={() => setIsPaused(false)}
		>
			<div className="container-fluid-2">
				<div className="relative overflow-hidden">
					<div
						ref={marqueeRef}
						className="flex gap-6 whitespace-nowrap"
						style={{
							animation: isPaused
								? 'none'
								: `marquee ${getAnimationDuration()}s linear infinite`,
						}}
					>
						{/* Duplicate items for seamless loop - duplication is necessary for seamless animation */}
						{marqueeItems.map((ann, idx) => {
							// Use a unique key that includes the index to differentiate duplicates
							const uniqueKey = `${ann.id}-${Math.floor(idx / announcements.length)}-${idx % announcements.length}`;
							return (
							<div
								key={uniqueKey}
								className="flex items-center gap-3 text-white rounded-lg px-4 py-2.5 min-w-[320px] transition-all duration-300 shadow-md hover:shadow-lg"
								style={{
									backgroundColor: '#1e3a8a', // dark blue-900
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = '#1e40af'; // blue-800 on hover
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = '#1e3a8a'; // back to blue-900
								}}
							>
								{/* Thumbnail - Square size */}
								<div className="relative w-14 h-14 flex-shrink-0 rounded-md overflow-hidden bg-blue-800 border-2 border-blue-700">
									<Image
										src={getThumbnail(ann)}
										alt={ann.title}
										width={56}
										height={56}
										className="w-full h-full object-cover"
										unoptimized
									/>
								</div>

								{/* Content */}
								<div className="flex items-center gap-3 flex-1 min-w-0 text-white">
									{/* Category Badge */}
									<span
										className="px-2.5 py-1 rounded-md text-xs font-bold uppercase flex-shrink-0 shadow-sm bg-green-500 text-white"
									>
										{ann.category}
									</span>

									{/* Title */}
									<span className="text-white font-semibold text-sm truncate flex-1">
										{ann.title}
									</span>

									{/* Date */}
									<span className="text-white text-xs flex-shrink-0 font-medium">
										{formatDate(ann.start_at)}
									</span>
								</div>
							</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};

export default AnnouncementMarquee;

