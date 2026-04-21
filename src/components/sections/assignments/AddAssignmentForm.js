"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import useCoursesForDropdown from "@/hooks/api/useCoursesForDropdown.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import FieldError from "@/components/shared/errors/FieldError.js";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown.js";
import { calculateChecksum } from "@/lib/utils/imageUpload.js";
import SubmissionCarousel from "@/components/sections/submissions/SubmissionCarousel.js";

const AddAssignmentForm = ({ assignmentId = null }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  
  // Get assignment ID from props or URL params
  const editAssignmentId = assignmentId || searchParams.get('id');
  const isEditMode = !!editAssignmentId;

  // Form state
  const [formData, setFormData] = useState({
    courseId: "",
    title: "",
    description: "",
    instructions: "",
    maxMarks: 100,
    passingMarks: 50,
    dueDate: "",
    allowLateSubmission: false,
    lateSubmissionPenalty: 0,
    maxFileSizeMb: 10,
    allowedFileTypes: [],
    status: "draft",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(false);
  
  // File upload state
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = useRef(null);
  const blobUrlsRef = useRef(new Set()); // Track blob URLs for cleanup

  // Fetch assignment data if in edit mode
  const { data: assignmentData, isLoading: isLoadingAssignmentData } = useQuery({
    queryKey: ['assignment', editAssignmentId],
    queryFn: async () => {
      if (!editAssignmentId) return null;
      const response = await apiClient.get(`/assignments/${editAssignmentId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch assignment');
      }
      return response.assignment;
    },
    enabled: isEditMode && !!editAssignmentId,
    staleTime: 5 * 60 * 1000,
  });

  // Populate form when assignment data is loaded
  useEffect(() => {
    if (assignmentData && isEditMode) {
      // Convert ISO date to datetime-local format
      const dueDate = assignmentData.dueDate 
        ? new Date(assignmentData.dueDate).toISOString().slice(0, 16)
        : "";
      
      setFormData({
        courseId: assignmentData.courseId || "",
        title: assignmentData.title || "",
        description: assignmentData.description || "",
        instructions: assignmentData.instructions || "",
        maxMarks: assignmentData.maxMarks || 100,
        passingMarks: assignmentData.passingMarks || 50,
        dueDate: dueDate,
        allowLateSubmission: assignmentData.allowLateSubmission || false,
        lateSubmissionPenalty: assignmentData.lateSubmissionPenalty || 0,
        maxFileSizeMb: assignmentData.maxFileSizeMb || 10,
        allowedFileTypes: assignmentData.allowedFileTypes || [],
        status: assignmentData.status || "draft",
      });

      // Load existing attachments
      if (assignmentData.attachments && Array.isArray(assignmentData.attachments)) {
        const existingFiles = assignmentData.attachments.map((att, index) => ({
          id: att.id || `existing-${index}`,
          fileKey: att.fileKey,
          fileUrl: att.fileUrl,
          fileName: att.fileName,
          fileType: att.fileType,
          fileSizeBytes: att.fileSizeBytes,
          previewUrl: att.fileType?.startsWith('image/') ? att.fileUrl : null, // Use fileUrl as preview for existing images
        }));
        setAttachedFiles(existingFiles);
      }
    }
  }, [assignmentData, isEditMode]);

  // Fetch courses (role-based filtering applied automatically)
  const { data: coursesData, isLoading: isLoadingCourses } = useCoursesForDropdown();
  const courses = coursesData?.courses || [];

  // Transform courses for dropdown
  const courseOptions = courses.map((course) => ({
    id: course.id,
    label: course.title,
    value: course.id,
  }));

  // File type options
  const fileTypeOptions = [
    { id: "pdf", label: "PDF", value: "pdf" },
    { id: "doc", label: "DOC", value: "doc" },
    { id: "docx", label: "DOCX", value: "docx" },
    { id: "jpg", label: "JPG", value: "jpg" },
    { id: "jpeg", label: "JPEG", value: "jpeg" },
    { id: "png", label: "PNG", value: "png" },
    { id: "zip", label: "ZIP", value: "zip" },
  ];

  // Handle input change
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Custom upload function for assignments (supports PDFs, images, videos via presign API)
  // Uses presign + direct R2 upload with progress tracking
  const uploadAssignmentFile = async (file, keyPrefix, onProgress) => {
    try {
      // Get file extension
      const fileName = file.name || 'upload';
      const ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
      
      // Calculate checksum
      const checksum = await calculateChecksum(file);

      // Step 1: Get presigned URL (supports assignments prefix with PDFs, images, videos)
      const presignResponse = await fetch('/api/uploads/r2/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          contentType: file.type || 'application/octet-stream',
          ext,
          keyPrefix,
          bytes: file.size,
          checksum,
        }),
      });

      if (!presignResponse.ok) {
        const error = await presignResponse.json();
        throw new Error(error.error || 'Failed to get presigned URL');
      }

      const presignData = await presignResponse.json();

      // Step 2: Upload file to R2 with progress tracking using XMLHttpRequest
      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(event.loaded, event.total);
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 204) {
            resolve({
              success: true,
              publicUrl: presignData.publicUrl,
              key: presignData.key,
            });
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed: Network error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was aborted'));
        });

        // Set headers from presigned URL response and upload
        xhr.open('PUT', presignData.uploadUrl);
        Object.keys(presignData.headersToSet || {}).forEach((key) => {
          xhr.setRequestHeader(key, presignData.headersToSet[key]);
        });

        xhr.send(file);
      });
    } catch (error) {
      console.error('Error uploading assignment file:', error);
      throw error;
    }
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    const fileId = `${file.name}-${Date.now()}`;
    setUploading(true);
    setUploadProgress((prev) => ({
      ...prev,
      [fileId]: { loaded: 0, total: file.size, name: file.name, file: file },
    }));

    try {
      // Validate file size (use a reasonable max for instructor uploads - 50MB)
      const maxSizeBytes = 50 * 1024 * 1024; // 50MB for instructor attachments
      if (file.size > maxSizeBytes) {
        throw new Error(
          `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (50MB)`
        );
      }

      // Upload file using custom function that supports all file types
      const result = await uploadAssignmentFile(
        file,
        'assignments',
        (loaded, total) => {
          setUploadProgress((prev) => ({
            ...prev,
            [fileId]: { ...prev[fileId], loaded, total },
          }));
        }
      );

      // Create preview URL for images
      let previewUrl = null;
      if (file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file);
        blobUrlsRef.current.add(previewUrl); // Track for cleanup
      }

      // Add file to attached files
      const fileData = {
        id: fileId,
        fileKey: result.key,
        fileUrl: result.publicUrl,
        fileName: file.name,
        fileType: file.type,
        fileSizeBytes: file.size,
        previewUrl: previewUrl, // For images
      };

      setAttachedFiles((prev) => [...prev, fileData]);

      // Clear progress after a brief delay to show completion
      setTimeout(() => {
        setUploadProgress((prev) => {
          const updated = { ...prev };
          delete updated[fileId];
          return updated;
        });
      }, 500);

      createAlert({
        icon: 'success',
        title: 'File Uploaded',
        text: `${file.name} uploaded successfully`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      createAlert({
        icon: 'error',
        title: 'Upload Failed',
        text: error.message || 'Failed to upload file',
      });
      // Clear progress on error
      setUploadProgress((prev) => {
        const updated = { ...prev };
        delete updated[fileId];
        return updated;
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      handleFileUpload(file);
    });
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attached file
  const handleRemoveFile = (fileId) => {
    setAttachedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      // Clean up object URL if it exists
      if (fileToRemove?.previewUrl && fileToRemove.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
        blobUrlsRef.current.delete(fileToRemove.previewUrl);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      // Clean up all tracked blob URLs when component unmounts
      blobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore errors when revoking URLs
        }
      });
      blobUrlsRef.current.clear();
    };
  }, []); // Only run cleanup on unmount

  // Validation
  const validate = () => {
    const newErrors = {};

    if (!formData.courseId) {
      newErrors.courseId = "Course is required";
    }
    if (!formData.title || formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    }
    if (!formData.dueDate) {
      newErrors.dueDate = "Due date is required";
    }
    if (formData.maxMarks <= 0) {
      newErrors.maxMarks = "Max marks must be greater than 0";
    }
    if (formData.passingMarks < 0 || formData.passingMarks > formData.maxMarks) {
      newErrors.passingMarks = `Passing marks must be between 0 and ${formData.maxMarks}`;
    }
    if (formData.lateSubmissionPenalty < 0 || formData.lateSubmissionPenalty > 100) {
      newErrors.lateSubmissionPenalty = "Late submission penalty must be between 0 and 100";
    }
    if (formData.maxFileSizeMb <= 0) {
      newErrors.maxFileSizeMb = "Max file size must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post("/assignments", data);
      if (!response.success) {
        throw new Error(response.error || "Failed to create assignment");
      }
      return response;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      const status = variables.status || "draft";
      const message = status === "published" 
        ? "Assignment published successfully and is now visible to students!"
        : "Assignment saved as draft successfully!";
      createAlert({
        icon: "success",
        title: status === "published" ? "Published!" : "Saved!",
        text: message,
      });
      router.push("/dashboards/instructor-manage-assignments");
    },
    onError: (error) => {
      createAlert({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to create assignment",
      });
    },
  });

  // Update assignment mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put(`/assignments/${editAssignmentId}`, data);
      if (!response.success) {
        throw new Error(response.error || "Failed to update assignment");
      }
      return response;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["assignment", editAssignmentId] });
      const status = variables.status || "draft";
      const message = status === "published"
        ? "Assignment updated and published successfully! It is now visible to students."
        : "Assignment updated and saved as draft successfully!";
      createAlert({
        icon: "success",
        title: status === "published" ? "Updated & Published!" : "Updated!",
        text: message,
      });
      router.push("/dashboards/instructor-manage-assignments");
    },
    onError: (error) => {
      createAlert({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to update assignment",
      });
    },
  });

  // Handle form submit
  const handleSubmit = async (e, status = "draft") => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert datetime-local to ISO string
      const dueDateISO = formData.dueDate
        ? new Date(formData.dueDate).toISOString()
        : null;

      const submitData = {
        ...formData,
        dueDate: dueDateISO,
        status,
        // Always include attachments array (empty if none)
        attachments: attachedFiles.map((f) => ({
          fileKey: f.fileKey,
          fileUrl: f.fileUrl,
          fileName: f.fileName,
          fileType: f.fileType,
          fileSizeBytes: f.fileSizeBytes,
        })),
      };

      if (isEditMode) {
        await updateAssignmentMutation.mutateAsync(submitData);
      } else {
        await createAssignmentMutation.mutateAsync(submitData);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} assignment:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while fetching assignment data
  if (isEditMode && isLoadingAssignmentData) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-gray-500">Loading assignment data...</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, formData.status)} className="space-y-6">
      {isEditMode && !assignmentData && !isLoadingAssignmentData && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          Assignment not found or you do not have permission to edit it.
        </div>
      )}
      {/* Course Selection */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Course <span className="text-red-500">*</span>
        </label>
        <AdvancedDropdown
          options={courseOptions}
          value={formData.courseId}
          onChange={(value) => handleChange("courseId", value)}
          placeholder="Select a course..."
          searchable={true}
          loading={isLoadingCourses}
          disabled={isLoadingCourses || isSubmitting || isEditMode}
        />
        {isEditMode && (
          <p className="text-xs text-gray-500 mt-1">
            Course cannot be changed after assignment is created.
          </p>
        )}
        {errors.courseId && <FieldError>{errors.courseId}</FieldError>}
        {courses.length === 0 && !isLoadingCourses && (
          <p className="text-sm text-gray-500 mt-1">
            No courses found. Please create a course first.
          </p>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          placeholder="Enter assignment title"
          disabled={isSubmitting}
        />
        {errors.title && <FieldError>{errors.title}</FieldError>}
      </div>

      {/* Description */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={4}
          className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          placeholder="Enter assignment description"
          disabled={isSubmitting}
        />
      </div>

      {/* Instructions */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Instructions
        </label>
        <textarea
          value={formData.instructions}
          onChange={(e) => handleChange("instructions", e.target.value)}
          rows={4}
          className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          placeholder="Enter assignment instructions for students"
          disabled={isSubmitting}
        />
      </div>

      {/* Marks Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Max Marks <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.maxMarks}
            onChange={(e) => handleChange("maxMarks", parseFloat(e.target.value) || 0)}
            min="1"
            step="0.01"
            className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            disabled={isSubmitting}
          />
          {errors.maxMarks && <FieldError>{errors.maxMarks}</FieldError>}
        </div>
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Passing Marks
          </label>
          <input
            type="number"
            value={formData.passingMarks}
            onChange={(e) => handleChange("passingMarks", parseFloat(e.target.value) || 0)}
            min="0"
            max={formData.maxMarks}
            step="0.01"
            className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            disabled={isSubmitting}
          />
          {errors.passingMarks && <FieldError>{errors.passingMarks}</FieldError>}
        </div>
      </div>

      {/* Due Date */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Due Date <span className="text-red-500">*</span>
        </label>
        <input
          type="datetime-local"
          value={formData.dueDate}
          onChange={(e) => handleChange("dueDate", e.target.value)}
          className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          disabled={isSubmitting}
        />
        {errors.dueDate && <FieldError>{errors.dueDate}</FieldError>}
      </div>

      {/* Late Submission Settings */}
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="allowLateSubmission"
            checked={formData.allowLateSubmission}
            onChange={(e) => handleChange("allowLateSubmission", e.target.checked)}
            className="w-4 h-4 text-primaryColor bg-gray-100 border-gray-300 rounded focus:ring-primaryColor"
            disabled={isSubmitting}
          />
          <label
            htmlFor="allowLateSubmission"
            className="ml-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark"
          >
            Allow Late Submission
          </label>
        </div>

        {formData.allowLateSubmission && (
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Late Submission Penalty (%)
            </label>
            <input
              type="number"
              value={formData.lateSubmissionPenalty}
              onChange={(e) => handleChange("lateSubmissionPenalty", parseFloat(e.target.value) || 0)}
              min="0"
              max="100"
              step="0.01"
              className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              disabled={isSubmitting}
            />
            {errors.lateSubmissionPenalty && <FieldError>{errors.lateSubmissionPenalty}</FieldError>}
            <p className="text-xs text-gray-500 mt-1">
              Percentage of marks to deduct for late submissions (0-100)
            </p>
          </div>
        )}
      </div>

      {/* File Upload Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Max File Size (MB)
          </label>
          <input
            type="number"
            value={formData.maxFileSizeMb}
            onChange={(e) => handleChange("maxFileSizeMb", parseInt(e.target.value) || 10)}
            min="1"
            className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            disabled={isSubmitting}
          />
          {errors.maxFileSizeMb && <FieldError>{errors.maxFileSizeMb}</FieldError>}
        </div>
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Allowed File Types (For Student Submissions)
          </label>
          <AdvancedDropdown
            options={fileTypeOptions}
            value={formData.allowedFileTypes}
            onChange={(value) => handleChange("allowedFileTypes", value)}
            placeholder="Select file types..."
            multiple={true}
            searchable={true}
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-1">
            Restrict file types that students can upload when submitting this assignment. Leave empty to allow all file types.
          </p>
        </div>
      </div>

      {/* Upload / Attach Files */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Upload / Attach Files
        </label>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              multiple
              className="hidden"
              id="assignment-file-upload"
              disabled={isSubmitting || uploading}
            />
            <label
              htmlFor="assignment-file-upload"
              className={`px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isSubmitting || uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? "Uploading..." : "Choose Files"}
            </label>
            {uploading && (
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading files...
              </span>
            )}
          </div>

          {/* Professional Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Uploading Files
              </h4>
              {Object.entries(uploadProgress).map(([fileId, progress]) => {
                const loaded = progress.loaded || 0;
                const total = progress.total || 1; // Prevent division by zero
                const percentage = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
                const loadedMB = (loaded / 1024 / 1024).toFixed(2);
                const totalMB = (total / 1024 / 1024).toFixed(2);
                
                return (
                  <div key={fileId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-gray-500 dark:text-gray-400 flex-shrink-0"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <span className="text-sm text-blackColor dark:text-blackColor-dark truncate">
                          {progress.name || 'Uploading...'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 ml-2 whitespace-nowrap">
                        {percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primaryColor to-primaryColor/80 h-2.5 rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-1"
                        style={{ width: `${percentage}%`, minWidth: percentage > 0 ? '4px' : '0px' }}
                      >
                        {percentage > 10 && percentage < 100 && (
                          <svg
                            className="w-3 h-3 text-white animate-pulse"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <circle cx="10" cy="10" r="3" />
                          </svg>
                        )}
                        {percentage >= 100 && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        {loadedMB} MB / {totalMB} MB
                      </span>
                      <span>
                        {percentage >= 100 ? 'Completed' : percentage > 0 ? 'Uploading...' : 'Initializing...'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Attached Files Carousel Preview */}
          {attachedFiles.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Attached Files ({attachedFiles.length})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setAttachedFiles([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  disabled={isSubmitting}
                  className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
                  title="Remove all files"
                >
                  Remove All
                </button>
              </div>
              
              {/* Carousel Container */}
              <div className="w-full" style={{ minHeight: "500px" }}>
                <SubmissionCarousel 
                  files={attachedFiles.map(file => ({
                    id: file.id,
                    fileUrl: file.fileUrl,
                    fileName: file.fileName,
                    fileType: file.fileType,
                    fileSizeBytes: file.fileSizeBytes,
                  }))}
                />
              </div>

              {/* File List for Quick Access */}
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-blackColor dark:text-blackColor-dark">
                  Quick Access:
                </p>
                <div className="flex flex-wrap gap-2">
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="group relative flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 hover:border-primaryColor dark:hover:border-primaryColor transition-all"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-500 flex-shrink-0"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                      <span className="text-xs text-blackColor dark:text-blackColor-dark truncate max-w-[200px]" title={file.fileName}>
                        {file.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        disabled={isSubmitting}
                        className="ml-1 p-1 text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
                        title="Remove file"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500">
            Upload files to attach to this assignment (e.g., resources, templates, examples). Maximum file size: 50MB per file.
          </p>
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Status
        </label>
        <select
          value={formData.status}
          onChange={(e) => handleChange("status", e.target.value)}
          className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          disabled={isSubmitting}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          onClick={(e) => {
            e.preventDefault();
            handleSubmit(e, "draft");
          }}
          disabled={isSubmitting || isLoadingCourses || isLoadingAssignmentData}
          className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : isEditMode ? "Update as Draft" : "Save as Draft"}
        </button>
        <button
          type="submit"
          onClick={(e) => {
            e.preventDefault();
            handleSubmit(e, "published");
          }}
          disabled={isSubmitting || isLoadingCourses || isLoadingAssignmentData}
          className="px-6 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Publishing..." : isEditMode ? "Update Assignment" : "Publish Assignment"}
        </button>
      </div>
    </form>
  );
};

export default AddAssignmentForm;

