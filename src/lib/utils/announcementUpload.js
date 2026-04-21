/**
 * Announcement Upload Utilities
 * 
 * Client-side helpers for uploading announcement attachments to Cloudflare R2
 * using the existing presign/validate endpoints. Validates file types and size
 * according to announcement rules (images + docs up to 5MB).
 * 
 * @module utils/announcementUpload
 */

import { uploadToR2 as baseUploadToR2, calculateChecksum } from './imageUpload.js';

const ANNOUNCEMENTS_PREFIX = 'announcements';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const IMAGE_TYPES = ['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml'];
const DOC_TYPES = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...DOC_TYPES];

/**
 * Validate announcement attachment file
 * @param {File} file
 * @returns {{valid: boolean, error?: string}}
 */
export function validateAnnouncementFile(file) {
	if (!file) {
		return { valid: false, error: 'File is required' };
	}
	const type = (file.type || '').toLowerCase();
	if (!ALLOWED_TYPES.includes(type)) {
		return { valid: false, error: `Invalid file type: ${type}. Allowed: ${ALLOWED_TYPES.join(', ')}` };
	}
	if (file.size > MAX_BYTES) {
		return { valid: false, error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds ${MAX_BYTES / 1024 / 1024}MB` };
	}
	return { valid: true };
}

/**
 * Get file extension for announcements (images + docs)
 * @param {File} file
 * @returns {string}
 */
function getAnnouncementExt(file) {
	const map = {
		'image/png': 'png',
		'image/jpeg': 'jpeg',
		'image/jpg': 'jpg',
		'image/webp': 'webp',
		'image/svg+xml': 'svg',
		'application/pdf': 'pdf',
		'application/msword': 'doc',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
	};
	return map[(file.type || '').toLowerCase()] || 'bin';
}

/**
 * Request presigned URL for announcements
 * @param {File} file
 * @returns {Promise<{uploadUrl: string, key: string, publicUrl: string, headersToSet: Record<string,string>}>}
 */
export async function getPresignedUrlForAnnouncement(file) {
	const validation = validateAnnouncementFile(file);
	if (!validation.valid) {
		throw new Error(validation.error);
	}
	const checksum = await calculateChecksum(file);
	const ext = getAnnouncementExt(file);

	const res = await fetch('/api/uploads/r2/presign', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({
			contentType: file.type,
			ext,
			keyPrefix: ANNOUNCEMENTS_PREFIX,
			bytes: file.size,
			checksum,
		}),
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || 'Failed to get presigned URL');
	}
	return await res.json();
}

/**
 * Upload announcement attachment to R2
 * @param {File} file
 * @param {(uploaded:number,total:number)=>void} [onProgress]
 * @returns {Promise<{publicUrl: string, key: string}>}
 */
export async function uploadAnnouncement(file, onProgress) {
	const presign = await getPresignedUrlForAnnouncement(file);
	await baseUploadToR2(file, presign.uploadUrl, presign.headersToSet, onProgress);
	return { publicUrl: presign.publicUrl, key: presign.key };
}

export default {
	validateAnnouncementFile,
	getPresignedUrlForAnnouncement,
	uploadAnnouncement,
};


