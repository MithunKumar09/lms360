/**
 * useSubmitAssignment API Hook
 * 
 * React Query hook for submitting/updating assignment submissions.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useSubmitAssignment Mutation Hook
 * 
 * Submits or updates an assignment submission.
 * 
 * @returns {Object} Submit assignment mutation
 */
export const useSubmitAssignment = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ assignmentId, files, links, submissionId, isUpdate = false, existingFilesToKeep = [] }) => {
      const formData = new FormData();
      
      // Append all files with their metadata
      if (files && files.length > 0) {
        files.forEach((fileItem) => {
          // Handle both File objects (backward compatibility) and objects with metadata
          if (fileItem instanceof File) {
            // Legacy format: just a File object
            formData.append('files', fileItem);
          } else if (fileItem.file && fileItem.file instanceof File) {
            // New format: object with file, title, and description
            formData.append('files', fileItem.file);
            // Append metadata for this file (we'll use index to match them on backend)
            if (fileItem.title) {
              formData.append('fileTitles', fileItem.title);
            }
            if (fileItem.description) {
              formData.append('fileDescriptions', fileItem.description);
            }
          }
        });
      }
      
      // Append links/YouTube URLs (not File objects)
      if (links && links.length > 0) {
        formData.append('links', JSON.stringify(links));
      }
      
      // Append submission ID if updating
      if (submissionId) {
        formData.append('submissionId', submissionId);
      }
      
      // Append existing file IDs to keep (for edit mode - files that shouldn't be deleted)
      if (existingFilesToKeep && existingFilesToKeep.length > 0) {
        formData.append('existingFilesToKeep', JSON.stringify(existingFilesToKeep));
      }

      const method = isUpdate || submissionId ? 'PUT' : 'POST';
      // For FormData, we need to use fetch directly to avoid Content-Type header
      // The browser will set it automatically with the boundary
      const token = typeof window !== 'undefined' ? 
        (await import('@/store/index.js')).useAuthStore.getState().sessionToken : null;
      
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Don't set Content-Type - browser will set it with boundary for FormData
      
      const response = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method,
        headers,
        credentials: 'include',
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      const data = isJson ? await response.json() : { success: false, error: 'Invalid response format' };

      if (!response.ok || !data.success) {
        // Ensure error is always a string, never an object
        let errorMessage = 'Failed to submit assignment';
        if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        } else if (response.error) {
          errorMessage = typeof response.error === 'string' ? response.error : JSON.stringify(response.error);
        }
        throw new Error(errorMessage);
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['assignments', 'student'] });
      queryClient.invalidateQueries({ queryKey: ['assignment', 'student', variables.assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['assignment', 'submission', 'edit', variables.assignmentId] });

      const successMessage = variables.isUpdate ? 'Assignment updated successfully' : 'Assignment submitted successfully';
      createAlert('success', successMessage);
    },
    onError: (error) => {
      // Ensure error message is always a string, never an object
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
        ? error 
        : 'Failed to submit assignment';
      createAlert('error', errorMessage);
    },
  });
};

export default useSubmitAssignment;

