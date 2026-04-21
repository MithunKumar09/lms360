/**
 * Image Upload Component
 * 
 * Handles image upload with preview and R2 presigned URL
 */

"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import apiClient from "@/lib/api/client.js";

const ImageUpload = ({
  value = null,
  onChange,
  label = "Upload Image",
  accept = "image/*",
  maxSize = 2 * 1024 * 1024, // 2MB
  uploadPath = "/course-settings/categories/upload",
  disabled = false,
  error = null,
}) => {
  const [preview, setPreview] = useState(value);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setUploadError(`File size must be less than ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      // Get file extension
      const ext = file.name.split(".").pop().toLowerCase();
      const contentType = file.type;

      // Get presigned URL
      const presignResponse = await apiClient.post(uploadPath, {
        contentType,
        ext,
        bytes: file.size,
      });

      if (!presignResponse.success) {
        throw new Error(presignResponse.error || "Failed to get upload URL");
      }

      const { uploadUrl, publicUrl, headersToSet } = presignResponse;

      // Upload to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: headersToSet,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      // Set preview and call onChange
      setPreview(publicUrl);
      onChange(publicUrl);
    } catch (error) {
      console.error("Image upload error:", error);
      setUploadError(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mb-4">
      <label className="mb-3 block font-semibold text-blackColor dark:text-blackColor-dark">
        {label}
      </label>

      {/* Preview */}
      {preview && (
        <div className="mb-3 relative inline-block">
          <div className="relative w-32 h-32 border-2 border-borderColor dark:border-borderColor-dark rounded-md overflow-hidden">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Upload Button */}
      {!preview && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className={`
              inline-block px-4 py-2 text-sm font-semibold rounded-md cursor-pointer
              ${disabled || uploading
                ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50"
                : "bg-primaryColor text-whiteColor hover:bg-primaryColor/90"
              }
            `}
          >
            {uploading ? "Uploading..." : "Choose Image"}
          </label>
        </div>
      )}

      {/* Errors */}
      {(error || uploadError) && (
        <p className="text-red-500 text-xs mt-1">{error || uploadError}</p>
      )}
    </div>
  );
};

export default ImageUpload;

