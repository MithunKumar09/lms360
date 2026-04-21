"use client";

import AnnouncementsBulkImportMain from "@/components/layout/main/announcements/AnnouncementsBulkImportMain.js";
import AuthGuard from "@/components/shared/guards/AuthGuard.js";

export default function AnnouncementsBulkPage() {
	return (
		<AuthGuard allowedRoles={['superadmin', 'admin']}>
			<div className="p-4">
				<h1 className="text-xl font-semibold mb-4">Bulk Import Announcements</h1>
				<AnnouncementsBulkImportMain />
			</div>
		</AuthGuard>
	);
}


