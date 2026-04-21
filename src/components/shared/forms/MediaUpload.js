/**
 * MediaUpload Component
 * 
 * Reusable component for uploading media files (video, image, file) with progress indicator.
 * Supports both URL input and file upload from device.
 */

'use client';

import React, { useState, useRef, useMemo } from 'react';
import { extractYouTubeId, extractVimeoId } from '@/lib/course/transformers';

const MediaUpload = ({
  value = '',
  onChange,
  label = 'Media',
  placeholder = 'Enter URL or upload file',
  accept = '*/*', // Default: all files, can be 'video/*', 'image/*', etc.
  mediaType = 'file', // 'video', 'image', 'file'
  error = null,
  className = '',
  disabled = false,
  showPreview = true,
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(value || null);
  const fileInputRef = useRef(null);

  // Update preview when value changes
  React.useEffect(() => {
    if (value) {
      // Convert relative URL to full URL if needed for preview
      let url = value;
      // Handle both relative paths and full URLs
      if (url.startsWith('/') && typeof window !== 'undefined') {
        // Relative path - convert to full URL for preview
        url = `${window.location.origin}${url}`;
      } else if (!url.startsWith('http://') && !url.startsWith('https://') && typeof window !== 'undefined') {
        // If it doesn't start with / or http, assume it's relative
        url = `${window.location.origin}/${url}`;
      }
      // Only update if different to avoid unnecessary re-renders
      if (url !== previewUrl) {
        setPreviewUrl(url);
      }
    } else {
      if (previewUrl) {
        setPreviewUrl(null);
      }
    }
  }, [value]);

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isValidType = validateFileType(file, mediaType);
    if (!isValidType) {
      setUploadError(`Invalid file type. Please select a ${mediaType} file.`);
      return;
    }

    // Validate file size (max 500MB for videos, 10MB for images, 50MB for other files)
    const maxSize = mediaType === 'video' ? 500 * 1024 * 1024 : 
                   mediaType === 'image' ? 10 * 1024 * 1024 : 
                   50 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      setUploadError(`File size exceeds ${maxSizeMB}MB limit.`);
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mediaType', mediaType);

      // Upload file
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.url) {
              // Store relative URL in the form (for database storage)
              // But use full URL for preview
              const relativeUrl = response.url; // e.g., /uploads/video/filename.mp4
              const fullUrl = relativeUrl.startsWith('/') 
                ? `${window.location.origin}${relativeUrl}`
                : relativeUrl;
              
              // Update parent component with relative URL (for storage)
              // Relative URLs are better for database storage as they're portable
              if (onChange) {
                onChange(relativeUrl);
              }
              
              // Use full URL for preview
              setPreviewUrl(fullUrl);
              setUploadSuccess(true);
              setUploadProgress(100);
              
              // Wait a bit to ensure state updates, then hide progress
              setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
                // Keep success message for 3 seconds
                setTimeout(() => {
                  setUploadSuccess(false);
                }, 3000);
              }, 500);
            } else {
              throw new Error(response.error || 'Upload failed');
            }
          } catch (parseError) {
            console.error('Error parsing upload response:', parseError);
            throw new Error('Failed to parse upload response');
          }
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`);
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        setUploadError('Network error. Please try again.');
        setIsUploading(false);
        setUploadProgress(0);
      });

      xhr.addEventListener('abort', () => {
        setUploadError('Upload cancelled.');
        setIsUploading(false);
        setUploadProgress(0);
      });

      // Send request
      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    } catch (error) {
      setUploadError(error.message || 'Upload failed. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validate file type
  const validateFileType = (file, type) => {
    if (type === 'video') {
      return file.type.startsWith('video/');
    } else if (type === 'image') {
      return file.type.startsWith('image/');
    }
    return true; // For 'file' type, accept all
  };

  // Get accept attribute based on media type
  const getAcceptAttribute = () => {
    if (accept !== '*/*') return accept;
    if (mediaType === 'video') return 'video/*';
    if (mediaType === 'image') return 'image/*';
    return '*/*';
  };

  // Get upload button text
  const getUploadButtonText = () => {
    if (mediaType === 'video') return 'Upload Video';
    if (mediaType === 'image') return 'Upload Image';
    return 'Upload File';
  };

  // Detect video type and get embed URL for preview
  const videoPreviewData = useMemo(() => {
    if (mediaType !== 'video' || !previewUrl) return null;

    // Check if it's a YouTube URL
    const youtubeId = extractYouTubeId(previewUrl);
    if (youtubeId) {
      return {
        type: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`,
      };
    }

    // Check if it's a Vimeo URL
    const vimeoId = extractVimeoId(previewUrl);
    if (vimeoId) {
      return {
        type: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=0`,
      };
    }

    // Check if it's a direct video URL
    if (previewUrl.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i)) {
      return {
        type: 'direct',
        embedUrl: previewUrl,
      };
    }

    // Unknown format, try as direct video
    return {
      type: 'direct',
      embedUrl: previewUrl,
    };
  }, [mediaType, previewUrl]);

  // Handle URL input change
  const handleUrlChange = (e) => {
    const url = e.target.value;
    setPreviewUrl(url || null);
    onChange(url);
  };

  // Clear uploaded file
  const handleClear = () => {
    setPreviewUrl(null);
    onChange('');
    setUploadError(null);
  };

  return (
    <div className={className}>
      <label className="mb-3 block font-semibold">
        {label}
      </label>

      {/* URL Input */}
      <div className="mb-3">
        <input
          type="url"
          value={value || ''}
          onChange={handleUrlChange}
          placeholder={placeholder}
          disabled={disabled || isUploading}
          data-field={label.toLowerCase().includes('intro') ? 'introVideoUrl' : label.toLowerCase().replace(/\s+/g, '-')}
          className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
            error || uploadError
              ? 'border-red-500 dark:border-red-500'
              : uploadSuccess
              ? 'border-green-500 dark:border-green-500'
              : 'border-borderColor dark:border-borderColor-dark'
          } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
            disabled || isUploading ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        />
        {uploadSuccess && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            File uploaded successfully! URL has been prefilled.
          </p>
        )}
        {(error || uploadError) && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
            {error || uploadError}
          </p>
        )}
      </div>

      {/* Upload Button and Progress */}
      <div className="mb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className={`
              px-4 py-2 text-sm font-semibold rounded-md transition-colors
              ${isUploading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-primaryColor text-whiteColor hover:bg-secondaryColor'
              }
              ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
            `}
          >
            {isUploading ? 'Uploading...' : getUploadButtonText()}
          </button>
          
          {value && !isUploading && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-primaryColor h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">
              {uploadProgress}% uploaded
            </p>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptAttribute()}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Preview */}
      {showPreview && previewUrl && !isUploading && (
        <div className="mt-3">
          {mediaType === 'image' ? (
            <div className="relative w-full max-w-md border-2 border-borderColor dark:border-borderColor-dark rounded-md overflow-hidden">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto"
                onError={() => setPreviewUrl(null)}
              />
            </div>
          ) : mediaType === 'video' ? (
            <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
              {videoPreviewData?.type === 'youtube' || videoPreviewData?.type === 'vimeo' ? (
                // YouTube or Vimeo iframe
                <iframe
                  src={videoPreviewData.embedUrl}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Video Preview"
                />
              ) : (
                // Direct video file
                <video
                  src={previewUrl}
                  controls
                  className="w-full h-full"
                  onError={(e) => {
                    console.error('❌ [MEDIA UPLOAD] Video load error:', {
                      src: previewUrl,
                      error: e.target.error,
                      code: e.target.error?.code,
                      message: e.target.error?.message,
                    });
                    // Don't clear previewUrl, just show error message
                  }}
                  onLoadStart={() => {
                    console.log('🚀 [MEDIA UPLOAD] Video loading:', previewUrl);
                  }}
                  onCanPlay={() => {
                    console.log('✅ [MEDIA UPLOAD] Video can play:', previewUrl);
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              )}
              {videoPreviewData?.type !== 'youtube' && videoPreviewData?.type !== 'vimeo' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  If video doesn&apos;t load, check that the file exists at: {previewUrl}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3">
              {/* File Preview Card */}
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md border-2 border-borderColor dark:border-borderColor-dark">
                <div className="flex items-start gap-4">
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {previewUrl.toLowerCase().endsWith('.pdf') ? (
                      <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        <path d="M8 6V4a1 1 0 011-1h2v2h2v2H9a1 1 0 01-1-1z" />
                      </svg>
                    ) : previewUrl.toLowerCase().match(/\.(doc|docx)$/) ? (
                      <svg className="w-12 h-12 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        <path d="M8 6V4a1 1 0 011-1h2v2h2v2H9a1 1 0 01-1-1z" />
                      </svg>
                    ) : (
                      <svg className="w-12 h-12 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        <path d="M8 6V4a1 1 0 011-1h2v2h2v2H9a1 1 0 01-1-1z" />
                      </svg>
                    )}
                  </div>
                  
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-headingColor dark:text-headingColor-dark mb-1">
                      Material File
                    </p>
                    <p className="text-xs text-contentColor dark:text-contentColor-dark mb-3 break-all">
                      {previewUrl}
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold bg-primaryColor text-whiteColor hover:bg-secondaryColor rounded-md transition-colors inline-flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview
                      </a>
                      <a
                        href={previewUrl}
                        download
                        className="px-3 py-1.5 text-xs font-semibold bg-whiteColor dark:bg-whiteColor-dark text-primaryColor border-2 border-primaryColor hover:bg-primaryColor hover:text-whiteColor rounded-md transition-colors inline-flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* PDF Embed Preview (if PDF) */}
              {previewUrl.toLowerCase().endsWith('.pdf') && (
                <div className="mt-3 w-full border-2 border-borderColor dark:border-borderColor-dark rounded-md overflow-hidden">
                  <iframe
                    src={previewUrl}
                    className="w-full h-96"
                    title="PDF Preview"
                    style={{ minHeight: '400px' }}
                  >
                    <p className="p-4 text-sm text-contentColor dark:text-contentColor-dark">
                      Your browser does not support PDFs. 
                      <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-primaryColor hover:underline ml-1">
                        Click here to download the PDF
                      </a>
                    </p>
                  </iframe>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {mediaType === 'video' && 'Supports YouTube, Vimeo, or direct video URLs. Or upload a video file (max 500MB).'}
        {mediaType === 'image' && 'Enter image URL or upload an image file (max 10MB).'}
        {mediaType === 'file' && 'Enter file URL or upload a file (max 50MB).'}
      </p>
    </div>
  );
};

export default MediaUpload;

