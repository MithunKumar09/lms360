"use client";

import AnnouncementFormMain from "@/components/layout/main/announcements/AnnouncementFormMain.js";
import AuthGuard from "@/components/shared/guards/AuthGuard.js";

export default function NewAnnouncementPage() {
	return (
		<AuthGuard allowedRoles={['superadmin', 'admin']}>
			<div className="p-4">
				<h1 className="text-xl font-semibold mb-4">Create Announcement</h1>
				<AnnouncementFormMain mode="create" />
			</div>
		</AuthGuard>
	);
}


