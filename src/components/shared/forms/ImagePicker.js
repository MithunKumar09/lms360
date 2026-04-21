/**
 * Image Picker Component
 * 
 * Component for uploading images to Cloudflare R2 or pasting image URLs.
 * Supports two modes: Upload (via presigned URL) and URL (paste URL).
 * Uses Cloudflare R2 for faster, cheaper storage with no egress fees.
 * 
 * @module forms/ImagePicker
 */

'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';
import { uploadImage, validateImageUrl } from '@/lib/utils/imageUpload.js';
import { validateImageFile } from '@/lib/utils/imageUpload.js';
import ValidationError from '@/components/shared/errors/ValidationError.js';

/**
 * Image Picker Component
 * 
 * @param {Object} props - Component props
 * @param {string} props.value - Current image URL
 * @param {Function} props.onChange - Change handler (receives URL)
 * @param {string} props.label - Field label
 * @param {string} props.name - Field name
 * @param {string|Object} props.error - Error message
 * @param {string} props.keyPrefix - R2 key prefix (default: 'orgs/brand')
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.maxSize - Max file size in bytes (default: 2MB)
 * @param {string} props.previewWidth - Preview width (default: 200)
 * @param {string} props.previewHeight - Preview height (default: 200)
 */
export default function ImagePicker({
  value = '',
  onChange,
  label,
  name,
  error = null,
  keyPrefix = 'orgs/brand',
  className = '',
  maxSize = 2 * 1024 * 1024, // 2MB
  previewWidth = 200,
  previewHeight = 200,
}) {
  const [mode, setMode] = useState('upload'); // 'upload' | 'url'
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validatingUrl, setValidatingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState(null);
  const fileInputRef = useRef(null);
  const dragOverRef = useRef(false);

  /**
   * Handle file upload
   */
  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file, { maxSize });
    if (!validation.valid) {
      setUrlError(validation.error);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUrlError(null);

    try {
      // Compress image before upload
      setUploadProgress(5); // Show initial progress
      
      const compressionOptions = {
        maxSizeMB: maxSize / (1024 * 1024), // Convert bytes to MB
        maxWidthOrHeight: 1920, // Max dimension
        useWebWorker: true,
        fileType: file.type,
      };

      const compressedFile = await imageCompression(file, compressionOptions);
      setUploadProgress(30); // Show compression progress

      // Upload compressed image to R2
      const result = await uploadImage(compressedFile, keyPrefix, (uploaded, total) => {
        // Map upload progress from 30% to 100% (compression was 0-30%)
        const uploadProgressPercent = 30 + (uploaded / total) * 70;
        setUploadProgress(uploadProgressPercent);
      });

      // Call onChange with public URL
      if (onChange) {
        onChange(result.publicUrl);
      }

      setUrlError(null);
    } catch (error) {
      console.error('Image upload error:', error);
      setUrlError(error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  /**
   * Handle drag and drop
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragOverRef.current = true;
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragOverRef.current = false;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragOverRef.current = false;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    } else {
      setUrlError('Please drop an image file');
    }
  };

  /**
   * Handle URL validation and paste
   */
  const handleUrlSubmit = async () => {
    const url = urlInput.trim();
    if (!url) {
      setUrlError('Please enter an image URL');
      return;
    }

    setValidatingUrl(true);
    setUrlError(null);

    try {
      // Validate URL via API
      const validation = await validateImageUrl(url);

      if (!validation.valid) {
        setUrlError(validation.error || 'Invalid image URL');
        return;
      }

      // URL is valid, call onChange
      if (onChange) {
        onChange(url);
      }

      setUrlError(null);
    } catch (error) {
      console.error('URL validation error:', error);
      setUrlError(error.message || 'Failed to validate image URL. Please try again.');
    } finally {
      setValidatingUrl(false);
    }
  };

  /**
   * Clear image
   */
  const handleClear = () => {
    if (onChange) {
      onChange('');
    }
    setUrlInput('');
    setUrlError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`mb-25px ${className}`}>
      {label && (
        <label
          className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium"
          htmlFor={name}
        >
          {label}
        </label>
      )}

      {/* Tabs: Upload | URL */}
      <div className="flex border-b border-borderColor dark:border-borderColor-dark mb-15px">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`px-15px py-8px text-sm font-medium transition-colors ${
            mode === 'upload'
              ? 'text-primaryColor dark:text-primaryColor border-b-2 border-primaryColor dark:border-primaryColor'
              : 'text-contentColor dark:text-contentColor-dark hover:text-primaryColor dark:hover:text-primaryColor'
          }`}
        >
          Upload
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`px-15px py-8px text-sm font-medium transition-colors ${
            mode === 'url'
              ? 'text-primaryColor dark:text-primaryColor border-b-2 border-primaryColor dark:border-primaryColor'
              : 'text-contentColor dark:text-contentColor-dark hover:text-primaryColor dark:hover:text-primaryColor'
          }`}
        >
          URL
        </button>
      </div>

      {/* Upload Mode */}
      {mode === 'upload' && (
        <div>
          <div
            className={`border-2 border-dashed rounded-md p-20px text-center transition-colors ${
              dragOverRef.current
                ? 'border-primaryColor dark:border-primaryColor bg-primaryColor/5'
                : 'border-borderColor dark:border-borderColor-dark hover:border-primaryColor dark:hover:border-primaryColor'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
              id={`${name}-file`}
              aria-label={`Upload ${label || 'image'}`}
            />

            {uploading ? (
              <div className="py-20px">
                <div className="mb-10px">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primaryColor"></div>
                </div>
                <p className="text-contentColor dark:text-contentColor-dark text-sm">
                  Uploading... {Math.round(uploadProgress)}%
                </p>
                <div className="mt-10px w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primaryColor h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="py-20px">
                <svg
                  className="mx-auto h-12 w-12 text-contentColor dark:text-contentColor-dark mb-10px"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-contentColor dark:text-contentColor-dark text-sm mb-5px">
                  <span className="font-medium text-primaryColor dark:text-primaryColor">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-contentColor dark:text-contentColor-dark text-xs opacity-70">
                  PNG, JPG, WebP, SVG up to {maxSize / 1024 / 1024}MB
                </p>
              </div>
            )}
          </div>

          {urlError && <ValidationError error={urlError} field={name} className="mt-10px" />}
        </div>
      )}

      {/* URL Mode */}
      {mode === 'url' && (
        <div>
          <div className="flex gap-x-10px">
            <input
              type="url"
              value={urlInput || value}
              onChange={(e) => {
                const newValue = e.target.value;
                setUrlInput(newValue);
                if (onChange && !validatingUrl) {
                  onChange(newValue);
                }
                setUrlError(null);
              }}
              onBlur={handleUrlSubmit}
              placeholder="https://example.com/image.png"
              disabled={validatingUrl}
              className={`flex-1 h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                urlError
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-borderColor dark:border-borderColor-dark'
              } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded ${
                validatingUrl ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              aria-invalid={!!urlError}
              aria-describedby={urlError ? `${name}-error` : undefined}
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={validatingUrl || !urlInput.trim()}
              className="px-20px h-52px text-whiteColor bg-primaryColor border border-primaryColor hover:bg-primaryColor/90 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {validatingUrl ? (
                <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-whiteColor"></span>
              ) : (
                'Validate'
              )}
            </button>
          </div>
          {urlError && <ValidationError error={urlError} field={name} className="mt-10px" />}
        </div>
      )}

      {/* Preview */}
      {value && (
        <div className="mt-15px">
          <div className="relative inline-block border border-borderColor dark:border-borderColor-dark rounded p-10px">
            <Image
              src={value}
              alt={label || 'Preview'}
              width={previewWidth}
              height={previewHeight}
              className="object-contain rounded"
              unoptimized={value.startsWith('http') || value.startsWith('//')}
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-0 right-0 p-5px bg-red-500 text-whiteColor rounded-full hover:bg-red-600 transition-colors"
              aria-label="Remove image"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Field Error */}
      {error && <ValidationError error={error} field={name} className="mt-10px" />}
    </div>
  );
}

