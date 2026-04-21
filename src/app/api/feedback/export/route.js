/**
 * Feedback Export API Route
 * 
 * Exports feedbacks to CSV or XLSX format.
 * 
 * GET /api/feedback/export
 * 
 * Query params:
 * - ?format=csv|xlsx (default: csv)
 * - ?status=pending|reviewed|resolved|archived
 * - ?category=general|bug|feature|performance|ui/ux|other
 * - ?from=2024-01-01&to=2024-12-31
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { exportFeedbacks } from '@/lib/db/feedbacks.js';
import { generateCSV, generateXLSX } from '@/lib/utils/fileParser.js';

/**
 * Transform feedback to export format
 */
function transformFeedbackForExport(feedback) {
	return {
		id: feedback.id || '',
		user_id: feedback.user_id || '',
		user_role: feedback.user_role || '',
		message: feedback.message || '',
		emotion: feedback.rating || '', // rating stores emotion value (1-5)
		category: feedback.category || '',
		status: feedback.status || '',
		admin_notes: feedback.admin_notes || '',
		reviewed_by: feedback.reviewed_by || '',
		reviewed_at: feedback.reviewed_at ? new Date(feedback.reviewed_at).toISOString() : '',
		created_at: feedback.created_at ? new Date(feedback.created_at).toISOString() : '',
		updated_at: feedback.updated_at ? new Date(feedback.updated_at).toISOString() : '',
	};
}

/**
 * GET /api/feedback/export
 * 
 * Exports feedbacks to CSV or XLSX format
 */
export async function GET(request) {
	try {
		// Only superadmin can export feedbacks
		const session = await requireRole(request, ['superadmin']);

		// Parse format from query parameter (default: csv)
		const { searchParams } = new URL(request.url);
		const format = searchParams.get('format')?.toLowerCase() || 'csv';

		// Parse query parameters for filters
		const filters = {
			status: searchParams.get('status') || undefined,
			category: searchParams.get('category') || undefined,
			from: searchParams.get('from') || undefined,
			to: searchParams.get('to') || undefined,
		};

		// Fetch all feedbacks matching filters
		const exportRes = await exportFeedbacks(filters);

		if (!exportRes.success) {
			return NextResponse.json(
				{
					success: false,
					error: exportRes.error || 'Failed to export feedbacks',
				},
				{ status: 400 }
			);
		}

		const feedbacks = exportRes.feedbacks || [];

		// Transform feedbacks for export
		const exportData = feedbacks.map(transformFeedbackForExport);

		// Define headers
		const headers = [
			'id',
			'user_id',
			'user_role',
			'message',
			'emotion',
			'category',
			'status',
			'admin_notes',
			'reviewed_by',
			'reviewed_at',
			'created_at',
			'updated_at',
		];

		// Generate file content
		let content;
		let contentType;
		let filename;

		if (format === 'xlsx') {
			try {
				content = await generateXLSX(exportData, headers, { sheetName: 'Feedbacks' });
				contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
				filename = `feedbacks-export-${new Date().toISOString().split('T')[0]}.xlsx`;
			} catch (error) {
				// If xlsx library not available, return CSV instead
				console.warn('XLSX library not available, falling back to CSV:', error.message);
				content = generateCSV(exportData, headers);
				contentType = 'text/csv';
				filename = `feedbacks-export-${new Date().toISOString().split('T')[0]}.csv`;
			}
		} else {
			content = generateCSV(exportData, headers);
			contentType = 'text/csv';
			filename = `feedbacks-export-${new Date().toISOString().split('T')[0]}.csv`;
		}

		// Log in development
		if (process.env.NODE_ENV !== 'production') {
			console.log('📋 [EXPORT] Exported feedbacks:', {
				count: exportData.length,
				format,
			});
		}

		// Create response with file download
		return new NextResponse(content, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': '0',
			},
		});
	} catch (error) {
		console.error('Error exporting feedbacks:', error);

		// Handle authentication errors
		if (error.status === 401 || error.status === 403) {
			return NextResponse.json(
				{
					success: false,
					error: 'Unauthorized. Superadmin access required.',
				},
				{ status: error.status }
			);
		}

		return NextResponse.json(
			{
				success: false,
				error: error.message || 'Failed to export feedbacks',
			},
			{ status: 500 }
		);
	}
}

