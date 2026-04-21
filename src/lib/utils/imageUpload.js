/**
 * Image Upload Utilities
 * 
 * Client-side utilities for uploading images to Cloudflare R2 via presigned URLs.
 * Provides file validation, checksum calculation, and upload helpers.
 * R2 is faster, cheaper, and has no egress fees compared to S3.
 * 
 * @module utils/imageUpload
 */

/**
 * Calculate checksum of a file (browser)
 * Uses SHA-256 via Web Crypto API (MD5 is not available in Web Crypto API)
 * Falls back to simple hash if crypto API is not available
 * 
 * @param {File} file - File object
 * @returns {Promise<string>} Checksum (hex string)
 */
export async function calculateChecksum(file) {
  try {
    // Use Web Crypto API with SHA-256 (more secure and widely supported)
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    // Return first 32 chars for shorter checksum (or full 64 for SHA-256)
    return hashHex.substring(0, 32); // Return 32-char checksum for consistency
  } catch (error) {
    console.warn('Error calculating checksum with crypto API, using fallback:', error);
    // Fallback: use file name + size + last modified as checksum
    // This is not cryptographically secure but provides some uniqueness
    const fallback = `${file.name}-${file.size}-${file.lastModified}`;
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fallback.length; i++) {
      const char = fallback.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0').substring(0, 32);
  }
}

/**
 * Validate image file (client-side)
 * Checks type and size
 * 
 * @param {File} file - File object
 * @param {Object} [options] - Validation options
 * @param {number} [options.maxSize=2*1024*1024] - Maximum file size in bytes (default: 2MB)
 * @returns {Object} Validation result
 */
export function validateImageFile(file, options = {}) {
  const { maxSize = 2 * 1024 * 1024 } = options;

  if (!file) {
    return { valid: false, error: 'File is required' };
  }

  // Check file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  const fileType = file.type.toLowerCase();
  
  if (!allowedTypes.includes(fileType)) {
    return {
      valid: false,
      error: `Invalid file type: ${fileType}. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${maxSize / 1024 / 1024}MB)`,
    };
  }

  return {
    valid: true,
    fileType,
    fileSize: file.size,
  };
}

/**
 * Get file extension from filename or type
 * 
 * @param {File} file - File object
 * @returns {string} File extension (without dot)
 */
export function getFileExtension(file) {
  if (file.name) {
    const parts = file.name.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 1].toLowerCase();
    }
  }

  // Fallback to content type
  const typeMap = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };

  return typeMap[file.type] || 'png';
}

/**
 * Request presigned URL from API
 * 
 * @param {File} file - File object
 * @param {string} keyPrefix - R2 key prefix (e.g., 'orgs/brand')
 * @returns {Promise<Object>} Presigned URL response
 */
export async function getPresignedUrl(file, keyPrefix) {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Calculate checksum
    const checksum = await calculateChecksum(file);

    // Get file extension
    const ext = getFileExtension(file);

    // Request presigned URL from API (R2)
    const response = await fetch('/api/uploads/r2/presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        contentType: file.type,
        ext,
        keyPrefix,
        bytes: file.size,
        checksum,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get presigned URL');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    throw error;
  }
}

/**
 * Upload file directly to R2 using presigned URL
 * 
 * @param {File} file - File object
 * @param {string} presignedUrl - Presigned PUT URL
 * @param {Object} headers - Headers to set (from presigned URL response)
 * @param {Function} [onProgress] - Progress callback (bytesUploaded, totalBytes)
 * @returns {Promise<Object>} Upload result with public URL
 */
export async function uploadToR2(file, presignedUrl, headers = {}, onProgress = null) {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Prepare headers
    const uploadHeaders = {
      'Content-Type': headers['Content-Type'] || file.type,
      'Cache-Control': headers['Cache-Control'] || 'public, max-age=31536000, immutable',
      ...headers,
    };

    // Upload to R2 using fetch with progress tracking
    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(event.loaded, event.total);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 204) {
          // Upload successful
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
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw error;
  }
}

/**
 * Fallback: upload via same-origin API (server-side proxy to R2) to avoid CORS
 * @param {File} file
 * @param {string} keyPrefix
 * @returns {Promise<{publicUrl: string, key: string}>}
 */
async function uploadViaProxy(file, keyPrefix) {
  const form = new FormData();
  form.append('file', file);
  form.append('keyPrefix', keyPrefix);
  form.append('contentType', file.type);
  form.append('filename', file.name || 'upload');

  const res = await fetch('/api/uploads/r2/direct', {
    method: 'POST',
    body: form,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Direct upload failed');
  }
  const data = await res.json();
  return { publicUrl: data.publicUrl, key: data.key };
}


/**
 * Validate external image URL (client-side HEAD request)
 * 
 * @param {string} url - Image URL to validate
 * @returns {Promise<Object>} Validation result
 */
export async function validateImageUrl(url) {
  try {
    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid URL format',
      };
    }

    // Request validation from API (server-side HEAD request)
    const response = await fetch('/api/uploads/r2/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        valid: false,
        error: error.error || 'Failed to validate URL',
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error validating image URL:', error);
    return {
      valid: false,
      error: error.message || 'Failed to validate image URL',
    };
  }
}

/**
 * Complete upload flow: get presigned URL and upload file
 * 
 * @param {File} file - File object
 * @param {string} keyPrefix - R2 key prefix
 * @param {Function} [onProgress] - Progress callback
 * @returns {Promise<Object>} Upload result with public URL
 */
export async function uploadImage(file, keyPrefix, onProgress = null) {
  try {
    // Step 1: Get presigned URL
    const presignResponse = await getPresignedUrl(file, keyPrefix);

    // Step 2: Upload file to R2
    try {
      await uploadToR2(file, presignResponse.uploadUrl, presignResponse.headersToSet, onProgress);
      // Step 3: Return public URL
      return {
        success: true,
        publicUrl: presignResponse.publicUrl,
        key: presignResponse.key,
      };
    } catch (e) {
      // CORS or network failure -> fallback to server proxy
      const viaProxy = await uploadViaProxy(file, keyPrefix);
      return {
        success: true,
        publicUrl: viaProxy.publicUrl,
        key: viaProxy.key,
      };
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export default {
  calculateChecksum,
  validateImageFile,
  getFileExtension,
  getPresignedUrl,
  uploadToR2,
  validateImageUrl,
  uploadImage,
};

