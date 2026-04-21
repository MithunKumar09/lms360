"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	internalAnnouncementCreateSchema,
	publicAnnouncementCreateSchema,
} from "@/lib/validation/announcementSchemas.js";
import { uploadAnnouncement } from "@/lib/utils/announcementUpload.js";
import { isValidWindow } from "@/lib/utils/announcementDateUtils.js";

const ROLE_OPTIONS = [
	{ value: "students", label: "Students" },
	{ value: "parents", label: "Parents" },
	{ value: "teachers", label: "Teachers" },
	{ value: "vendor", label: "Vendor" },
	{ value: "admin", label: "Admin" },
	{ value: "alumni", label: "Alumni" },
	{ value: "all", label: "All" },
];

const INTERNAL_CATEGORIES = [
	"general","exam","assignment","notice","holiday","event","others"
];
const PUBLIC_CATEGORIES = [
	"admission","event","job_vacancy","circular","public_notice","holiday"
];

export default function AnnouncementFormMain({ mode = "create", initialData = null }) {
	const router = useRouter();
	const [tab, setTab] = useState(initialData?.visibility || "internal"); // 'internal' | 'public'
	const [submitting, setSubmitting] = useState(false);
	const [attachments, setAttachments] = useState(initialData?.attachments || []);
	const [uploadProgress, setUploadProgress] = useState({}); // Track upload progress per file
	const [uploading, setUploading] = useState(false);

	const schema = useMemo(() => {
		return tab === "public" ? publicAnnouncementCreateSchema : internalAnnouncementCreateSchema;
	}, [tab]);

	const defaultValues = useMemo(() => {
		if (initialData) {
			// Map server fields to form
			return {
				...initialData,
				start_at: initialData.start_at ? initialData.start_at.slice(0, 16) : "",
				end_at: initialData.end_at ? initialData.end_at.slice(0, 16) : "",
			};
		}
		return tab === "public"
			? {
					visibility: "public",
					title: "",
					message: "",
					category: "admission",
					priority: "normal",
					show_on_homepage: false,
					status: "active",
					start_at: "",
					end_at: "",
					attachments: [],
			  }
			: {
					visibility: "internal",
					title: "",
					message: "",
					category: "general",
					priority: "normal",
					pin_to_dashboard: false,
					send_notification: false,
					status: "active",
					start_at: "",
					end_at: "",
					targets: [],
					attachments: [],
			  };
	}, [initialData, tab]);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
		reset,
	} = useForm({
		mode: "onSubmit", // Only validate when submit button is clicked
		reValidateMode: "onSubmit", // Re-validate on submit only
		resolver: zodResolver(schema),
		defaultValues,
		criteriaMode: "firstError", // Show first error only
	});

	const onUploadFile = async (file) => {
		console.log('🔵 [CLIENT] [AnnouncementForm] ===== FILE UPLOAD STARTED =====');
		console.log('🔵 [CLIENT] [AnnouncementForm] File:', { name: file.name, type: file.type, size: file.size });
		
		const fileId = `${file.name}-${Date.now()}`;
		setUploading(true);
		setUploadProgress(prev => ({ ...prev, [fileId]: { loaded: 0, total: file.size, name: file.name } }));
		
		try {
			const res = await uploadAnnouncement(file, (loaded, total) => {
				setUploadProgress(prev => ({ ...prev, [fileId]: { loaded, total, name: file.name } }));
			});
			console.log('🔵 [CLIENT] [AnnouncementForm] Upload response:', res);
		const att = {
			key: res.key,
			url: res.publicUrl,
			content_type: file.type,
			bytes: file.size,
		};
		const next = [...attachments, att];
			console.log('🔵 [CLIENT] [AnnouncementForm] Updated attachments:', next);
		setAttachments(next);
			setValue("attachments", next, { shouldValidate: false }); // Don't validate on file upload
			
			// Clear progress for this file
			setUploadProgress(prev => {
				const updated = { ...prev };
				delete updated[fileId];
				return updated;
			});
			setUploading(false);
			console.log('🟢 [CLIENT] [AnnouncementForm] ===== FILE UPLOAD SUCCESSFUL =====');
		} catch (error) {
			console.error('🔴 [CLIENT] [AnnouncementForm] ===== FILE UPLOAD ERROR =====');
			console.error('🔴 [CLIENT] [AnnouncementForm] Error:', error);
			// Clear progress on error
			setUploadProgress(prev => {
				const updated = { ...prev };
				delete updated[fileId];
				return updated;
			});
			setUploading(false);
			throw error;
		}
	};

	const removeAttachment = (index) => {
		const next = attachments.filter((_, i) => i !== index);
		setAttachments(next);
		setValue("attachments", next, { shouldValidate: false }); // Don't validate on removal
	};

	const onSubmit = async (values) => {
		if (submitting) return;
		
		console.log('🔵 [CLIENT] [AnnouncementForm] ===== SUBMIT STARTED =====');
		console.log('🔵 [CLIENT] [AnnouncementForm] Form values:', values);
		console.log('🔵 [CLIENT] [AnnouncementForm] Tab:', tab);
		console.log('🔵 [CLIENT] [AnnouncementForm] Attachments:', attachments);
		
		// client window validation
		if (!isValidWindow(values.start_at, values.end_at || null)) {
			console.error('🔴 [CLIENT] [AnnouncementForm] Validation failed: End date must be after start date');
			alert("End date must be after start date"); // Fallback toast
			return;
		}
		setSubmitting(true);
		try {
			const payload = {
				...values,
				visibility: tab,
				start_at: values.start_at ? new Date(values.start_at).toISOString() : null,
				end_at: values.end_at ? new Date(values.end_at).toISOString() : null,
				attachments,
			};

			console.log('🔵 [CLIENT] [AnnouncementForm] Payload to send:', payload);

			const method = mode === "edit" ? "PATCH" : "POST";
			const endpoint = mode === "edit"
				? `/api/announcements/${initialData?.id}`
				: `/api/announcements`;

			console.log('🔵 [CLIENT] [AnnouncementForm] Request:', { method, endpoint });

			const res = await fetch(endpoint, {
				method,
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(payload),
			});
			
			console.log('🔵 [CLIENT] [AnnouncementForm] Response status:', res.status);
			
			const data = await res.json().catch((err) => {
				console.error('🔴 [CLIENT] [AnnouncementForm] Failed to parse response:', err);
				return {};
			});
			
			console.log('🔵 [CLIENT] [AnnouncementForm] Response data:', data);
			
			if (!res.ok || !data.success) {
				console.error('🔴 [CLIENT] [AnnouncementForm] Request failed:', {
					ok: res.ok,
					success: data.success,
					error: data.error,
					errors: data.errors,
				});
				throw new Error(data.error || "Failed to save announcement");
			}
			
			console.log('🟢 [CLIENT] [AnnouncementForm] ===== SUBMIT SUCCESSFUL =====');
			// Success UX
			alert("Announcement saved successfully"); // Fallback toast
			router.push("/dashboards/admin-announcements");
		} catch (e) {
			console.error('🔴 [CLIENT] [AnnouncementForm] ===== SUBMIT ERROR =====');
			console.error('🔴 [CLIENT] [AnnouncementForm] Error:', e);
			console.error('🔴 [CLIENT] [AnnouncementForm] Error message:', e.message);
			console.error('🔴 [CLIENT] [AnnouncementForm] Error stack:', e.stack);
			alert(e.message || "Something went wrong"); // Fallback toast
		} finally {
			setSubmitting(false);
		}
	};

	const handleTab = (newTab) => {
		if (tab === newTab) return;
		setTab(newTab);
		// Reset with new defaults & resolver
		reset(undefined, { keepDefaultValues: false });
	};

	const startAt = watch("start_at");

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between bg-whiteColor dark:bg-whiteColor-dark rounded-xl shadow-accordion dark:shadow-accordion-dark px-5 py-4">
				<div className="flex items-center gap-3">
					<span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primaryColor/10 text-primaryColor">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-edit">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
						</svg>
					</span>
					<div>
						<h2 className="text-lg font-semibold tracking-tight">{mode === "edit" ? "Edit Announcement" : "Create Announcement"}</h2>
						<p className="text-xs text-gray-500">Fill the details and publish to your users or public site</p>
					</div>
				</div>
				<div className="hidden lg:flex items-center gap-2">
					<button type="button" onClick={() => router.back()} className="btn !py-2 !px-3 !rounded-md hover:!shadow !bg-gray-100 dark:!bg-gray-800 !text-gray-700 dark:!text-gray-200 hover:!bg-gray-200">Back</button>
					<button type="submit" form="announcement-form" className="btn btn-primary !py-2 !px-3 !rounded-md !shadow-sm hover:!shadow focus:!ring-2 focus:!ring-primaryColor/40 !bg-primaryColor !text-white hover:!bg-primaryColor/90" disabled={submitting}>
						{submitting ? (
							<span className="inline-flex items-center gap-2">
								<span className="inline-block w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
								Saving...
							</span>
						) : (mode === "edit" ? "Update" : "Publish")}
					</button>
				</div>
			</div>

			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => handleTab("internal")}
					className={`px-3 py-2 rounded-md transition ${tab === "internal" ? "bg-lightGrey7 dark:bg-lightGrey7-dark text-blackColor dark:text-blackColor-dark shadow" : "bg-whiteColor dark:bg-whiteColor-dark hover:bg-gray-100 dark:hover:bg-gray-700"}`}
					disabled={submitting}
				>
					Internal
				</button>
				<button
					type="button"
					onClick={() => handleTab("public")}
					className={`px-3 py-2 rounded-md transition ${tab === "public" ? "bg-lightGrey7 dark:bg-lightGrey7-dark text-blackColor dark:text-blackColor-dark shadow" : "bg-whiteColor dark:bg-whiteColor-dark hover:bg-gray-100 dark:hover:bg-gray-700"}`}
					disabled={submitting}
				>
					Public
				</button>
			</div>

			<form id="announcement-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-5 bg-whiteColor dark:bg-whiteColor-dark rounded-xl shadow-accordion dark:shadow-accordion-dark p-5">
				<div className="col-span-1 lg:col-span-2">
					<label className="block text-sm font-medium mb-1">Title</label>
					<input className="w-full input !rounded-md" placeholder="Title" {...register("title")} disabled={submitting} />
					{errors.title && <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>}
				</div>

				<div className="col-span-1 lg:col-span-2">
					<label className="block text-sm font-medium mb-1">Message</label>
					<textarea className="w-full textarea min-h-[140px] !rounded-md" placeholder="Write message..." {...register("message")} disabled={submitting} />
					{errors.message && <p className="text-red-600 text-sm mt-1">{errors.message.message}</p>}
				</div>

				{tab === "internal" ? (
					<>
						<div>
							<label className="block text-sm font-medium mb-1">Type</label>
							<select className="w-full select !rounded-md" {...register("category")} disabled={submitting}>
								{INTERNAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
							</select>
							{errors.category && <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">Priority</label>
							<select className="w-full select !rounded-md" {...register("priority")} disabled={submitting}>
								<option value="normal">Normal</option>
								<option value="important">Important</option>
								<option value="urgent">Urgent</option>
							</select>
							{errors.priority && <p className="text-red-600 text-sm mt-1">{errors.priority.message}</p>}
						</div>

						<div className="col-span-1 lg:col-span-2">
							<label className="block text-sm font-medium mb-1">Target Roles</label>
							<div className="flex flex-wrap gap-2">
								{ROLE_OPTIONS.map((opt) => (
									<label key={opt.value} className="inline-flex items-center gap-2 border rounded-md px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
										<input type="checkbox" value={opt.value} onChange={(e) => {
											const checked = e.target.checked;
											const prev = Array.isArray(watch("targets")) ? watch("targets") : [];
											const next = new Set(prev.map(t => t.target_role).filter(Boolean));
											if (checked) next.add(opt.value); else next.delete(opt.value);
											const targets = Array.from(next).map(r => ({ target_role: r }));
											setValue("targets", targets, { shouldValidate: false }); // Don't validate on checkbox change
										}} disabled={submitting} />
										<span>{opt.label}</span>
									</label>
								))}
							</div>
							{errors.targets && <p className="text-red-600 text-sm mt-1">Invalid targets</p>}
						</div>

						<div className="col-span-1 lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
							<label className="inline-flex items-center gap-2">
								<input type="checkbox" {...register("send_notification")} disabled={submitting} />
								<span>Send Notification</span>
							</label>
							<label className="inline-flex items-center gap-2">
								<input type="checkbox" {...register("pin_to_dashboard")} disabled={submitting} />
								<span>Pin to Dashboard</span>
							</label>
						</div>
					</>
				) : (
					<>
						<div>
							<label className="block text-sm font-medium mb-1">Category</label>
							<select className="w-full select !rounded-md" {...register("category")} disabled={submitting}>
								{PUBLIC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
							</select>
							{errors.category && <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">Priority</label>
							<select className="w-full select !rounded-md" {...register("priority")} disabled={submitting}>
								<option value="normal">Normal</option>
								<option value="highlight">Highlight</option>
								<option value="top_banner">Top Banner</option>
							</select>
							{errors.priority && <p className="text-red-600 text-sm mt-1">{errors.priority.message}</p>}
						</div>
						<div className="col-span-1 lg:col-span-2">
							<label className="inline-flex items-center gap-2">
								<input type="checkbox" {...register("show_on_homepage")} disabled={submitting} />
								<span>Show on Homepage</span>
							</label>
						</div>
					</>
				)}

				<div>
					<label className="block text-sm font-medium mb-1">Start Date</label>
					<input type="datetime-local" className="w-full input !rounded-md" {...register("start_at")} disabled={submitting} />
					{errors.start_at && <p className="text-red-600 text-sm mt-1">{errors.start_at.message}</p>}
				</div>
				<div>
					<label className="block text-sm font-medium mb-1">End Date (optional)</label>
					<input type="datetime-local" className="w-full input !rounded-md" min={startAt || undefined} {...register("end_at")} disabled={submitting} />
					{errors.end_at && <p className="text-red-600 text-sm mt-1">{errors.end_at.message}</p>}
				</div>

				<div>
					<label className="block text-sm font-medium mb-1">Status</label>
					<select className="w-full select !rounded-md" {...register("status")} disabled={submitting}>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>
				</div>

				<div className="col-span-1 lg:col-span-2">
					<label className="block text-sm font-medium mb-2">Attachments</label>
					<div className="flex items-center gap-3">
						<label className="relative cursor-pointer">
						<input
							type="file"
							accept=".pdf,.doc,.docx,image/*"
							onChange={async (e) => {
								const f = e.target.files?.[0];
								if (!f) return;
								try {
									await onUploadFile(f);
								} catch (err) {
									alert(err.message || "Upload failed");
								} finally {
									e.target.value = "";
								}
							}}
								disabled={submitting || uploading}
								className="hidden"
							/>
							<span className={`inline-flex items-center gap-2 px-4 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 transition-colors ${(submitting || uploading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
									<polyline points="17 8 12 3 7 8"></polyline>
									<line x1="12" y1="3" x2="12" y2="15"></line>
								</svg>
								{uploading ? "Uploading..." : "Choose File"}
							</span>
						</label>
					</div>
					
					{/* Upload Progress */}
					{Object.keys(uploadProgress).length > 0 && (
						<div className="mt-3 space-y-2">
							{Object.entries(uploadProgress).map(([fileId, progress]) => {
								const percentage = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
								return (
									<div key={fileId} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
										<div className="flex items-center justify-between mb-2">
											<span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">
												{progress.name}
											</span>
											<span className="text-sm text-gray-500 dark:text-gray-400">{percentage}%</span>
										</div>
										<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
											<div
												className="bg-primaryColor h-2 rounded-full transition-all duration-300"
												style={{ width: `${percentage}%` }}
											></div>
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											{((progress.loaded || 0) / 1024 / 1024).toFixed(2)} MB / {((progress.total || 0) / 1024 / 1024).toFixed(2)} MB
										</div>
									</div>
								);
							})}
						</div>
					)}
					
					{/* Image Previews */}
					{attachments.length > 0 && (
						<div className="mt-4">
							<h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Uploaded Files:</h4>
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
								{attachments.map((a, idx) => {
									const isImage = a.content_type && a.content_type.startsWith('image/');
									return (
										<div key={idx} className="relative group bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
											{isImage ? (
												<>
													<img
														src={a.url}
														alt={`Attachment ${idx + 1}`}
														className="w-full h-32 object-cover"
													/>
													<div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
														<button
															type="button"
															onClick={() => removeAttachment(idx)}
															disabled={submitting}
															className="opacity-0 group-hover:opacity-100 bg-red-500 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-opacity hover:bg-red-600"
														>
															Remove
														</button>
													</div>
												</>
											) : (
												<div className="p-4 flex flex-col items-center justify-center h-32">
													<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-2">
														<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
														<polyline points="14 2 14 8 20 8"></polyline>
														<line x1="16" y1="13" x2="8" y2="13"></line>
														<line x1="16" y1="17" x2="8" y2="17"></line>
														<polyline points="10 9 9 9 8 9"></polyline>
													</svg>
													<span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center px-2">
														{a.url.split('/').pop() || 'Document'}
													</span>
													<button
														type="button"
														onClick={() => removeAttachment(idx)}
														disabled={submitting}
														className="mt-2 text-red-600 text-xs hover:text-red-700"
													>
														Remove
													</button>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}
				</div>

				<div className="col-span-1 lg:col-span-2 flex items-center gap-3 pt-2">
					<button type="submit" className="btn btn-primary !rounded-md !shadow-sm hover:!shadow focus:!ring-2 focus:!ring-primaryColor/40 flex items-center gap-2 !bg-primaryColor !text-white hover:!bg-primaryColor/90" disabled={submitting}>
						{submitting ? (
							<>
								<span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
								Saving...
							</>
						) : (
							<>
								<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-save">
									<path d="M19 21H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline>
								</svg>
								{mode === "edit" ? "Update Announcement" : "Create Announcement"}
							</>
						)}
					</button>
					<button type="button" className="btn !rounded-md hover:!shadow !bg-gray-100 dark:!bg-gray-800 !text-gray-700 dark:!text-gray-200 hover:!bg-gray-200" onClick={() => router.back()} disabled={submitting}>Cancel</button>
				</div>
			</form>
			{/* Sticky footer action (mobile) */}
			<div className="lg:hidden fixed left-0 right-0 bottom-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t">
				<div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-end gap-2">
					<button type="button" onClick={() => router.back()} className="btn !py-2 !px-3 !rounded-md !bg-gray-100 dark:!bg-gray-800 !text-gray-700 dark:!text-gray-200 hover:!bg-gray-200">Back</button>
					<button type="submit" form="announcement-form" className="btn btn-primary !py-2 !px-3 !rounded-md !bg-primaryColor !text-white hover:!bg-primaryColor/90" disabled={submitting}>
						{submitting ? "Saving..." : (mode === "edit" ? "Update" : "Publish")}
					</button>
				</div>
			</div>
		</div>
	);
}


