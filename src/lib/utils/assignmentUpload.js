/**
 * Assignment File Upload Utilities
 * 
 * Client-side helpers for uploading assignment files (PDFs, Word docs, images, etc.) to Cloudflare R2
 * Similar to announcementUpload but for assignment attachments.
 * 
 * @module utils/assignmentUpload
 */

import { calculateChecksum } from './imageUpload.js';

const ASSIGNMENTS_PREFIX = 'assignments';
const MAX_BYTES = 50 * 1024 * 1024; // 50MB (same as AddAssignmentForm)
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif', 'image/bmp'];
const DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...DOC_TYPES, ...VIDEO_TYPES];

/**
 * Validate assignment file
 * @param {File} file
 * @returns {{valid: boolean, error?: string}}
 */
export function validateAssignmentFile(file) {
  if (!file) {
    return { valid: false, error: 'File is required' };
  }
  const type = (file.type || '').toLowerCase();
  if (!ALLOWED_TYPES.includes(type)) {
    return { 
      valid: false, 
      error: `Invalid file type: ${type}. Allowed: ${ALLOWED_TYPES.join(', ')}` 
    };
  }
  if (file.size > MAX_BYTES) {
    return { 
      valid: false, 
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds ${MAX_BYTES / 1024 / 1024}MB` 
    };
  }
  return { valid: true };
}

/**
 * Get file extension for assignments
 * @param {File} file
 * @returns {string}
 */
function getAssignmentExt(file) {
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogg',
    'video/quicktime': 'mov',
  };
  
  // Try to get from filename if type mapping doesn't work
  if (file.name) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext) return ext;
  }
  
  return map[(file.type || '').toLowerCase()] || 'bin';
}

/**
 * Request presigned URL for assignment files
 * @param {File} file
 * @returns {Promise<{uploadUrl: string, key: string, publicUrl: string, headersToSet: Record<string,string>}>}
 */
export async function getPresignedUrlForAssignment(file) {
  const validation = validateAssignmentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const checksum = await calculateChecksum(file);
  const ext = getAssignmentExt(file);

  const res = await fetch('/api/uploads/r2/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      contentType: file.type,
      ext,
      keyPrefix: ASSIGNMENTS_PREFIX,
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
 * Upload file to R2 using presigned URL (generic, no file type validation)
 * @param {File} file
 * @param {string} presignedUrl
 * @param {Object} headers
 * @param {(uploaded:number,total:number)=>void} [onProgress]
 * @returns {Promise<{success: boolean, status: number}>}
 */
async function uploadFileToR2(file, presignedUrl, headers = {}, onProgress = null) {
  // Prepare headers
  const uploadHeaders = {
    'Content-Type': headers['Content-Type'] || file.type,
    'Cache-Control': headers['Cache-Control'] || 'public, max-age=31536000, immutable',
    ...headers,
  };

  // Upload to R2 using XMLHttpRequest for progress tracking
  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded, event.total);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 204) {
        resolve({
          success: true,
          status: xhr.status,
        });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'));
    });

    xhr.open('PUT', presignedUrl);
    
    // Set headers
    Object.keys(uploadHeaders).forEach((key) => {
      xhr.setRequestHeader(key, uploadHeaders[key]);
    });

    xhr.send(file);
  });
}

/**
 * Upload assignment file to R2
 * @param {File} file
 * @param {(uploaded:number,total:number)=>void} [onProgress]
 * @returns {Promise<{publicUrl: string, key: string}>}
 */
export async function uploadAssignmentFile(file, onProgress) {
  const presign = await getPresignedUrlForAssignment(file);
  await uploadFileToR2(file, presign.uploadUrl, presign.headersToSet, onProgress);
  return { publicUrl: presign.publicUrl, key: presign.key };
}

export default {
  validateAssignmentFile,
  getPresignedUrlForAssignment,
  uploadAssignmentFile,
};

