"use client";

import { useMemo, useState } from "react";
import { useFeedbacks, useUpdateFeedback } from "@/hooks/api/useFeedback.js";
import { FEEDBACK_STATUSES, FEEDBACK_CATEGORIES } from "@/lib/validation/feedbackSchemas.js";

function Badge({ children, color = "gray" }) {
	const map = {
		green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
		red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
		amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
		blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
		gray: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
	};
	return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[color] || map.gray}`}>{children}</span>;
}

function cls(...a) { return a.filter(Boolean).join(" "); }

function Button({ children, variant = "primary", className = "", onClick, disabled, ...rest }) {
	const base = "inline-flex items-center justify-center gap-2 transition rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2";
	const variants = {
		primary: "text-white bg-gradient-to-tr from-primaryColor to-primaryColor/90 hover:to-primaryColor/80 shadow-sm focus:ring-primaryColor/40",
		soft: "text-primaryColor bg-primaryColor/10 hover:bg-primaryColor/15 focus:ring-primaryColor/20",
		neutral: "text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:ring-gray-300",
		danger: "text-red-600 bg-red-50 hover:bg-red-100 focus:ring-red-300",
		ghost: "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800",
	};
	const cn = cls(base, variants[variant] || variants.primary, className, disabled && "opacity-50 cursor-not-allowed");
	return <button className={cn} onClick={onClick} disabled={disabled} {...rest}>{children}</button>;
}

export default function SuperadminFeedbackMain() {
	// UI state
	const [q, setQ] = useState("");
	const [filters, setFilters] = useState({
		status: "",
		category: "",
		role: "",
		from: "",
		to: "",
	});
	const [sort, setSort] = useState({ by: "created_at", dir: "desc" });
	const [page, setPage] = useState(1);
	const [selectedFeedback, setSelectedFeedback] = useState(null);
	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [showUpdateModal, setShowUpdateModal] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [exportError, setExportError] = useState(null);
	const limit = 20;

	// Build query filters for React Query
	const queryFilters = useMemo(() => {
		const params = {};
		
		if (q) params.q = q;
		if (filters.status) params.status = filters.status;
		if (filters.category) params.category = filters.category;
		if (filters.role) params.role = filters.role;
		if (filters.from) params.from = filters.from;
		if (filters.to) params.to = filters.to;
		
		return params;
	}, [q, filters]);

	// Fetch feedbacks using React Query
	const { data, isLoading, error, refetch } = useFeedbacks({
		filters: queryFilters,
		pagination: { page, limit },
		sort,
		enabled: true,
	});

	const feedbacks = data?.feedbacks || [];
	const pagination = data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 };

	// Update mutation
	const updateFeedback = useUpdateFeedback();

	const onSearch = (e) => {
		e.preventDefault();
		setPage(1);
	};

	const onViewDetails = (feedback) => {
		setSelectedFeedback(feedback);
		setShowDetailsModal(true);
	};

	const onUpdateStatus = (feedback) => {
		setSelectedFeedback(feedback);
		setShowUpdateModal(true);
	};

	const handleStatusUpdate = async (status, adminNotes) => {
		if (!selectedFeedback) return;
		
		try {
			await updateFeedback.mutateAsync({
				id: selectedFeedback.id,
				status,
				admin_notes: adminNotes || null,
			});
			setShowUpdateModal(false);
			setSelectedFeedback(null);
		} catch (error) {
			console.error('Update error:', error);
		}
	};

	const handleExport = async (format = 'csv') => {
		setIsExporting(true);
		setExportError(null);

		try {
			const params = new URLSearchParams();
			if (filters.status) params.append('status', filters.status);
			if (filters.category) params.append('category', filters.category);
			if (filters.role) params.append('role', filters.role);
			if (filters.from) params.append('from', filters.from);
			if (filters.to) params.append('to', filters.to);
			if (q) params.append('q', q);
			params.append('format', format);

			const response = await fetch(`/api/feedback/export?${params.toString()}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `Export failed with status ${response.status}`);
			}

			const blob = await response.blob();
			
			// Check if blob is empty or error
			if (blob.size === 0) {
				throw new Error('Export file is empty. No data to export.');
			}

			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `feedbacks-export-${new Date().toISOString().split('T')[0]}.${format}`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			// Show success message (optional - could use toast)
			console.log(`Successfully exported feedbacks as ${format.toUpperCase()}`);
		} catch (error) {
			console.error('Export error:', error);
			setExportError(error.message || 'Failed to export feedbacks. Please try again.');
			// Show error alert
			alert(`Export failed: ${error.message || 'Please try again.'}`);
		} finally {
			setIsExporting(false);
		}
	};

	const changePage = (p) => {
		if (p < 1 || p > (pagination.pages || 1)) return;
		setPage(p);
	};

	const getStatusColor = (status) => {
		switch (status) {
			case 'pending': return 'amber';
			case 'reviewed': return 'blue';
			case 'resolved': return 'green';
			case 'archived': return 'gray';
			default: return 'gray';
		}
	};

	const formatDate = (dateString) => {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const getEmotionEmoji = (emotion) => {
		const emotions = {
			1: { emoji: '😄', label: 'Satisfied' },
			2: { emoji: '🙂', label: 'Happy' },
			3: { emoji: '😐', label: 'Neutral' },
			4: { emoji: '😕', label: 'Unhappy' },
			5: { emoji: '😢', label: 'Dissatisfied' },
		};
		return emotions[emotion] || null;
	};

	return (
		<div className="space-y-4">
			{/* Error State */}
			{error && (
				<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
					Error: {error.message || 'Failed to load feedbacks'} 
					<button className="btn ml-2" onClick={() => refetch()}>Retry</button>
				</div>
			)}

			{/* Export Error State */}
			{exportError && (
				<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
					Export Error: {exportError}
					<button className="btn ml-2" onClick={() => setExportError(null)}>Dismiss</button>
				</div>
			)}

			{/* Header */}
			<div className="flex items-center justify-between bg-whiteColor dark:bg-whiteColor-dark rounded shadow-accordion dark:shadow-accordion-dark px-4 py-3">
				<div className="flex items-center gap-3">
					<span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primaryColor/10 text-primaryColor">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-message-circle">
							<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
						</svg>
					</span>
					<div>
						<h2 className="text-base font-semibold text-blackColor dark:text-blackColor-dark">Feedbacks</h2>
						<p className="text-xs text-contentColor dark:text-contentColor-dark">View and manage website feedback submissions</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button 
						variant="neutral" 
						onClick={() => handleExport('csv')} 
						disabled={isLoading || isExporting}
					>
						{isExporting ? (
							<>
								<span className="inline-block w-4 h-4 rounded-full border-2 border-primaryColor border-t-transparent animate-spin"></span>
								Exporting...
							</>
						) : (
							<>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-download">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
									<polyline points="7 10 12 15 17 10"></polyline>
									<line x1="12" y1="15" x2="12" y2="3"></line>
								</svg>
								Export CSV
							</>
						)}
					</Button>
					<Button 
						variant="neutral" 
						onClick={() => handleExport('xlsx')} 
						disabled={isLoading || isExporting}
					>
						{isExporting ? (
							<>
								<span className="inline-block w-4 h-4 rounded-full border-2 border-primaryColor border-t-transparent animate-spin"></span>
								Exporting...
							</>
						) : (
							<>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-file">
									<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
									<polyline points="13 2 13 9 20 9"></polyline>
								</svg>
								Export XLSX
							</>
						)}
					</Button>
				</div>
			</div>

			{/* Filters */}
			<form onSubmit={onSearch} className="flex flex-wrap gap-2 items-end bg-whiteColor dark:bg-whiteColor-dark rounded shadow-accordion dark:shadow-accordion-dark p-3">
				<input 
					className="input" 
					placeholder="Search feedbacks..." 
					value={q} 
					onChange={(e) => setQ(e.target.value)} 
				/>
				<select 
					className="select" 
					value={filters.status} 
					onChange={(e) => setFilters({ ...filters, status: e.target.value })}
				>
					<option value="">All Status</option>
					{FEEDBACK_STATUSES.map(status => (
						<option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
					))}
				</select>
				<select 
					className="select" 
					value={filters.category} 
					onChange={(e) => setFilters({ ...filters, category: e.target.value })}
				>
					<option value="">All Categories</option>
					{FEEDBACK_CATEGORIES.map(category => (
						<option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1).replace(/\//g, ' / ')}</option>
					))}
				</select>
				<select 
					className="select" 
					value={filters.role} 
					onChange={(e) => setFilters({ ...filters, role: e.target.value })}
				>
					<option value="">All Roles</option>
					<option value="admin">Admin</option>
					<option value="instructor">Instructor</option>
					<option value="student">Student</option>
					<option value="vendor">Vendor</option>
					<option value="parent">Parent</option>
					<option value="alumni">Alumni</option>
				</select>
				<input 
					type="date" 
					className="input" 
					value={filters.from} 
					onChange={(e) => setFilters({ ...filters, from: e.target.value })} 
					placeholder="From Date"
				/>
				<input 
					type="date" 
					className="input" 
					value={filters.to} 
					onChange={(e) => setFilters({ ...filters, to: e.target.value })} 
					placeholder="To Date"
				/>
				<select 
					className="select" 
					value={sort.by} 
					onChange={(e) => setSort({ ...sort, by: e.target.value })}
				>
					<option value="created_at">Created</option>
					<option value="updated_at">Updated</option>
					<option value="subject">Subject</option>
					<option value="status">Status</option>
					<option value="rating">Rating</option>
				</select>
				<select 
					className="select" 
					value={sort.dir} 
					onChange={(e) => setSort({ ...sort, dir: e.target.value })}
				>
					<option value="desc">Desc</option>
					<option value="asc">Asc</option>
				</select>
				<Button variant="primary" type="submit">
					<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-filter">
						<polygon points="22 3 2 3 10 12 10 19 14 21 14 12 22 3"></polygon>
					</svg>
					Apply
				</Button>
			</form>

			{/* Table */}
			<div className="bg-whiteColor dark:bg-whiteColor-dark rounded shadow-accordion dark:shadow-accordion-dark">
				{isLoading ? (
					<div className="p-6 flex items-center gap-3 text-contentColor dark:text-contentColor-dark">
						<span className="inline-block w-4 h-4 rounded-full border-2 border-primaryColor border-t-transparent animate-spin"></span>
						<span className="text-sm">Loading feedbacks...</span>
					</div>
				) : feedbacks.length === 0 ? (
					<div className="p-8 text-center text-sm text-contentColor dark:text-contentColor-dark">No feedbacks found</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-lightGrey5 dark:bg-whiteColor-dark">
								<tr className="text-left">
									<th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">Date</th>
									<th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">User</th>
									<th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">Emotion</th>
									<th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">Message</th>
									<th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">Category</th>
									<th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">Status</th>
									<th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">Actions</th>
								</tr>
							</thead>
							<tbody>
								{feedbacks.map((feedback) => {
									const emotion = getEmotionEmoji(feedback.rating);
									return (
									<tr key={feedback.id} className="border-t border-borderColor dark:border-borderColor-dark hover:bg-lightGrey7 dark:hover:bg-darkdeep1">
										<td className="px-3 py-2 text-contentColor dark:text-contentColor-dark">{formatDate(feedback.created_at)}</td>
										<td className="px-3 py-2 text-contentColor dark:text-contentColor-dark">
											<div>
												<div className="font-medium">{feedback.user_role}</div>
											</div>
										</td>
										<td className="px-3 py-2 text-contentColor dark:text-contentColor-dark">
											{emotion ? (
												<div className="flex items-center gap-5px">
													<span className="text-size-20">{emotion.emoji}</span>
													<span className="text-size-12">{emotion.label}</span>
												</div>
											) : '-'}
										</td>
										<td className="px-3 py-2 text-contentColor dark:text-contentColor-dark max-w-300px truncate">
											{feedback.message || '-'}
										</td>
										<td className="px-3 py-2 text-contentColor dark:text-contentColor-dark">
											{feedback.category ? (
												<Badge color="blue">{feedback.category}</Badge>
											) : '-'}
										</td>
										<td className="px-3 py-2">
											<Badge color={getStatusColor(feedback.status)}>{feedback.status}</Badge>
										</td>
										<td className="px-3 py-2">
											<div className="flex gap-2">
												<Button 
													variant="soft" 
													className="!text-xs !py-1.5 !px-2.5" 
													onClick={() => onViewDetails(feedback)}
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-eye mr-1">
														<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
														<circle cx="12" cy="12" r="3"></circle>
													</svg>
													View
												</Button>
												<Button 
													variant="soft" 
													className="!text-xs !py-1.5 !px-2.5" 
													onClick={() => onUpdateStatus(feedback)}
													disabled={updateFeedback.isPending}
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-edit mr-1">
														<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
														<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
													</svg>
													Update
												</Button>
											</div>
										</td>
									</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between bg-whiteColor dark:bg-whiteColor-dark rounded shadow-accordion dark:shadow-accordion-dark px-4 py-3">
				<div className="text-sm text-contentColor dark:text-contentColor-dark">
					Page {pagination.page} of {pagination.pages || 1} ({pagination.total} results)
				</div>
				<div className="flex gap-2">
					<Button 
						variant="neutral" 
						className="disabled:opacity-50" 
						onClick={() => changePage(pagination.page - 1)} 
						disabled={pagination.page <= 1}
					>
						Prev
					</Button>
					<Button 
						variant="neutral" 
						className="disabled:opacity-50" 
						onClick={() => changePage(pagination.page + 1)} 
						disabled={pagination.page >= (pagination.pages || 1)}
					>
						Next
					</Button>
				</div>
			</div>

			{/* View Details Modal */}
			{showDetailsModal && selectedFeedback && (
				<div 
					className="fixed inset-0 z-xxxl flex items-center justify-center p-15px transition-all duration-300"
					style={{
						backgroundColor: 'rgba(0, 0, 0, 0.5)',
						backdropFilter: 'blur(2px)',
					}}
					onClick={() => {
						setShowDetailsModal(false);
						setSelectedFeedback(null);
					}}
				>
					<div 
						className="bg-whiteColor dark:bg-whiteColor-dark rounded-standard p-30px max-w-700px w-full max-h-[90vh] overflow-y-auto shadow-dropdown relative z-small"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							type="button"
							onClick={() => {
								setShowDetailsModal(false);
								setSelectedFeedback(null);
							}}
							className="absolute top-15px right-15px text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark opacity-50 hover:opacity-75 transition-opacity p-5px"
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-5 h-5 fill-current">
								<path d="M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z"></path>
							</svg>
						</button>

						<h2 className="text-size-24 font-bold text-blackColor dark:text-blackColor-dark mb-20px">Feedback Details</h2>
						
						<div className="space-y-15px">
							<div>
								<label className="text-size-14 font-medium text-blackColor dark:text-blackColor-dark">Subject</label>
								<p className="text-size-14 text-contentColor dark:text-contentColor-dark mt-5px">{selectedFeedback.subject}</p>
							</div>
							<div>
								<label className="text-size-14 font-medium text-blackColor dark:text-blackColor-dark">Message</label>
								<p className="text-size-14 text-contentColor dark:text-contentColor-dark mt-5px whitespace-pre-wrap">{selectedFeedback.message}</p>
							</div>
							<div className="grid grid-cols-2 gap-15px">
								<div>
									<label className="text-size-14 font-medium text-blackColor dark:text-blackColor-dark">User</label>
									<p className="text-size-14 text-contentColor dark:text-contentColor-dark mt-5px">{selectedFeedback.email || 'N/A'}</p>
								</div>
								<div>
									<label className="text-size-14 font-medium text-blackColor dark:text-blackColor-dark">Role</label>
									<p className="text-size-14 text-contentColor dark:text-contentColor-dark mt-5px">{selectedFeedback.user_role}</p>
								</div>
								<div>
									<label className="text-size-14 font-medium text-blackColor dark:text-blackColor-dark">Category</label>
									<p className="text-size-14 text-contentColor dark:text-contentColor-dark mt-5px">{selectedFeedback.category || '-'}</p>
								</div>
								<div>
									<label className="text-size-14 font-medium text-blackColor dark:text-blackColor-dark">Rating</label>
									<p className="text-size-14 text-contentColor dark:text-contentColor-dark mt-5px">
										{selectedFeedback.rating ? (
											<span className="text-yellow-400">{renderStars(selectedFeedback.rating)}</span>
										) : '-'}
									</p>
								</div>
								<div>
									<label className="text-size-14 font-medium text-blackColor dark:text-blackColor-dark">Status</label>
									<p className="text-size-14 text-contentColor dark:text-contentColor-dark mt-5px">
										<Badge color={getStatusColor(selectedFeedback.status)}>{selectedFeedback.status}</Badge>
									</p>
								</div>
								<div>
									<label className="text-size-14 font-medium text-blackColor dark:text-blackColor-dark">Created</label>
									<p className="text-size-14 text-contentColor dark:text-contentColor-dark mt-5px">{formatDate(selectedFeedback.created_at)}</p>
								</div>
							</div>
							{selectedFeedback.admin_notes && (
								<div>
									<label className="text-size-14 font-medium text-blackColor dark:text-blackColor-dark">Admin Notes</label>
									<p className="text-size-14 text-contentColor dark:text-contentColor-dark mt-5px whitespace-pre-wrap">{selectedFeedback.admin_notes}</p>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Update Status Modal */}
			{showUpdateModal && selectedFeedback && (
				<UpdateStatusModal
					feedback={selectedFeedback}
					onClose={() => {
						setShowUpdateModal(false);
						setSelectedFeedback(null);
					}}
					onUpdate={handleStatusUpdate}
					isUpdating={updateFeedback.isPending}
				/>
			)}
		</div>
	);
}

function UpdateStatusModal({ feedback, onClose, onUpdate, isUpdating }) {
	const [status, setStatus] = useState(feedback.status || 'pending');
	const [adminNotes, setAdminNotes] = useState(feedback.admin_notes || '');

	const handleSubmit = (e) => {
		e.preventDefault();
		onUpdate(status, adminNotes);
	};

	return (
		<div 
			className="fixed inset-0 z-xxxl flex items-center justify-center p-15px transition-all duration-300"
			style={{
				backgroundColor: 'rgba(0, 0, 0, 0.5)',
				backdropFilter: 'blur(2px)',
			}}
			onClick={onClose}
		>
			<div 
				className="bg-whiteColor dark:bg-whiteColor-dark rounded-standard p-30px max-w-500px w-full shadow-dropdown relative z-small"
				onClick={(e) => e.stopPropagation()}
			>
				<button
					type="button"
					onClick={onClose}
					className="absolute top-15px right-15px text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark opacity-50 hover:opacity-75 transition-opacity p-5px"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-5 h-5 fill-current">
						<path d="M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z"></path>
					</svg>
				</button>

				<h2 className="text-size-24 font-bold text-blackColor dark:text-blackColor-dark mb-20px">Update Feedback Status</h2>
				
				<form onSubmit={handleSubmit} className="space-y-20px">
					<div>
						<label className="block text-size-14 font-medium text-blackColor dark:text-blackColor-dark mb-5px">
							Status <span className="text-red-500">*</span>
						</label>
						<select
							value={status}
							onChange={(e) => setStatus(e.target.value)}
							className="w-full p-10px text-size-14 bg-transparent border border-borderColor dark:border-borderColor-dark rounded-standard text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor"
							required
						>
							{FEEDBACK_STATUSES.map(s => (
								<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-size-14 font-medium text-blackColor dark:text-blackColor-dark mb-5px">
							Admin Notes
						</label>
						<textarea
							value={adminNotes}
							onChange={(e) => setAdminNotes(e.target.value)}
							rows={4}
							className="w-full p-10px text-size-14 bg-transparent border border-borderColor dark:border-borderColor-dark rounded-standard resize-none text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor"
							placeholder="Add admin notes (optional)"
							maxLength={5000}
						/>
					</div>

					<div className="flex justify-end gap-10px pt-10px">
						<Button variant="neutral" type="button" onClick={onClose}>
							Cancel
						</Button>
						<Button variant="primary" type="submit" disabled={isUpdating}>
							{isUpdating ? 'Updating...' : 'Update Status'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

