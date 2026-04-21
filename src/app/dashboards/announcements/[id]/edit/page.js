"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AnnouncementFormMain from "@/components/layout/main/announcements/AnnouncementFormMain.js";
import AuthGuard from "@/components/shared/guards/AuthGuard.js";

export default function EditAnnouncementPage() {
	const params = useParams();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		let mounted = true;
		async function load() {
			try {
				const res = await fetch(`/api/announcements/${params.id}`, { credentials: "include" });
				const json = await res.json().catch(() => ({}));
				if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
				if (mounted) {
					setData(json.announcement);
					setLoading(false);
				}
			} catch (e) {
				if (mounted) {
					setError(e.message);
					setLoading(false);
				}
			}
		}
		load();
		return () => { mounted = false; };
	}, [params.id]);

	if (loading) return <div className="p-4">Loading...</div>;
	if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

	return (
		<AuthGuard allowedRoles={['superadmin', 'admin']}>
			<div className="p-4">
				<h1 className="text-xl font-semibold mb-4">Edit Announcement</h1>
				<AnnouncementFormMain mode="edit" initialData={data} />
			</div>
		</AuthGuard>
	);
}


