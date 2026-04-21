"use client";

import { useState } from "react";

export default function AnnouncementsBulkImportMain() {
	const [file, setFile] = useState(null);
	const [preview, setPreview] = useState(null);
	const [loading, setLoading] = useState(false);
	const [importing, setImporting] = useState(false);
	const [options, setOptions] = useState({ skipDuplicates: true, updateOnDuplicate: false });

	const onPreview = async () => {
		if (!file) return;
		setLoading(true);
		try {
			const form = new FormData();
			form.append("file", file);
			const res = await fetch("/api/announcements/bulk/preview", {
				method: "POST",
				body: form,
				credentials: "include",
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.success) throw new Error(data.error || "Preview failed");
			setPreview(data);
		} catch (e) {
			alert(e.message || "Preview failed");
		} finally {
			setLoading(false);
		}
	};

	const onImport = async () => {
		if (!preview?.rows?.length) return;
		setImporting(true);
		try {
			const res = await fetch("/api/announcements/bulk", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ rows: preview.rows.filter(r => r.valid).map(r => r.data), options }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.success) throw new Error(data.error || "Import failed");
			setPreview({
				...preview,
				importResult: data,
			});
		} catch (e) {
			alert(e.message || "Import failed");
		} finally {
			setImporting(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<input type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
				<button className="btn btn-primary" onClick={onPreview} disabled={!file || loading}>
					{loading ? "Validating..." : "Preview"}
				</button>
				<label className="inline-flex items-center gap-2 ml-4">
					<input type="checkbox" checked={options.skipDuplicates} onChange={(e) => setOptions({ ...options, skipDuplicates: e.target.checked })} />
					<span>Skip Duplicates</span>
				</label>
				<label className="inline-flex items-center gap-2">
					<input type="checkbox" checked={options.updateOnDuplicate} onChange={(e) => setOptions({ ...options, updateOnDuplicate: e.target.checked })} />
					<span>Update on Duplicate</span>
				</label>
			</div>

			{preview && (
				<div className="space-y-3">
					<div className="text-sm text-gray-600">Total: {preview.summary.total} • Valid: {preview.summary.valid} • Invalid: {preview.summary.invalid}</div>
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead>
								<tr className="text-left">
									<th className="px-3 py-2">#</th>
									<th className="px-3 py-2">Visibility</th>
									<th className="px-3 py-2">Title</th>
									<th className="px-3 py-2">Category</th>
									<th className="px-3 py-2">Priority</th>
									<th className="px-3 py-2">Start</th>
									<th className="px-3 py-2">Valid</th>
								</tr>
							</thead>
							<tbody>
								{preview.rows.map((r) => (
									<tr key={r.index} className="border-t">
										<td className="px-3 py-2">{r.index}</td>
										<td className="px-3 py-2">{r.data?.visibility || "-"}</td>
										<td className="px-3 py-2">{r.data?.title || "-"}</td>
										<td className="px-3 py-2">{r.data?.category || "-"}</td>
										<td className="px-3 py-2">{r.data?.priority || "-"}</td>
										<td className="px-3 py-2">{r.data?.start_at ? new Date(r.data.start_at).toLocaleString() : "-"}</td>
										<td className="px-3 py-2">{r.valid ? "✅" : "❌"}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div>
						<button className="btn btn-primary" onClick={onImport} disabled={importing || preview.summary.valid === 0}>
							{importing ? "Importing..." : "Import Valid Rows"}
						</button>
					</div>

					{preview.importResult && (
						<div className="bg-whiteColor dark:bg-whiteColor-dark rounded p-3">
							<div className="font-medium mb-2">Import Results</div>
							<div className="text-sm text-gray-600">
								Created: {preview.importResult.summary.created} • Updated: {preview.importResult.summary.updated} • Skipped: {preview.importResult.summary.skipped} • Errors: {preview.importResult.summary.errors}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}


