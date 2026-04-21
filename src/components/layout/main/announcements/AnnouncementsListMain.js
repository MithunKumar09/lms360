"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAnnouncements, useDeleteAnnouncement } from "@/hooks/api/useAnnouncements.js";

function Badge({ children, color = "gray" }) {
	const map = {
		green: "bg-green-100 text-green-800",
		red: "bg-red-100 text-red-800",
		amber: "bg-amber-100 text-amber-800",
		blue: "bg-blue-100 text-blue-800",
		gray: "bg-gray-100 text-gray-800",
	};
	return <span className={`inline-flex px-2 py-0.5 rounded text-xs ${map[color] || map.gray}`}>{children}</span>;
}

function cls(...a) { return a.filter(Boolean).join(" "); }
function Button({ children, variant = "primary", className = "", href, ...rest }) {
	const base = "inline-flex items-center justify-center gap-2 transition rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2";
	const variants = {
		primary: "text-white bg-gradient-to-tr from-primaryColor to-primaryColor/90 hover:to-primaryColor/80 shadow-sm focus:ring-primaryColor/40",
		soft: "text-primaryColor bg-primaryColor/10 hover:bg-primaryColor/15 focus:ring-primaryColor/20",
		neutral: "text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 focus:ring-gray-300",
		danger: "text-red-600 bg-red-50 hover:bg-red-100 focus:ring-red-300",
		ghost: "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800",
	};
	const cn = cls(base, variants[variant] || variants.primary, className);
	if (href) {
		return <Link href={href} className={cn} {...rest}>{children}</Link>;
	}
	return <button className={cn} {...rest}>{children}</button>;
}

