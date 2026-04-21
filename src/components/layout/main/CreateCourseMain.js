'use client';

import CreateCoursePrimary from "@/components/sections/create-course/CreateCoursePrimary";
import HeroPrimary from "@/components/sections/hero-banners/HeroPrimary";
import React, { useEffect, useState } from "react";
import { useCourseStore } from "@/store/index.js";
import { useAutoSave } from "@/hooks/useAutoSave.js";
import ToastContainer from "@/components/shared/errors/ToastContainer.js";
import { useToast } from "@/hooks/useToast.js";
import { useCoursePermissions } from "@/hooks/useCoursePermissions.js";
import { useRealTimeValidation } from "@/hooks/useRealTimeValidation.js";
import ValidationSummary from "@/components/shared/forms/ValidationSummary.js";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/index.js";

// Wrapper component to conditionally render validation summary with container
const ValidationSummaryWrapper = () => {
  const { validationErrors, errors, validationAttempted } = useCourseStore();
  
  // Only show errors if validation has been attempted
  if (!validationAttempted) {
    return null;
  }

  // Combine validation errors and general errors
  const allErrors = { ...validationErrors, ...errors };
  const errorKeys = Object.keys(allErrors).filter((key) => allErrors[key]);

  // Don't render wrapper if no errors
  if (errorKeys.length === 0) {
    return null;
  }

  return (
    <div className="container pt-100px pb-100px">
      <div className="max-w-4xl mx-auto mb-5">
        <ValidationSummary />
      </div>
    </div>
  );
};

const CreateCourseMain = ({ isVendorMode: propIsVendorMode = false }) => {
  const { loadDraft, loadCourseForEdit, loadingDraft, apiError, isEditMode, clearEditModeData } = useCourseStore();
  const { toasts, removeToast, error: showError } = useToast();
  const searchParams = useSearchParams();
  const [isInitialized, setIsInitialized] = useState(false);
  const [previousEditCourseId, setPreviousEditCourseId] = useState(null);
  
  // Auto-detect vendor mode from user role
  const user = useAuthStore((state) => state.user);
  const isVendorFromRole = user?.role === 'vendor';
  const isVendorMode = propIsVendorMode || isVendorFromRole;
  
  // Check URL parameter to determine edit mode immediately (before course loads)
  const editCourseId = searchParams.get('edit');
  const isEditModeFromUrl = !!editCourseId;
  
  // Use store's isEditMode if available, otherwise fall back to URL check
  const currentIsEditMode = isEditMode || isEditModeFromUrl;
  
  // Enforce role-based permissions
  useCoursePermissions();

  // Update document title based on edit mode
  useEffect(() => {
    if (currentIsEditMode) {
      document.title = 'Edit Course | Edurock - Education LMS Template';
    } else {
      document.title = 'Create Course | Edurock - Education LMS Template';
    }
  }, [currentIsEditMode]);

  // Check for edit mode and load course or draft
  useEffect(() => {
    const { isPublished } = useCourseStore.getState();
    
    // Don't load if already initialized or course was just published
    if (isInitialized || isPublished) {
      if (isPublished) {
        console.log('✅ [CREATE COURSE] Course was just published, skipping load');
      }
      return;
    }
    
    const initializeCourse = async () => {
      try {
        // Check if we're in edit mode (URL has ?edit=courseId)
        const editCourseId = searchParams.get('edit');
        
        if (editCourseId) {
          console.log('✏️ [CREATE COURSE] Edit mode detected, loading course:', editCourseId);
          setPreviousEditCourseId(editCourseId);
          await loadCourseForEdit(editCourseId);
        } else {
          // Load latest draft if available (will check expiration automatically)
          console.log('📝 [CREATE COURSE] Create mode, loading draft if available');
          setPreviousEditCourseId(null);
          
          // Check localStorage draft expiration before loading
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              const storageKey = 'course-draft-storage';
              const stored = localStorage.getItem(storageKey);
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.state && parsed.state.lastSaved) {
                  const { isDraftExpired } = useCourseStore.getState();
                  if (isDraftExpired(parsed.state.lastSaved)) {
                    console.log('⏰ [CREATE COURSE] LocalStorage draft expired, clearing...');
                    localStorage.removeItem(storageKey);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error checking localStorage draft expiration:', error);
          }
          
          await loadDraft();
        }
      } catch (error) {
        // No draft/course found or error loading - that's okay
        console.log('No draft/course found or error loading:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeCourse();
  }, [loadDraft, loadCourseForEdit, searchParams, isInitialized]);

  // Cleanup: Clear edit mode data when edit mode is exited or component unmounts
  useEffect(() => {
    const currentEditCourseId = searchParams.get('edit');
    
    // If we were in edit mode but now we're not (edit param removed)
    if (previousEditCourseId && !currentEditCourseId) {
      console.log('🧹 [CREATE COURSE] Edit mode exited, clearing edit data');
      clearEditModeData();
      setPreviousEditCourseId(null);
    }
    
    // Cleanup on unmount: if component unmounts while in edit mode, clear the data
    return () => {
      const state = useCourseStore.getState();
      if (state.isEditMode && !state.isPublished) {
        console.log('🧹 [CREATE COURSE] Component unmounting in edit mode, clearing edit data');
        clearEditModeData();
      }
    };
  }, [searchParams, previousEditCourseId, clearEditModeData]);

  // Cleanup: Clear edit mode data when page is closed/refreshed
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = useCourseStore.getState();
      if (state.isEditMode && !state.isPublished) {
        console.log('🧹 [CREATE COURSE] Page closing in edit mode, clearing edit data');
        clearEditModeData();
      }
    };

    // Add beforeunload listener
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    // Cleanup listener on unmount
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [clearEditModeData]);

  // Enable auto-save
  useAutoSave({ enabled: true, interval: 30000 }); // Auto-save every 30 seconds

  // Disable real-time validation - validation will only trigger on button click
  // useRealTimeValidation({ enabled: false, debounceMs: 500 });

  // Show error toast when API error occurs
  useEffect(() => {
    if (apiError) {
      // Safely extract error message
      let errorMessage = 'An error occurred';
      if (typeof apiError === 'string') {
        errorMessage = apiError;
      } else if (apiError && typeof apiError === 'object') {
        errorMessage = apiError?.message || String(apiError || 'An error occurred');
      } else {
        errorMessage = String(apiError || 'An error occurred');
      }
      showError(errorMessage);
    }
  }, [apiError, showError]);

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <HeroPrimary 
        path={currentIsEditMode ? "Edit Course" : "Create Course"} 
        title={currentIsEditMode ? "Edit Course" : "Create Course"} 
      />
      {/* Edit Mode Indicator */}
      {currentIsEditMode && (
        <div className="container pt-5 pb-5">
          <div className="max-w-4xl mx-auto">
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-4 rounded-md">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    Edit Mode
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    You are editing an existing course. Changes will be saved when you publish.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ValidationSummaryWrapper />
      {loadingDraft ? (
        <div className="container pt-100px pb-100px">
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <svg
                className="animate-spin h-8 w-8 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="text-gray-600 dark:text-gray-400">Loading draft...</p>
            </div>
          </div>
        </div>
      ) : (
        <CreateCoursePrimary isVendorMode={isVendorMode} />
      )}
    </>
  );
};

export default CreateCourseMain;
