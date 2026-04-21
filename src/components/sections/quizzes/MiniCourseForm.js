/**
 * MiniCourseForm Component
 * 
 * Form for creating/editing mini courses with file uploads and validation.
 * Used in quiz creation flow for mini course quizzes.
 */

'use client';

import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import MediaUpload from '@/components/shared/forms/MediaUpload.js';
import RichTextEditor from '@/components/shared/forms/RichTextEditor.js';
import FieldError from '@/components/shared/errors/FieldError.js';

const MiniCourseForm = ({ 
  onSuccess, 
  orgId = null,
  disabled = false 
}) => {
  const createAlert = useSweetAlert();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coverPhotoUrl: '',
    stampLogoUrl: '',
    videoUrl: '',
    videoFileKey: null,
    instructions: '',
    materialUrl: '',
    materialFileKey: null,
    status: 'draft',
  });
  const [errors, setErrors] = useState({});
  const [isValidatingStampLogo, setIsValidatingStampLogo] = useState(false);
  const stampLogoFileRef = useRef(null);

  // Create mini course mutation
  const createMiniCourseMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/mini-courses', data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create mini course');
      }
      return response;
    },
    onSuccess: (response) => {
      createAlert({
        icon: 'success',
        title: 'Success!',
        text: 'Mini course created successfully',
      });
      if (onSuccess) {
        onSuccess(response.miniCourse.id);
      }
    },
    onError: (error) => {
      createAlert({
        icon: 'error',
        title: 'Error!',
        text: error.message || 'Failed to create mini course',
      });
    },
  });

  // Handle input change
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate stamp logo dimensions (28x28 PNG)
  const validateStampLogo = async (file) => {
    if (!file) return { valid: false, error: 'File is required' };

    // Check file type (PNG only)
    if (file.type !== 'image/png') {
      return { valid: false, error: 'Stamp logo must be a PNG file' };
    }

    // Check file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 2MB limit' };
    }

    // Validate dimensions (28x28)
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        if (img.width === 28 && img.height === 28) {
          resolve({ valid: true });
        } else {
          resolve({ 
            valid: false, 
            error: `Image dimensions must be exactly 28×28 pixels. Current: ${img.width}×${img.height}` 
          });
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ valid: false, error: 'Failed to load image' });
      };
      
      img.src = objectUrl;
    });
  };

  // Handle stamp logo file upload with validation
  const handleStampLogoUpload = async (file) => {
    setIsValidatingStampLogo(true);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.stampLogoUrl;
      return newErrors;
    });

    try {
      // Validate dimensions
      const validation = await validateStampLogo(file);
      if (!validation.valid) {
        setErrors((prev) => ({
          ...prev,
          stampLogoUrl: validation.error,
        }));
        setIsValidatingStampLogo(false);
        return;
      }

      // Upload file using existing upload system
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mediaType', 'image');

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          // Progress tracking can be added here if needed
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.url) {
              handleChange('stampLogoUrl', response.url);
            } else {
              throw new Error(response.error || 'Upload failed');
            }
          } catch (parseError) {
            setErrors((prev) => ({
              ...prev,
              stampLogoUrl: 'Failed to parse upload response',
            }));
          }
        } else {
          setErrors((prev) => ({
            ...prev,
            stampLogoUrl: `Upload failed with status ${xhr.status}`,
          }));
        }
        setIsValidatingStampLogo(false);
      });

      xhr.addEventListener('error', () => {
        setErrors((prev) => ({
          ...prev,
          stampLogoUrl: 'Network error. Please try again.',
        }));
        setIsValidatingStampLogo(false);
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        stampLogoUrl: error.message || 'Upload failed',
      }));
      setIsValidatingStampLogo(false);
    }
  };

  // Validate video file size (max 150MB)
  const validateVideoFile = (file) => {
    if (!file) return { valid: true }; // Optional field

    const maxSize = 150 * 1024 * 1024; // 150MB
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `Video size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 150MB limit` 
      };
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
      return { valid: false, error: 'File must be a video' };
    }

    return { valid: true };
  };

  // Handle video file upload
  const handleVideoFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setErrors((prev) => ({
        ...prev,
        videoUrl: validation.error,
      }));
      return;
    }

    // Upload using MediaUpload component's logic
    // The MediaUpload component will handle this, but we need to track the file key
    // For now, we'll just use the URL from MediaUpload
  };

  // Form validation
  const validate = () => {
    const newErrors = {};

    if (!formData.title || formData.title.trim().length < 3 || formData.title.trim().length > 255) {
      newErrors.title = 'Title must be between 3 and 255 characters';
    }

    if (!formData.description || formData.description.trim().length === 0) {
      newErrors.description = 'Description is required';
    }

    if (!formData.coverPhotoUrl || formData.coverPhotoUrl.trim().length === 0) {
      newErrors.coverPhotoUrl = 'Cover photo is required';
    }

    if (!formData.stampLogoUrl || formData.stampLogoUrl.trim().length === 0) {
      newErrors.stampLogoUrl = 'Stamp logo is required';
    }

    if (!formData.instructions || formData.instructions.trim().length === 0) {
      newErrors.instructions = 'Instructions are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const submitData = {
      ...formData,
      orgId,
    };

    await createMiniCourseMutation.mutateAsync(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          placeholder="Enter mini course title"
          disabled={disabled || createMiniCourseMutation.isPending}
        />
        {errors.title && <FieldError>{errors.title}</FieldError>}
      </div>

      {/* Description */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          placeholder="Enter mini course description"
          disabled={disabled || createMiniCourseMutation.isPending}
        />
        {errors.description && <FieldError>{errors.description}</FieldError>}
      </div>

      {/* Cover Photo */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Cover Photo <span className="text-red-500">*</span>
        </label>
        <MediaUpload
          value={formData.coverPhotoUrl}
          onChange={(url) => handleChange('coverPhotoUrl', url)}
          label="Cover Photo"
          placeholder="Enter cover photo URL or upload file"
          mediaType="image"
          accept="image/*"
          error={errors.coverPhotoUrl}
          disabled={disabled || createMiniCourseMutation.isPending}
        />
        {errors.coverPhotoUrl && <FieldError>{errors.coverPhotoUrl}</FieldError>}
      </div>

      {/* Stamp Logo (28x28 PNG) */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Stamp Logo (28×28 PNG) <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          <input
            ref={stampLogoFileRef}
            type="file"
            accept="image/png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleStampLogoUpload(file);
              }
            }}
            className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            disabled={disabled || createMiniCourseMutation.isPending || isValidatingStampLogo}
          />
          {isValidatingStampLogo && (
            <p className="text-xs text-gray-500">Validating image dimensions...</p>
          )}
          {formData.stampLogoUrl && (
            <div className="mt-2">
              <img
                src={formData.stampLogoUrl}
                alt="Stamp logo preview"
                className="w-28 h-28 object-contain border-2 border-borderColor dark:border-borderColor-dark rounded"
              />
              <p className="text-xs text-gray-500 mt-1">Preview (should be 28×28 pixels)</p>
            </div>
          )}
        </div>
        {errors.stampLogoUrl && <FieldError>{errors.stampLogoUrl}</FieldError>}
        <p className="text-xs text-gray-500 mt-1">
          Upload a PNG image that is exactly 28×28 pixels
        </p>
      </div>

      {/* Video */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Video (Max 150MB) <span className="text-red-500">*</span>
        </label>
        <MediaUpload
          value={formData.videoUrl}
          onChange={(url) => handleChange('videoUrl', url)}
          label="Video"
          placeholder="Enter video URL or upload file (max 150MB)"
          mediaType="video"
          accept="video/*"
          error={errors.videoUrl}
          disabled={disabled || createMiniCourseMutation.isPending}
        />
        {errors.videoUrl && <FieldError>{errors.videoUrl}</FieldError>}
        <p className="text-xs text-gray-500 mt-1">
          Maximum file size: 150MB. Supported formats: MP4, WebM, etc.
        </p>
      </div>

      {/* Instructions (Rich Text) */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Instructions <span className="text-red-500">*</span>
        </label>
        <RichTextEditor
          value={formData.instructions}
          onChange={(html) => handleChange('instructions', html)}
          placeholder="Enter instructions for the mini course..."
          error={!!errors.instructions}
        />
        {errors.instructions && <FieldError>{errors.instructions}</FieldError>}
      </div>

      {/* Material (Optional) */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Material (Optional)
        </label>
        <MediaUpload
          value={formData.materialUrl}
          onChange={(url) => handleChange('materialUrl', url)}
          label="Material"
          placeholder="Enter material URL or upload file"
          mediaType="file"
          accept="*/*"
          error={errors.materialUrl}
          disabled={disabled || createMiniCourseMutation.isPending}
        />
        {errors.materialUrl && <FieldError>{errors.materialUrl}</FieldError>}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={disabled || createMiniCourseMutation.isPending}
          className="px-6 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMiniCourseMutation.isPending ? 'Creating...' : 'Create Mini Course'}
        </button>
      </div>
    </form>
  );
};

export default MiniCourseForm;

