"use client";

import React, { useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";

/**
 * TaskAttachments Component
 * 
 * Displays and manages task attachments (upload, view, delete).
 * 
 * @param {Object} props
 * @param {Array} props.attachments - Array of attachment objects
 * @param {Function} props.onUpload - Handler for file upload (receives File object)
 * @param {Function} props.onDelete - Handler for attachment deletion (receives attachmentId)
 * @param {boolean} props.canUpload - Whether user can upload files
 * @param {boolean} props.canDelete - Whether user can delete files
 * @param {boolean} props.isUploading - Whether an upload is in progress
 */
export default function TaskAttachments({
  attachments = [],
  onUpload,
  onDelete,
  canUpload = true,
  canDelete = true,
  isUploading = false,
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) {
      return 'icofont-image';
    }
    if (fileType?.includes('pdf')) {
      return 'icofont-file-pdf';
    }
    if (fileType?.includes('word') || fileType?.includes('document')) {
      return 'icofont-file-word';
    }
    if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) {
      return 'icofont-file-excel';
    }
    if (fileType?.includes('text')) {
      return 'icofont-file-alt';
    }
    return 'icofont-file';
  };

  return (
    <div className="w-full">
      {/* Upload Section */}
      {canUpload && (
        <div
          className={`mb-4 p-4 border-2 border-dashed rounded-md transition-colors ${
            dragOver
              ? 'border-primaryColor bg-primaryColor/10'
              : 'border-borderColor dark:border-borderColor-dark bg-transparent'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          <div className="text-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-primaryColor hover:text-primaryColor/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="icofont-upload mr-2"></i>
              {isUploading ? 'Uploading...' : 'Upload Attachment'}
            </button>
            <p className="text-xs text-contentColor dark:text-contentColor-dark mt-2">
              Drag and drop a file here, or click to select
            </p>
            <p className="text-xs text-contentColor dark:text-contentColor-dark">
              Max file size: 10MB
            </p>
          </div>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="text-center py-8 text-contentColor dark:text-contentColor-dark">
          <i className="icofont-file text-4xl mb-2 opacity-50"></i>
          <p className="text-sm">No attachments yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {/* File Icon */}
              <div className="flex-shrink-0">
                <i className={`${getFileIcon(attachment.fileType)} text-2xl text-primaryColor`}></i>
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <a
                  href={attachment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blackColor dark:text-blackColor-dark hover:text-primaryColor transition-colors block truncate"
                >
                  {attachment.fileName}
                </a>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-contentColor dark:text-contentColor-dark">
                    {formatFileSize(attachment.fileSizeBytes)}
                  </p>
                  <span className="text-xs text-contentColor dark:text-contentColor-dark">•</span>
                  <p className="text-xs text-contentColor dark:text-contentColor-dark">
                    {attachment.createdAt
                      ? formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })
                      : ''}
                  </p>
                  {attachment.uploader && (
                    <>
                      <span className="text-xs text-contentColor dark:text-contentColor-dark">•</span>
                      <p className="text-xs text-contentColor dark:text-contentColor-dark">
                        {attachment.uploader.firstName || attachment.uploader.first_name}{' '}
                        {attachment.uploader.lastName || attachment.uploader.last_name}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(attachment.id)}
                  className="flex-shrink-0 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  aria-label="Delete attachment"
                >
                  <i className="icofont-trash"></i>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
