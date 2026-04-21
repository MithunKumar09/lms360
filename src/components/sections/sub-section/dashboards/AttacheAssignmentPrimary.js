"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AttachmentPreviewCarousel from "./AttachmentPreviewCarousel";
import { useStudentAssignmentDetails } from "@/hooks/api/useStudentAssignmentDetails";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import { useAssignmentDraftStore } from "@/store";
import { uploadAssignmentFile } from "@/lib/utils/assignmentUpload.js";
import { useSubmitAssignment } from "@/hooks/api/useSubmitAssignment.js";

const AttacheAssignmentPrimary = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const assignmentId = searchParams.get("assignmentId");
  const editMode = searchParams.get("edit") === "true";

  // Fetch assignment details to get attachments
  const { data: assignmentData, isLoading: isLoadingAssignment } = useStudentAssignmentDetails(assignmentId);

  // File type options
  const fileTypeOptions = [
    { value: "docx", label: "DOCX" },
    { value: "doc", label: "DOC" },
    { value: "pdf", label: "PDF" },
    { value: "link", label: "Link" },
    { value: "image", label: "Image" },
    { value: "video", label: "Video" },
    { value: "youtube", label: "YouTube" },
  ];

  // Form slider state
  const [sliders, setSliders] = useState([
    {
      id: Date.now(),
      title: "",
      fileType: "docx",
      fileUrl: "",
      description: "",
      file: null,
    },
  ]);

  // Carousel items (preview) - includes both assignment attachments and user files
  const [carouselItems, setCarouselItems] = useState([]);

  // Zustand store for draft persistence
  const assignmentDraftStore = useAssignmentDraftStore();
  const loadDraft = assignmentDraftStore.loadDraft;
  const saveDraft = assignmentDraftStore.saveDraft;
  const deleteDraft = assignmentDraftStore.deleteDraft;
  
  // Submit assignment mutation
  const submitAssignment = useSubmitAssignment();
  
  // Ref to track if draft has been loaded to prevent multiple loads
  const draftLoadedRef = useRef(false);
  // Ref to track if we should save drafts (only after initial load is complete)
  const canSaveDraftRef = useRef(false);
  // Ref to track if edit mode submission has been prefetched
  const editModePrefetchedRef = useRef(false);
  // Store original submission ID for update operations
  const [submissionId, setSubmissionId] = useState(null);

  // Get assignment attachments from API
  const assignmentAttachments = useMemo(() => {
    if (!assignmentData?.assignment) {
      console.log('[AttacheAssignment] No assignment data yet');
      return [];
    }
    
    const attachments = assignmentData.assignment.assignmentAttachments;
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      console.log('[AttacheAssignment] No assignment attachments found:', {
        hasData: !!assignmentData,
        hasAssignment: !!assignmentData?.assignment,
        hasAttachments: !!attachments,
        attachmentsType: typeof attachments,
        attachmentsLength: Array.isArray(attachments) ? attachments.length : 'not array',
        assignmentData: assignmentData?.assignment
      });
      return [];
    }
    
    const mappedAttachments = attachments.map(att => {
      if (!att || !att.fileUrl) {
        console.warn('[AttacheAssignment] Invalid attachment:', att);
        return null;
      }
      return {
        id: `assignment_${att.id}`,
        title: att.fileName || 'Untitled',
        fileUrl: att.fileUrl,
        fileType: att.fileType || 'application/octet-stream',
        description: `Assignment attachment: ${att.fileName}`,
        isAssignmentAttachment: true, // Flag to distinguish from user files
      };
    }).filter(Boolean); // Remove any null entries
    
    console.log('[AttacheAssignment] Assignment attachments loaded:', {
      count: mappedAttachments.length,
      attachments: mappedAttachments
    });
    return mappedAttachments;
  }, [assignmentData]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      // No blob URLs to cleanup - we only use R2 URLs
    };
  }, [carouselItems, sliders]);

  // Combine assignment attachments with user files for carousel
  useEffect(() => {
    try {
      const userFiles = sliders
        .filter((slider) => {
          try {
            // Only include sliders that have a valid file or fileUrl
            // Must have either: a File object, a non-empty fileUrl, or a fileDataUrl
            const hasFile = slider.file && (slider.file instanceof File || slider.file instanceof Blob);
            const hasFileUrl = slider.fileUrl && slider.fileUrl.trim() !== '';
            const hasDataUrl = slider.fileDataUrl && slider.fileDataUrl.trim() !== '';
            
            return hasFile || hasFileUrl || hasDataUrl;
          } catch (e) {
            // If there's an error checking slider validity, exclude it
            console.warn('[AttacheAssignment] Error checking slider validity:', e instanceof Error ? e.message : String(e));
            return false;
          }
        })
        .map((slider) => {
          try {
            let previewUrl = null;
        
        // Priority: R2 public URL (HTTPS, CSP-compatible) > data URL > blob URL (temporary only)
        // Like create-course page: upload to R2 immediately and use public URL
        if (slider.fileUrl && slider.fileUrl.startsWith('https://')) {
          // R2 public URL (best option - CSP-compatible, persists, works everywhere)
          previewUrl = slider.fileUrl;
        } else if (slider.fileUrl && (slider.fileUrl.startsWith('http://') || slider.fileUrl.startsWith('data:'))) {
          // Regular HTTP URL or data URL
          previewUrl = slider.fileUrl;
        } else if (slider.fileUrl && slider.fileUrl.trim() !== '' && slider.fileUrl.startsWith('https://')) {
          // Use R2 URL directly (HTTPS, CSP-compatible)
          previewUrl = slider.fileUrl;
        } else if (slider.file && (slider.file instanceof File || slider.file instanceof Blob)) {
          // If we have a File object but no R2 URL yet, file is still uploading
          // Don't create blob URL - wait for R2 upload to complete
          previewUrl = null;
        }
        
        // If no preview URL but slider has title/description, still include it in carousel
        // But don't create a placeholder URL (causes CSP violations)
        // The carousel will show a loading/placeholder UI instead
        if (!previewUrl || previewUrl.trim() === '') {
          // Only exclude if slider has no data at all
          if (!slider.title && !slider.description && !slider.file) {
            return null;
          }
          // Keep previewUrl as empty string - carousel will handle it
          previewUrl = '';
        }

        // Determine file type from actual file if available, otherwise from URL or slider.fileType
        let fileType = slider.fileType;
        if (slider.file && (slider.file instanceof File || slider.file instanceof Blob)) {
          // Use file's MIME type if available, otherwise use slider.fileType
          fileType = slider.file.type || slider.fileType;
        } else if (previewUrl) {
          // Try to determine file type from the preview URL
          const urlLower = previewUrl.toLowerCase();
          if (previewUrl.startsWith('data:')) {
            // Handle data URLs (base64) - extract MIME type
            const mimeMatch = previewUrl.match(/data:([^;]+)/);
            if (mimeMatch) {
              fileType = mimeMatch[1];
            }
          } else {
            // Try to detect from URL extension or slider.fileType
            if (urlLower.includes('.pdf') || slider.fileType === 'pdf') {
              fileType = 'application/pdf';
            } else if (urlLower.match(/\.(docx?)$/i) || slider.fileType === 'docx' || slider.fileType === 'doc') {
              // Word documents
              fileType = urlLower.endsWith('.docx') || slider.fileType === 'docx'
                ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : 'application/msword';
            } else if (urlLower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i) || slider.fileType === 'image') {
              fileType = 'image/jpeg'; // Default image type
            } else if (urlLower.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i) || slider.fileType === 'video') {
              fileType = 'video/mp4'; // Default video type
            } else if (slider.fileType === 'youtube' || slider.fileType === 'link') {
              fileType = slider.fileType; // Keep as-is for YouTube/links
            }
          }
        }
        
        // Normalize fileType string for common patterns
        if (fileType === 'pdf') fileType = 'application/pdf';
        if (fileType === 'image') fileType = 'image/jpeg';
        if (fileType === 'docx') fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (fileType === 'doc') fileType = 'application/msword';

            return {
              id: slider.id,
              title: slider.title || slider.file?.name || 'Untitled',
              fileUrl: previewUrl,
              fileType: fileType,
              description: slider.description,
              isAssignmentAttachment: false,
              file: slider.file, // Keep file reference for blob URL recreation
              fileDataUrl: slider.fileDataUrl || null, // Include data URL for CSP compliance
            };
          } catch (e) {
            // If there's an error processing a slider, log it and exclude it
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.warn('[AttacheAssignment] Error processing slider:', errorMessage, slider);
            return null;
          }
        })
        .filter(item => item !== null && item && (item.fileUrl || item.title || item.description)); // Include items with URL, title, or description

      // Combine: assignment attachments first, then user files
      const allItems = [...assignmentAttachments, ...userFiles];
      console.log('[AttacheAssignment] Carousel items updated:', {
        assignmentAttachments: assignmentAttachments.length,
        userFiles: userFiles.length,
        total: allItems.length,
        items: allItems
      });
      setCarouselItems(allItems);
    } catch (error) {
      // Safely handle errors in carousel creation
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
        ? error 
        : 'Failed to create carousel items';
      console.error('[AttacheAssignment] Error creating carousel items:', errorMessage);
      // Set empty carousel on error to prevent rendering issues
      setCarouselItems([]);
    }
  }, [sliders, assignmentAttachments]);

  // Load draft from IndexedDB on mount (SKIP if in edit mode - edit mode uses submission data)
  useEffect(() => {
    // Skip draft loading if in edit mode - edit mode uses submission data, not drafts
    if (editMode) {
      console.log('[AttacheAssignment] Skipping draft load - edit mode active');
      canSaveDraftRef.current = false; // Don't save drafts in edit mode
      return;
    }
    
    // Only run if we have assignmentId
    if (!assignmentId) {
      // No assignmentId - allow saving for new assignments
      canSaveDraftRef.current = true;
      return;
    }
    if (draftLoadedRef.current) return; // Already loaded
    
    // Wait for store to be ready
    const tryLoadDraft = () => {
      if (!loadDraft || typeof loadDraft !== 'function') {
        // Store not ready yet, retry after a short delay
        setTimeout(tryLoadDraft, 100);
        return;
      }
      
      // Store is ready, proceed with loading
      draftLoadedRef.current = true; // Mark as loading
      canSaveDraftRef.current = false; // Prevent saving until draft is loaded
      
      loadDraft(assignmentId).then((draft) => {
        console.log('[AttacheAssignment] Draft load result:', {
          hasDraft: !!draft,
          hasSliders: !!(draft && draft.sliders),
          sliderCount: draft?.sliders?.length || 0,
          sliders: draft?.sliders
        });
        
        if (draft && draft.sliders && draft.sliders.length > 0) {
          console.log('[AttacheAssignment] Restoring draft sliders:', draft.sliders.length);
          
          // Restore sliders with File objects and R2 URLs from IndexedDB
          // Only use R2 URLs - no blob URLs
          const restoredSliders = draft.sliders.map(slider => {
            // Use R2 URL directly (HTTPS, CSP-compatible)
            // If no R2 URL but we have File object, keep it for submission but no preview URL
            return {
              ...slider,
              fileUrl: (slider.fileUrl && slider.fileUrl.startsWith('https://')) ? slider.fileUrl : '', // Only use R2 HTTPS URLs
              fileDataUrl: null, // No need for data URLs when using R2 URLs
            };
          });
          
          console.log('[AttacheAssignment] Restored sliders:', restoredSliders);
          
          // Restore sliders from draft immediately
          if (restoredSliders.length > 0) {
            console.log('[AttacheAssignment] Setting restored sliders immediately:', restoredSliders.length);
            setSliders(restoredSliders);
          }
          
          // Allow saving after draft load is complete (whether draft was found or not)
          // Use a small delay to ensure state update completes first
          setTimeout(() => {
            canSaveDraftRef.current = true;
            console.log('[AttacheAssignment] Draft loading complete, saving enabled');
          }, 200);
        } else {
          // No draft found - keep initial empty slider, but allow saving now
          console.log('[AttacheAssignment] No draft found for assignmentId:', assignmentId);
          canSaveDraftRef.current = true;
        }
      }).catch((error) => {
        console.error('[AttacheAssignment] Error loading draft:', error);
        draftLoadedRef.current = false; // Reset on error so we can retry
        // Allow saving even if load failed (user can still work)
        canSaveDraftRef.current = true;
      });
    };
    
    // Start trying to load draft
    tryLoadDraft();
  }, [assignmentId, loadDraft, editMode]);
  
  // Reset draft loaded flag and canSave flag when assignmentId changes
  useEffect(() => {
    if (!editMode) {
      draftLoadedRef.current = false;
      canSaveDraftRef.current = false; // Prevent saving until new draft is loaded
    }
  }, [assignmentId, editMode]);

  // Prefetch submission data when in edit mode
  useEffect(() => {
    // Only run in edit mode
    if (!editMode) {
      editModePrefetchedRef.current = false;
      setSubmissionId(null);
      return;
    }

    // Check if we have assignment data with submission
    if (!assignmentData?.assignment?.submission) {
      console.log('[AttacheAssignment] Edit mode active but no submission found yet');
      return;
    }

    // Prevent multiple prefetches
    if (editModePrefetchedRef.current) {
      console.log('[AttacheAssignment] Submission already prefetched for edit mode');
      return;
    }

    const submission = assignmentData.assignment.submission;
    const submissionFiles = submission.files || [];

    console.log('[AttacheAssignment] Prefetching submission data for edit mode:', {
      submissionId: submission.id,
      fileCount: submissionFiles.length,
      files: submissionFiles
    });

    // Store submission ID for update operation
    setSubmissionId(submission.id);

    // Map submission files to slider format
    if (submissionFiles.length > 0) {
      const mappedSliders = submissionFiles.map((file) => {
        console.log('[AttacheAssignment] Processing submission file:', file);
        
        // Extract filename - try multiple sources
        let fileName = file.fileName || file.file_name || '';
        
        // If fileName is still empty, try to extract from fileUrl
        if (!fileName && file.fileUrl) {
          try {
            // Extract filename from URL (get last part after /)
            const urlParts = file.fileUrl.split('/');
            fileName = urlParts[urlParts.length - 1] || '';
            // Remove query parameters if any
            if (fileName.includes('?')) {
              fileName = fileName.split('?')[0];
            }
          } catch (e) {
            console.warn('[AttacheAssignment] Could not extract filename from URL:', e);
          }
        }
        
        // Fallback to a default name if still empty
        if (!fileName || fileName.trim() === '') {
          fileName = 'Untitled File';
        }
        
        // Determine file type from file extension or MIME type
        let detectedFileType = 'docx'; // default
        const fileType = file.fileType || file.file_type || '';
        
        // Check if it's a link or youtube type first (these are stored as-is in DB)
        if (fileType === 'link' || fileType === 'youtube') {
          detectedFileType = fileType;
        } else if (fileType) {
          // Try to map MIME type to our file type options
          if (fileType.includes('pdf')) detectedFileType = 'pdf';
          else if (fileType.includes('image')) detectedFileType = 'image';
          else if (fileType.includes('video')) detectedFileType = 'video';
          else if (fileType.includes('msword') || fileType.includes('wordprocessingml')) {
            detectedFileType = fileName.toLowerCase().endsWith('.docx') ? 'docx' : 'doc';
          }
        } else if (fileName) {
          // Fallback to file extension
          const ext = fileName.split('.').pop()?.toLowerCase();
          if (ext === 'pdf') detectedFileType = 'pdf';
          else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) detectedFileType = 'image';
          else if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) detectedFileType = 'video';
          else if (ext === 'docx') detectedFileType = 'docx';
          else if (ext === 'doc') detectedFileType = 'doc';
        }

        const mappedSlider = {
          id: file.id || Date.now() + Math.random(), // Use file ID if available, otherwise generate
          title: fileName, // Use extracted fileName as title
          fileType: detectedFileType,
          fileUrl: file.fileUrl || file.file_url || '', // Use existing file URL
          description: '', // Description is not stored in submission files, use empty string
          file: null, // No File object - file already uploaded, using URL
        };
        
        console.log('[AttacheAssignment] Mapped slider:', mappedSlider);
        return mappedSlider;
      });

      console.log('[AttacheAssignment] Setting prefetched sliders:', mappedSliders);
      setSliders(mappedSliders);
      editModePrefetchedRef.current = true;
      // Don't enable draft saving in edit mode
      canSaveDraftRef.current = false;
    } else {
      // No files in submission, start with empty slider
      const initialSlider = {
        id: Date.now(),
        title: "",
        fileType: "docx",
        fileUrl: "",
        description: "",
        file: null,
      };
      setSliders([initialSlider]);
      editModePrefetchedRef.current = true;
      canSaveDraftRef.current = false;
    }
  }, [editMode, assignmentData]);

  // Cleanup when edit mode closes or assignmentId changes
  useEffect(() => {
    // Reset prefetched data when edit mode closes or assignmentId changes
    if (!editMode && editModePrefetchedRef.current) {
      console.log('[AttacheAssignment] Cleaning up edit mode prefetch data - edit mode closed');
      editModePrefetchedRef.current = false;
      setSubmissionId(null);
      // Reset to initial state
      const initialSlider = {
        id: Date.now(),
        title: "",
        fileType: "docx",
        fileUrl: "",
        description: "",
        file: null,
      };
      setSliders([initialSlider]);
      // Carousel will be updated automatically via the useEffect that watches sliders
    }
    
    return () => {
      // Cleanup on unmount or when dependencies change
      if (editModePrefetchedRef.current && (!editMode || !assignmentId)) {
        editModePrefetchedRef.current = false;
        setSubmissionId(null);
      }
    };
  }, [editMode, assignmentId]);

  // Update carousel items when sliders change and save to IndexedDB
  const updateCarousel = async (updatedSliders) => {
    // Don't save drafts in edit mode - edit mode doesn't use draft persistence
    if (editMode) {
      console.log('[AttacheAssignment] Skipping draft save - edit mode active');
      return;
    }

    // Don't save if draft hasn't been loaded yet (prevents overwriting draft with empty initial state)
    if (!canSaveDraftRef.current) {
      console.log('[AttacheAssignment] Skipping save - draft not loaded yet', {
        canSave: canSaveDraftRef.current,
        sliderCount: updatedSliders.length
      });
      return;
    }
    
    // Save to IndexedDB using Zustand store (handles File objects properly)
    // Only save if assignmentId exists and we have sliders with actual data
    if (assignmentId && saveDraft && typeof saveDraft === 'function' && updatedSliders.length > 0) {
      try {
        // Only save if at least one slider has a file, title, description, or fileUrl
        const hasData = updatedSliders.some(slider => 
          slider.file || 
          (slider.title && slider.title.trim() !== '') || 
          (slider.description && slider.description.trim() !== '') ||
          (slider.fileUrl && slider.fileUrl.trim() !== '')
        );
        
        if (hasData) {
          console.log('[AttacheAssignment] Saving draft:', {
            assignmentId,
            sliderCount: updatedSliders.length,
            sliders: updatedSliders.map(s => ({ id: s.id, title: s.title, hasFile: !!s.file, hasUrl: !!s.fileUrl }))
          });
          await saveDraft(assignmentId, updatedSliders);
          console.log('[AttacheAssignment] Draft saved successfully');
        } else {
          console.log('[AttacheAssignment] Skipping save - no data in sliders');
        }
      } catch (error) {
        console.error('[AttacheAssignment] Error saving draft to IndexedDB:', error);
      }
    }
    // Carousel items are now updated via useEffect that combines assignment attachments + user files
  };

  // Handle slider field change
  const handleSliderChange = (id, field, value) => {
    const updatedSliders = sliders.map((slider) =>
      slider.id === id ? { ...slider, [field]: value } : slider
    );
    setSliders(updatedSliders);
    updateCarousel(updatedSliders).catch(err => console.error('[AttacheAssignment] Error saving draft:', err));
  };

  // Handle file upload - upload to R2 immediately like create-course page
  const handleFileUpload = async (id, file) => {
    // Auto-detect file type from file
    let detectedType = 'docx';
    if (file.type) {
      if (file.type.startsWith('image/')) detectedType = 'image';
      else if (file.type === 'application/pdf') detectedType = 'pdf';
      else if (file.type.startsWith('video/')) detectedType = 'video';
      else if (file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        detectedType = file.name.toLowerCase().endsWith('.docx') ? 'docx' : 'doc';
      }
      else if (file.name.toLowerCase().endsWith('.pdf')) detectedType = 'pdf';
      else if (file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) detectedType = 'image';
      else if (file.name.match(/\.(doc|docx)$/i)) detectedType = file.name.toLowerCase().endsWith('.docx') ? 'docx' : 'doc';
    }
    
    // Update slider with uploading state (no blob URL - will use R2 URL directly)
    const updatedSliders = sliders.map((slider) => {
      if (slider.id === id) {
        return { 
          ...slider, 
          file, 
          fileUrl: '', // Will be set to R2 URL after upload
          fileType: detectedType,
          uploading: true, // Track upload state
        };
      }
      return slider;
    });
    setSliders(updatedSliders);
    
    try {
      // Upload file to R2 immediately (like create-course page does)
      // Use assignmentUpload which supports PDFs, Word docs, images, videos
      const uploadResult = await uploadAssignmentFile(file);
      
      // Update slider with R2 public URL (CSP-compatible HTTPS URL)
      const finalSliders = updatedSliders.map((slider) => {
        if (slider.id === id) {
          return {
            ...slider,
            fileUrl: uploadResult.publicUrl, // Use R2 public URL (HTTPS, CSP-compatible)
            fileKey: uploadResult.key, // Store R2 key for reference
            uploading: false,
          };
        }
        return slider;
      });
      
      setSliders(finalSliders);
      
      // Save to IndexedDB with R2 URL
      await updateCarousel(finalSliders);
    } catch (error) {
      console.error('[AttacheAssignment] Error uploading file to R2:', error);
      
      // On error, remove file and show error
      const errorSliders = updatedSliders.map((slider) => {
        if (slider.id === id) {
          return {
            ...slider,
            file: null,
            fileUrl: '',
            uploading: false,
            uploadError: error.message || 'Upload failed',
          };
        }
        return slider;
      });
      setSliders(errorSliders);
    }
  };

  // Add new slider
  const handleAddSlider = () => {
    if (sliders.length < 10) {
      const newSlider = {
        id: Date.now() + Math.random(),
        title: "",
        fileType: "docx",
        fileUrl: "",
        description: "",
        file: null,
      };
      const updatedSliders = [...sliders, newSlider];
      setSliders(updatedSliders);
      updateCarousel(updatedSliders);
    }
  };

  // Remove slider
  const handleRemoveSlider = (id) => {
    if (sliders.length > 1) {
      try {
        // No blob URLs to revoke - we only use R2 URLs
        const sliderToRemove = sliders.find(s => s.id === id);
        
        const updatedSliders = sliders.filter((slider) => slider.id !== id);
        setSliders(updatedSliders);
        updateCarousel(updatedSliders).catch(err => {
          // Safely handle errors - ensure error message is a string
          const errorMessage = err instanceof Error 
            ? err.message 
            : typeof err === 'string' 
            ? err 
            : 'Failed to update carousel';
          console.error('[AttacheAssignment] Error updating carousel after removal:', errorMessage);
        });
      } catch (error) {
        // Safely handle errors - ensure error message is a string
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'string' 
          ? error 
          : 'Failed to remove slider';
        console.error('[AttacheAssignment] Error removing slider:', errorMessage);
      }
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!assignmentId) {
      alert("Assignment ID is required");
      return;
    }

    // Get files from sliders that have File objects (new files to upload)
    // Include metadata (title and description) with each file
    const filesToSubmit = sliders
      .filter(slider => slider.file && slider.file instanceof File)
      .map(slider => ({
        file: slider.file, // The actual File object
        title: slider.title?.trim() || slider.file.name || 'Untitled File', // User-entered title or fallback to filename
        description: slider.description?.trim() || '', // User-entered description
      }));
    
    // Get NEW links/YouTube URLs (not File objects, and not existing from DB) that need to be saved
    // New links don't have UUIDs (they have generated IDs from Date.now() or Math.random())
    const linksToSubmit = sliders
      .filter(slider => {
        // Must be link or youtube type
        if (slider.fileType !== 'link' && slider.fileType !== 'youtube') {
          return false;
        }
        // Must have URL and title
        if (!slider.fileUrl || slider.fileUrl.trim() === '' || !slider.title || slider.title.trim() === '') {
          return false;
        }
        // Not a file upload
        if (slider.file) {
          return false;
        }
        // Check if it's a new link (no UUID) - existing links from DB will have UUIDs
        const id = slider.id;
        if (id) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          // If it has a UUID, it's an existing link from DB (will be in existingFilesToKeep)
          if (typeof id === 'string' && uuidRegex.test(id)) {
            return false;
          }
        }
        // It's a new link (generated ID or no ID)
        return true;
      })
      .map(slider => ({
        title: slider.title.trim(),
        fileType: slider.fileType,
        fileUrl: slider.fileUrl.trim(),
        description: slider.description || '',
      }));
    
    // In edit mode, get existing files/links that should be kept (have fileUrl but no File object)
    // Only include files with valid UUIDs (from database), not generated IDs
    const existingFilesToKeep = editMode ? sliders
      .filter(slider => {
        // Must have fileUrl, no File object, and a valid UUID (from database prefetch)
        if (!slider.fileUrl || slider.fileUrl.trim() === '' || slider.file) {
          return false;
        }
        // If it's a link/youtube type, only include if it has a valid UUID (from database)
        // New links/YouTube entries won't have UUIDs yet
        if (slider.fileType === 'link' || slider.fileType === 'youtube') {
          // For links, only keep if it has a UUID (existing from DB)
          // New links are handled separately in linksToSubmit
          const id = slider.id;
          if (!id) return false;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return typeof id === 'string' && uuidRegex.test(id);
        }
        // For regular files, check if ID is a UUID string (not a generated number)
        const id = slider.id;
        if (!id) return false;
        // UUIDs are strings with format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return typeof id === 'string' && uuidRegex.test(id);
      })
      .map(slider => ({
        id: slider.id, // This is the file/link ID from database (UUID)
        fileUrl: slider.fileUrl,
        fileName: slider.title || '',
      })) : [];

    // Validate that we have at least one item to submit (file, link, or existing file to keep)
    const totalItemsToSubmit = filesToSubmit.length + linksToSubmit.length + existingFilesToKeep.length;
    
    if (editMode) {
      if (totalItemsToSubmit === 0) {
        alert("Please add at least one file or link to submit.");
        return;
      }
    } else {
      // For new submissions, require at least one file or link
      if (filesToSubmit.length === 0 && linksToSubmit.length === 0) {
        alert("Please attach at least one file or link before submitting");
        return;
      }
    }

    try {
      // Use submission ID from state (set during edit mode prefetch) or from assignment data
      const existingSubmissionId = submissionId || assignmentData?.assignment?.submission?.id || null;
      const isUpdate = editMode && !!existingSubmissionId;

      console.log('[AttacheAssignment] Submitting assignment:', {
        assignmentId,
        submissionId: existingSubmissionId,
        isUpdate,
        editMode,
        fileCount: filesToSubmit.length,
        linkCount: linksToSubmit.length,
        existingFilesToKeepCount: existingFilesToKeep.length,
        totalItems: totalItemsToSubmit
      });

      // Submit assignment
      // In edit mode, include existing files to keep
      await submitAssignment.mutateAsync({
        assignmentId,
        files: filesToSubmit,
        links: linksToSubmit.length > 0 ? linksToSubmit : undefined, // Send links if any
        submissionId: existingSubmissionId,
        isUpdate,
        existingFilesToKeep: editMode ? existingFilesToKeep : undefined, // Only send in edit mode
      });

      // On success: clear draft (only if not in edit mode), reset form, and navigate
      if (!editMode && assignmentId && deleteDraft && typeof deleteDraft === 'function') {
        await deleteDraft(assignmentId);
      }
      
      // Reset edit mode prefetch flag
      editModePrefetchedRef.current = false;
      setSubmissionId(null);
      
      // Clear all sliders and reset to initial state
      const initialSlider = {
        id: Date.now(),
        title: "",
        fileType: "docx",
        fileUrl: "",
        description: "",
        file: null,
      };
      setSliders([initialSlider]);
      setCarouselItems([]);
      
      // Navigate to student assignments page
      router.push('/dashboards/student-assignments');
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error('[AttacheAssignment] Error submitting assignment:', error);
    }
  };

  const assignment = assignmentData?.assignment;
  const assignmentTitle = assignment?.title || "Assignment";

  // Loading state - MUST be after all hooks
  if (isLoadingAssignment) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <SkeletonLoader type="card" className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
            {editMode ? "Edit Assignment" : "Attach Assignment"}
          </h1>
          <p className="text-contentColor dark:text-contentColor-dark">
            {assignmentTitle}
          </p>
          {assignmentId && (
            <p className="text-sm text-contentColor dark:text-contentColor-dark mt-1">
              Assignment ID: {assignmentId}
            </p>
          )}
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-contentColor dark:text-contentColor-dark hover:text-primaryColor transition-colors px-4 py-2 rounded-lg hover:bg-lightGrey5 dark:hover:bg-darkdeep1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span className="font-medium">Back</span>
        </button>
      </div>

      {/* Assignment Attachments Section */}
      {assignmentAttachments.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark mb-4 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Assignment Materials ({assignmentAttachments.length} {assignmentAttachments.length === 1 ? "file" : "files"})
          </h2>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              These are the assignment materials provided by your instructor. You can view them below, but you cannot modify them.
            </p>
          </div>
        </div>
      )}

      {/* Carousel Preview */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark mb-4 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          Preview ({carouselItems.length} {carouselItems.length === 1 ? "item" : "items"})
          {assignmentAttachments.length > 0 && carouselItems.length > assignmentAttachments.length && (
            <span className="text-sm font-normal text-contentColor dark:text-contentColor-dark ml-2">
              ({assignmentAttachments.length} assignment {assignmentAttachments.length === 1 ? "file" : "files"} + {carouselItems.length - assignmentAttachments.length} your {carouselItems.length - assignmentAttachments.length === 1 ? "file" : "files"})
            </span>
          )}
          {assignmentAttachments.length > 0 && carouselItems.length === assignmentAttachments.length && (
            <span className="text-sm font-normal text-contentColor dark:text-contentColor-dark ml-2">
              ({assignmentAttachments.length} assignment {assignmentAttachments.length === 1 ? "file" : "files"})
            </span>
          )}
        </h2>
        <AttachmentPreviewCarousel items={carouselItems.length > 0 ? carouselItems : assignmentAttachments} />
      </div>

      {/* Form Sliders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            Upload Files ({sliders.length}/10)
          </h2>
          {sliders.length < 10 && (
            <button
              onClick={handleAddSlider}
              className="flex items-center gap-2 px-4 py-2 bg-primaryColor hover:bg-primaryColor/90 text-whiteColor font-medium rounded-lg transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add File
            </button>
          )}
        </div>

        {sliders.map((slider, index) => (
          <div
            key={slider.id}
            className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-5 border border-borderColor dark:border-borderColor-dark"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                File #{index + 1}
              </h3>
              {sliders.length > 1 && (
                <button
                  onClick={() => handleRemoveSlider(slider.id)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                  title="Remove this file"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={slider.title}
                  onChange={(e) => handleSliderChange(slider.id, "title", e.target.value)}
                  placeholder="Enter file title"
                  className="w-full px-4 py-2.5 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                />
              </div>

              {/* File Type */}
              <div>
                <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
                  File Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={slider.fileType}
                  onChange={(e) => handleSliderChange(slider.id, "fileType", e.target.value)}
                  className="w-full px-4 py-2.5 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                >
                  {fileTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload/Link Field */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
                {slider.fileType === "link" || slider.fileType === "youtube" ? "Link URL" : "Upload File"}{" "}
                <span className="text-red-500">*</span>
              </label>
              {slider.fileType === "link" || slider.fileType === "youtube" ? (
                <input
                  type="url"
                  value={slider.fileUrl}
                  onChange={(e) => handleSliderChange(slider.id, "fileUrl", e.target.value)}
                  placeholder={
                    slider.fileType === "youtube"
                      ? "https://www.youtube.com/watch?v=..."
                      : "https://example.com/file.pdf"
                  }
                  className="w-full px-4 py-2.5 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                />
              ) : (
                <div className="space-y-2">
                  {/* Show existing file info if fileUrl exists but no File object (edit mode) */}
                  {!slider.file && slider.fileUrl && slider.fileUrl.trim() !== '' && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-green-600 dark:text-green-400 flex-shrink-0"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-900 dark:text-green-200 truncate">
                          {slider.title || 'Existing file'} - Will be kept
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          This file will be kept. Upload a new file below only if you want to replace it.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(slider.id, file);
                        }
                      }}
                      accept={
                        slider.fileType === "image"
                          ? "image/*"
                          : slider.fileType === "video"
                          ? "video/*"
                          : slider.fileType === "pdf"
                          ? ".pdf"
                          : slider.fileType === "docx" || slider.fileType === "doc"
                          ? ".doc,.docx"
                          : "*"
                      }
                      className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primaryColor file:text-whiteColor hover:file:bg-primaryColor/90 cursor-pointer"
                    />
                    {slider.file && (
                      <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
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
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        {slider.file.name}
                      </span>
                    )}
                    {slider.uploading && (
                      <span className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
                Description
              </label>
              <textarea
                value={slider.description}
                onChange={(e) => handleSliderChange(slider.id, "description", e.target.value)}
                placeholder="Enter file description (optional)"
                rows={3}
                className="w-full px-4 py-2.5 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent resize-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="mt-6 pt-6 border-t border-borderColor dark:border-borderColor-dark flex justify-end">
        <button
          onClick={handleSubmit}
          className="px-8 py-3.5 bg-primaryColor hover:bg-primaryColor/90 text-whiteColor font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Submit Assignment
        </button>
      </div>
    </div>
  );
};

export default AttacheAssignmentPrimary;