export default function AnnouncementsListMain() {
	const pathname = usePathname();
	const rolePrefix = (() => {
		const seg = pathname.split("/")[2] || "";
		if (seg.startsWith("superadmin-")) return "superadmin";
		if (seg.startsWith("admin-")) return "admin";
		if (seg.startsWith("vendor-")) return "vendor";
		return null;
	})();
	const baseListPath = rolePrefix ? `/dashboards/${rolePrefix}-announcements` : `/dashboards/announcements`;
	const newPath = `${baseListPath}/new`;
	const bulkPath = `${baseListPath}/bulk`;
	
	// UI state (local only)
	const [q, setQ] = useState("");
	const [filters, setFilters] = useState({
		visibility: "",
		status: "",
		category: "",
		priority: "",
		from: "",
		to: "",
	});
	const [sort, setSort] = useState({ by: "created_at", dir: "desc" });
	const [page, setPage] = useState(1);
	const limit = 10;

	// Build query filters for React Query
	const queryFilters = useMemo(() => {
		const params = {
			page: String(page),
			limit: String(limit),
		};
		
		if (q) params.q = q;
		if (filters.visibility) params.visibility = filters.visibility;
		if (filters.status) params.status = filters.status;
		if (filters.category) params.category = filters.category;
		if (filters.priority) params.priority = filters.priority;
		if (filters.from) params.from = filters.from;
		if (filters.to) params.to = filters.to;
		if (sort.by) params.sortBy = sort.by;
		if (sort.dir) params.sortDir = sort.dir;
		
		return params;
	}, [page, limit, q, filters, sort]);

	// Fetch announcements using React Query
	const { data, isLoading, error, refetch } = useAnnouncements({
		filters: queryFilters,
		enabled: true,
	});

	const items = data?.announcements || [];
	const pagination = data?.pagination || { page: 1, limit: 10, total: 0, pages: 0 };

	// Delete mutation
	const deleteAnnouncement = useDeleteAnnouncement();

	const onSearch = (e) => {
		e.preventDefault();
		setPage(1);
	};

	const onDelete = async (id) => {
		if (!window.confirm("Are you sure you want to delete this announcement?")) return;
		try {
			await deleteAnnouncement.mutateAsync(id);
		} catch (e) {
			// Error is handled by the mutation hook
			console.error('Delete error:', e);
		}
	};

	const changePage = (p) => {
		if (p < 1 || p > (pagination.pages || 1)) return;
		setPage(p);
	};

	const visibilityIcon = (v) => (
		<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-eye">
			{v === "public" ? <circle cx="12" cy="12" r="3"></circle> : null}
			<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
		</svg>
	);

	return (
		<div className="space-y-4">
			{/* Error State */}
			{error && (
				<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
					Error: {error.message || 'Failed to load announcements'} 
					<button className="btn ml-2" onClick={() => refetch()}>Retry</button>
				</div>
			)}

			{/* Header */}
			<div className="flex items-center justify-between bg-whiteColor dark:bg-whiteColor-dark rounded shadow-accordion dark:shadow-accordion-dark px-4 py-3">
				<div className="flex items-center gap-3">
					<span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primaryColor/10 text-primaryColor">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-bell">
							<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
							<path d="M13.73 21a2 2 0 01-3.46 0"></path>
						</svg>
					</span>
					<div>
						<h2 className="text-base font-semibold">Announcements</h2>
						<p className="text-xs text-gray-500">Create, filter and manage internal/public announcements</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="primary" href={newPath}>
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-plus">
							<line x1="12" y1="5" x2="12" y2="19"></line>
							<line x1="5" y1="12" x2="19" y2="12"></line>
						</svg>
						Create
					</Button>
					<Button variant="neutral" href={bulkPath}>
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-upload-cloud">
							<path d="M16 16l-4-4-4 4"></path><path d="M12 12v9"></path><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"></path>
						</svg>
						Bulk Import
					</Button>
				</div>
			</div>
			<form onSubmit={onSearch} className="flex flex-wrap gap-2 items-end bg-whiteColor dark:bg-whiteColor-dark rounded shadow-accordion dark:shadow-accordion-dark p-3">
				<input className="input" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
				<select className="select" value={filters.visibility} onChange={(e) => setFilters({ ...filters, visibility: e.target.value })}>
					<option value="">All</option>
					<option value="internal">Internal</option>
					<option value="public">Public</option>
				</select>
				<select className="select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
					<option value="">Any status</option>
					<option value="active">Active</option>
					<option value="inactive">Inactive</option>
				</select>
				<select className="select" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
					<option value="">Any priority</option>
					<option value="normal">Normal</option>
					<option value="important">Important</option>
					<option value="urgent">Urgent</option>
					<option value="highlight">Highlight</option>
					<option value="top_banner">Top Banner</option>
				</select>
				<input type="date" className="input" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
				<input type="date" className="input" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
				<select className="select" value={sort.by} onChange={(e) => setSort({ ...sort, by: e.target.value })}>
					<option value="created_at">Created</option>
					<option value="updated_at">Updated</option>
					<option value="start_at">Start</option>
					<option value="priority">Priority</option>
				</select>
				<select className="select" value={sort.dir} onChange={(e) => setSort({ ...sort, dir: e.target.value })}>
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

			<div className="bg-whiteColor dark:bg-whiteColor-dark rounded shadow-accordion dark:shadow-accordion-dark">
				{isLoading ? (
					<div className="p-6 flex items-center gap-3 text-gray-600">
						<span className="inline-block w-4 h-4 rounded-full border-2 border-primaryColor border-t-transparent animate-spin"></span>
						<span className="text-sm">Loading announcements...</span>
					</div>
				) : items.length === 0 ? (
					<div className="p-8 text-center text-sm text-gray-500">No announcements found</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead>
								<tr className="text-left">
									<th className="px-3 py-2">Title</th>
									<th className="px-3 py-2">Visibility</th>
									<th className="px-3 py-2">Category</th>
									<th className="px-3 py-2">Priority</th>
									<th className="px-3 py-2">Status</th>
									<th className="px-3 py-2">Start</th>
									<th className="px-3 py-2">Actions</th>
								</tr>
							</thead>
							<tbody>
								{items.map((it) => (
									<tr key={it.id} className="border-t">
										<td className="px-3 py-2">{it.title}</td>
										<td className="px-3 py-2 inline-flex items-center gap-1">{visibilityIcon(it.visibility)} {it.visibility}</td>
										<td className="px-3 py-2">{it.category}</td>
										<td className="px-3 py-2">
											<Badge color={it.priority === "urgent" || it.priority === "top_banner" ? "red" : it.priority === "important" || it.priority === "highlight" ? "amber" : "gray"}>
												{it.priority}
											</Badge>
										</td>
										<td className="px-3 py-2">
											<Badge color={it.status === "active" ? "green" : "gray"}>{it.status}</Badge>
										</td>
										<td className="px-3 py-2">{it.start_at ? new Date(it.start_at).toLocaleString() : "-"}</td>
										<td className="px-3 py-2 flex gap-2">
											<Button variant="soft" className="!text-xs !py-1.5 !px-2.5" href={`${baseListPath}/${it.id}/edit`}>
												<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-edit mr-1">
													<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
													<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
												</svg>
												Edit
											</Button>
											<Button 
												variant="danger" 
												className="!text-xs !py-1.5 !px-2.5" 
												onClick={() => onDelete(it.id)}
												disabled={deleteAnnouncement.isPending}
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-trash mr-1">
													<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>
												</svg>
												{deleteAnnouncement.isPending ? 'Deleting...' : 'Delete'}
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<div className="flex items-center justify-between">
				<div className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages || 1} ({pagination.total} results)</div>
				<div className="flex gap-2">
					<Button variant="neutral" className="disabled:opacity-50" onClick={() => changePage(pagination.page - 1)} disabled={pagination.page <= 1}>Prev</Button>
					<Button variant="neutral" className="disabled:opacity-50" onClick={() => changePage(pagination.page + 1)} disabled={pagination.page >= (pagination.pages || 1)}>Next</Button>
				</div>
			</div>
		</div>
	);
}
