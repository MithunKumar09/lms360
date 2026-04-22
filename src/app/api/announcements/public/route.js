import { NextResponse } from 'next/server';
import { listAnnouncements } from '@/lib/db/announcements.js';

export async function GET(request) {
	try {
		const { searchParams } = new URL(request.url);
		const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

		const res = await listAnnouncements(
			{ visibility: 'public', status: 'active', activeWindow: true },
			{ page: 1, limit },
			{ by: 'start_at', dir: 'desc' }
		);

		// Public feed: allow caching for short time
		const headers = new Headers();
		headers.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=120');

		return NextResponse.json(res, { status: res.success ? 200 : 400, headers });
	} catch (error) {
		return NextResponse.json({ success: false, error: error.message || 'Failed to load public announcements' }, { status: 500 });
	}
}


