"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AnnouncementFormMain from "@/components/layout/main/announcements/AnnouncementFormMain.js";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export default function Vendor_EditAnnouncementPage() {
	const params = useParams();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const res = await fetch(`/api/announcements/${params.id}`, { credentials: "include" });
				const json = await res.json().catch(() => ({}));
				if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
				if (mounted) { setData(json.announcement); setLoading(false); }
			} catch (e) { if (mounted) { setError(e.message); setLoading(false); } }
		})();
		return () => { mounted = false; };
	}, [params.id]);

	return (
		<PageWrapper>
			<main>
				<DsahboardWrapper>
					<DashboardContainer>
						{loading ? <div>Loading...</div> : error ? <div className="text-red-600">Error: {error}</div> : <AnnouncementFormMain mode="edit" initialData={data} />}
					</DashboardContainer>
				</DsahboardWrapper>
				<ThemeController />
			</main>
		</PageWrapper>
	);
}


