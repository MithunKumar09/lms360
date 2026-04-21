"use client";

export default function AnnouncementDetail({ announcement }) {
	if (!announcement) return null;
	return (
		<div className="space-y-3">
			<div className="text-lg font-semibold">{announcement.title}</div>
			<div className="text-sm text-gray-600">Visibility: {announcement.visibility} • Category: {announcement.category}</div>
			<div className="prose max-w-none text-sm">{announcement.message}</div>
			<div className="text-sm">Priority: {announcement.priority} • Status: {announcement.status}</div>
			<div className="text-sm">Start: {announcement.start_at ? new Date(announcement.start_at).toLocaleString() : "-"}</div>
			<div className="text-sm">End: {announcement.end_at ? new Date(announcement.end_at).toLocaleString() : "-"}</div>
			{Array.isArray(announcement.targets) && announcement.targets.length > 0 && (
				<div className="text-sm">
					<div className="font-medium mb-1">Targets</div>
					<ul className="list-disc pl-5">
						{announcement.targets.map((t, i) => (
							<li key={i}>{t.target_role || t.target_class_label || t.target_class_id}</li>
						))}
					</ul>
				</div>
			)}
			{Array.isArray(announcement.attachments) && announcement.attachments.length > 0 && (
				<div className="text-sm">
					<div className="font-medium mb-1">Attachments</div>
					<ul className="list-disc pl-5">
						{announcement.attachments.map((a, i) => (
							<li key={i}><a className="text-primary underline" href={a.url} target="_blank" rel="noreferrer">{a.url}</a></li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}


