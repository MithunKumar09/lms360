"use client";

import AnnouncementsListMain from "@/components/layout/main/announcements/AnnouncementsListMain.js";
import AuthGuard from "@/components/shared/guards/AuthGuard.js";

export default function AnnouncementsListPage() {
	return (
		<AuthGuard allowedRoles={['superadmin', 'admin']}>
			<div className="p-4">
				<h1 className="text-xl font-semibold mb-4">Announcements</h1>
				<AnnouncementsListMain />
			</div>
		</AuthGuard>
	);
}


