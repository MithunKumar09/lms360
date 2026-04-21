/**
 * Course Store
 * 
 * Manages course creation state, draft management, and course form data.
 * Uses Zustand for state management with localStorage persistence for drafts.
 * 
 * @typedef {Object} Module
 * @property {string} id - Module ID
 * @property {string} title - Module title
 * @property {string} description - Module description
 * @property {number} order - Module order
 * @property {Chapter[]} chapters - Chapters in module
 * 
 * @typedef {Object} Chapter
 * @property {string} id - Chapter ID
 * @property {string} moduleId - Parent module ID
 * @property {string} title - Chapter title
 * @property {string} description - Chapter description
 * @property {number} order - Chapter order
 * @property {Lesson[]} lessons - Lessons in chapter
 * 
 * @typedef {Object} Lesson
 * @property {string} id - Lesson ID
 * @property {string} chapterId - Parent chapter ID
 * @property {string} type - Lesson type (video, text, quiz, assignment, material)
 * @property {string} title - Lesson title
 * @property {string} description - Lesson description
 * @property {string} videoUrl - Video URL (for video lessons)
 * @property {string} content - Text content (for text lessons)
 * @property {number} duration - Lesson duration in minutes
 * @property {number} order - Lesson order
 * @property {string} transcript - Transcript text (for video lessons)
 * 
 * @typedef {Object} CourseData
 * @property {string} title - Course title
 * @property {string} slug - Course slug
 * @property {number} regularPrice - Regular price
 * @property {number} discountedPrice - Discounted price
 * @property {string} aboutCourse - About course description
 * @property {string|null} categoryId - Category ID
 * @property {string|null} subcategoryId - Subcategory ID
 * @property {string|null} courseTypeId - Course type ID
 * @property {string|null} programTypeId - Program type ID
 * @property {string|null} courseLevelId - Course level ID
 * @property {string[]} courseSkills - Course skills IDs
 * @property {string[]} instructorIds - Instructor IDs
 * @property {string[]} classIds - Class IDs
 * @property {string[]} subjectIds - Subject IDs
 * @property {string|null} organizationId - Organization ID (null for admin, selectable for superadmin)
 * @property {string} introVideoUrl - Intro video URL
 * @property {string} coverImageUrl - Course cover image URL
 * @property {Module[]} modules - Course modules
 * @property {Date|null} startDate - Course start date
 * @property {string} language - Course language
 * @property {string[]} requirements - Course requirements
 * @property {string} description - Course description
 * @property {string[]} tags - Course tags
 * @property {string|null} certificateTemplateId - Certificate template ID
 * @property {string} certificateMode - Certificate mode ('prebuilt' | 'upload')
 * @property {string} certificateUploadUrl - Uploaded certificate URL
 * 
 * @typedef {Object} CourseState
 * @property {CourseData} courseData - Course form data
 * @property {string} currentSection - Current form section
 * @property {boolean} isDraft - Whether course is a draft
 * @property {boolean} isPublished - Whether course is published
 * @property {Date|null} lastSaved - Last save timestamp
 * @property {string|null} draftId - Draft ID
 * @property {boolean} savingDraft - Whether draft is being saved
 * @property {boolean} publishing - Whether course is being published
 * @property {boolean} loadingPreview - Whether preview is loading
 * @property {boolean} loadingDraft - Whether draft is loading
 * @property {boolean} isEditMode - Whether in edit mode
 * @property {string|null} editingCourseId - Course ID being edited
 * @property {Object} errors - Field errors
 * @property {Object} validationErrors - Validation errors
 * @property {Error|null} apiError - API error
 * 
 * @typedef {Object} CourseActions
 * @property {Function} updateField - Update a field
 * @property {Function} updateNestedField - Update nested field
 * @property {Function} addModule - Add module
 * @property {Function} updateModule - Update module
 * @property {Function} deleteModule - Delete module
 * @property {Function} addChapter - Add chapter
 * @property {Function} updateChapter - Update chapter
 * @property {Function} deleteChapter - Delete chapter
 * @property {Function} addLesson - Add lesson
 * @property {Function} updateLesson - Update lesson
 * @property {Function} deleteLesson - Delete lesson
 * @property {Function} reorderModules - Reorder modules
 * @property {Function} reorderChapters - Reorder chapters
 * @property {Function} reorderLessons - Reorder lessons
 * @property {Function} saveDraft - Save draft
 * @property {Function} loadDraft - Load draft
 * @property {Function} publish - Publish course
 * @property {Function} reset - Reset form
 * @property {Function} validate - Validate form
 * @property {Function} setError - Set field error
 * @property {Function} clearError - Clear field error
 * @property {Function} clearAllErrors - Clear all errors
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { validateCourseData } from '@/lib/course/validation.js';
import { validateAllCrossFields } from '@/lib/course/crossFieldValidation.js';

/**
 * Generate unique ID
 */
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

/**
 * Initial course data
 */
const initialCourseData = {
  // Basic Info
  title: '',
  slug: '',
  regularPrice: 0,
  discountedPrice: 0,
  aboutCourse: '',
  
  // Selections
  categoryId: null,
  subcategoryId: null,
  courseTypeId: null,
  programTypeId: null,
  courseLevelId: null,
  courseSkills: [],
  instructorIds: [],
  classIds: [],
  subjectIds: [],
  organizationId: null,
  
  // Video
  introVideoUrl: '',
  coverImageUrl: '',
  
  // Structure
  modules: [],
  
  // Additional Info
  startDate: null,
  language: 'English',
  requirements: [],
  description: '',
  tags: [],
  
  // Certificate
  certificateTemplateId: null,
  certificateMode: 'prebuilt', // 'prebuilt' | 'upload'
  certificateUploadUrl: '', // For uploaded certificates
};

/**
 * Helper function to safely convert error to string
 */
const errorToString = (error) => {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    if (error.message) return error.message;
    if (error.toString && typeof error.toString === 'function') {
      return error.toString();
    }
  }
  return String(error);
};

/**
 * Helper function to sanitize errors object
 */
const sanitizeErrors = (errors) => {
  if (!errors || typeof errors !== 'object') return {};
  const sanitized = {};
  for (const [key, value] of Object.entries(errors)) {
    if (value) {
      sanitized[key] = errorToString(value);
    }
  }
  return sanitized;
};

/**
 * Course Store
 */
const useCourseStore = create(
  persist(
    (set, get) => {
      // One-time cleanup on initialization to sanitize any existing errors
      const cleanupErrorsOnce = () => {
        const state = get();
        let needsUpdate = false;
        const updates = {};
        
        // Sanitize errors
        if (state.errors && typeof state.errors === 'object') {
          const sanitized = sanitizeErrors(state.errors);
          if (JSON.stringify(sanitized) !== JSON.stringify(state.errors)) {
            updates.errors = sanitized;
            needsUpdate = true;
          }
        }
        
        // Sanitize validationErrors
        if (state.validationErrors && typeof state.validationErrors === 'object') {
          const sanitized = sanitizeErrors(state.validationErrors);
          if (JSON.stringify(sanitized) !== JSON.stringify(state.validationErrors)) {
            updates.validationErrors = sanitized;
            needsUpdate = true;
          }
        }
        
        // Sanitize apiError
        if (state.apiError && typeof state.apiError === 'object') {
          const errorMessage = errorToString(state.apiError);
          updates.apiError = errorMessage;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          set(updates);
        }
      };
      
      // Run cleanup once after store is initialized
      setTimeout(cleanupErrorsOnce, 0);

      return {
        // Initial State
        courseData: { ...initialCourseData },
        currentSection: 'info',
        isDraft: false,
        isPublished: false,
        lastSaved: null,
        draftId: null,
        
        // Loading States
        savingDraft: false,
        publishing: false,
        loadingPreview: false,
        loadingDraft: false,
        
        // Edit Mode
        isEditMode: false,
        editingCourseId: null,
        
        // Error States
        errors: {},
        validationErrors: {},
        apiError: null,
        validationAttempted: false, // Track if validation has been attempted

        // Actions

      /**
       * Set loading preview state
       * @param {boolean} loading - Loading state
       */
      setLoadingPreview: (loading) => {
        set({ loadingPreview: loading });
      },

      /**
       * Update a field in courseData
       * @param {string} field - Field name
       * @param {*} value - Field value
       */
      updateField: (field, value) => {
        set((state) => ({
          courseData: {
            ...state.courseData,
            [field]: value,
          },
          isDraft: true,
          // Clear error for this field when updated
          errors: {
            ...state.errors,
            [field]: undefined,
          },
        }));
      },

      /**
       * Update nested field (e.g., modules[0].title)
       * @param {string} path - Path to field (e.g., 'modules.0.title')
       * @param {*} value - New value
       */
      updateNestedField: (path, value) => {
        set((state) => {
          const keys = path.split('.');
          const newCourseData = { ...state.courseData };
          let current = newCourseData;

          // Navigate to the parent object
          for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            const arrayIndex = parseInt(key);
            
            if (!isNaN(arrayIndex)) {
              // It's an array index
              current = current[arrayIndex];
            } else {
              // It's an object key
              current = current[key];
            }
          }

          // Set the value
          const lastKey = keys[keys.length - 1];
          const lastArrayIndex = parseInt(lastKey);
          
          if (!isNaN(lastArrayIndex)) {
            current[lastArrayIndex] = value;
          } else {
            current[lastKey] = value;
          }

          return {
            courseData: newCourseData,
            isDraft: true,
          };
        });
      },

      /**
       * Add a new module
       * @returns {string} New module ID
       */
      addModule: () => {
        const moduleId = generateId();
        const newModule = {
          id: moduleId,
          title: '',
          description: '',
          order: get().courseData.modules.length,
          chapters: [],
        };

        set((state) => ({
          courseData: {
            ...state.courseData,
            modules: [...state.courseData.modules, newModule],
          },
          isDraft: true,
        }));

        return moduleId;
      },

      /**
       * Update a module
       * @param {string} moduleId - Module ID
       * @param {Partial<Module>} data - Module data to update
       */
      updateModule: (moduleId, data) => {
        set((state) => ({
          courseData: {
            ...state.courseData,
            modules: state.courseData.modules.map((module) =>
              module.id === moduleId ? { ...module, ...data } : module
            ),
          },
          isDraft: true,
        }));
      },

      /**
       * Delete a module
       * @param {string} moduleId - Module ID
       */
      deleteModule: (moduleId) => {
        set((state) => ({
          courseData: {
            ...state.courseData,
            modules: state.courseData.modules
              .filter((module) => module.id !== moduleId)
              .map((module, index) => ({ ...module, order: index })),
          },
          isDraft: true,
        }));
      },

      /**
       * Add a chapter to a module
       * @param {string} moduleId - Module ID
       * @returns {string} New chapter ID
       */
      addChapter: (moduleId) => {
        const chapterId = generateId();
        const foundModule = get().courseData.modules.find((m) => m.id === moduleId);
        
        if (!foundModule) {
          console.error(`Module ${moduleId} not found`);
          return null;
        }

        const newChapter = {
          id: chapterId,
          moduleId,
          title: '',
          description: '',
          order: foundModule.chapters.length,
          lessons: [],
        };

        set((state) => ({
          courseData: {
            ...state.courseData,
            modules: state.courseData.modules.map((m) =>
              m.id === moduleId
                ? { ...m, chapters: [...m.chapters, newChapter] }
                : m
            ),
          },
          isDraft: true,
        }));

        return chapterId;
      },

      /**
       * Update a chapter
       * @param {string} moduleId - Module ID
       * @param {string} chapterId - Chapter ID
       * @param {Partial<Chapter>} data - Chapter data to update
       */
      updateChapter: (moduleId, chapterId, data) => {
        set((state) => ({
          courseData: {
            ...state.courseData,
            modules: state.courseData.modules.map((module) =>
              module.id === moduleId
                ? {
                    ...module,
                    chapters: module.chapters.map((chapter) =>
                      chapter.id === chapterId
                        ? { ...chapter, ...data }
                        : chapter
                    ),
                  }
                : module
            ),
          },
          isDraft: true,
        }));
      },

      /**
       * Delete a chapter
       * @param {string} moduleId - Module ID
       * @param {string} chapterId - Chapter ID
       */
      deleteChapter: (moduleId, chapterId) => {
        set((state) => ({
          courseData: {
            ...state.courseData,
            modules: state.courseData.modules.map((module) =>
              module.id === moduleId
                ? {
                    ...module,
                    chapters: module.chapters
                      .filter((chapter) => chapter.id !== chapterId)
                      .map((chapter, index) => ({ ...chapter, order: index })),
                  }
                : module
            ),
          },
          isDraft: true,
        }));
      },

      /**
       * Add a lesson to a chapter
       * @param {string} moduleId - Module ID
       * @param {string} chapterId - Chapter ID
       * @param {string} type - Lesson type
       * @returns {string} New lesson ID
       */
      addLesson: (moduleId, chapterId, type = 'video') => {
        const lessonId = generateId();
        const foundModule = get().courseData.modules.find((m) => m.id === moduleId);
        const foundChapter = foundModule?.chapters.find((c) => c.id === chapterId);

        if (!foundModule || !foundChapter) {
          console.error(`Module ${moduleId} or Chapter ${chapterId} not found`);
          return null;
        }

        const newLesson = {
          id: lessonId,
          chapterId,
          type,
          title: '',
          description: '',
          videoUrl: '',
          content: '',
          duration: 0,
          order: foundChapter.lessons.length,
          transcript: '',
        };

        set((state) => ({
          courseData: {
            ...state.courseData,
            modules: state.courseData.modules.map((m) =>
              m.id === moduleId
                ? {
                    ...m,
                    chapters: m.chapters.map((c) =>
                      c.id === chapterId
                        ? { ...c, lessons: [...c.lessons, newLesson] }
                        : c
                    ),
                  }
                : m
            ),
          },
          isDraft: true,
        }));

        return lessonId;
      },

      /**
       * Update a lesson
       * @param {string} moduleId - Module ID
       * @param {string} chapterId - Chapter ID
       * @param {string} lessonId - Lesson ID
       * @param {Partial<Lesson>} data - Lesson data to update
       */
      updateLesson: (moduleId, chapterId, lessonId, data) => {
        set((state) => ({
          courseData: {
            ...state.courseData,
            modules: state.courseData.modules.map((module) =>
              module.id === moduleId
                ? {
                    ...module,
                    chapters: module.chapters.map((chapter) =>
                      chapter.id === chapterId
                        ? {
                            ...chapter,
                            lessons: chapter.lessons.map((lesson) =>
                              lesson.id === lessonId
                                ? { ...lesson, ...data }
                                : lesson
                            ),
                          }
                        : chapter
                    ),
                  }
                : module
            ),
          },
          isDraft: true,
        }));
      },

      /**
       * Delete a lesson
       * @param {string} moduleId - Module ID
       * @param {string} chapterId - Chapter ID
       * @param {string} lessonId - Lesson ID
       */
      deleteLesson: (moduleId, chapterId, lessonId) => {
        set((state) => ({
          courseData: {
            ...state.courseData,
            modules: state.courseData.modules.map((module) =>
              module.id === moduleId
                ? {
                    ...module,
                    chapters: module.chapters.map((chapter) =>
                      chapter.id === chapterId
                        ? {
                            ...chapter,
                            lessons: chapter.lessons
                              .filter((lesson) => lesson.id !== lessonId)
                              .map((lesson, index) => ({
                                ...lesson,
                                order: index,
                              })),
                          }
                        : chapter
                    ),
                  }
                : module
            ),
          },
          isDraft: true,
        }));
      },

      /**
       * Reorder modules
       * @param {string[]} moduleIds - Module IDs in new order
       */
      reorderModules: (moduleIds) => {
        set((state) => {
          const modulesMap = new Map(
            state.courseData.modules.map((m) => [m.id, m])
          );
          const reorderedModules = moduleIds
            .map((id, index) => ({
              ...modulesMap.get(id),
              order: index,
            }))
            .filter(Boolean);

          return {
            courseData: {
              ...state.courseData,
              modules: reorderedModules,
            },
            isDraft: true,
          };
        });
      },

      /**
       * Reorder chapters
       * @param {string} moduleId - Module ID
       * @param {string[]} chapterIds - Chapter IDs in new order
       */
      reorderChapters: (moduleId, chapterIds) => {
        set((state) => ({
          courseData: {
            ...state.courseData,
            modules: state.courseData.modules.map((module) =>
              module.id === moduleId
                ? {
                    ...module,
                    chapters: chapterIds
                      .map((id, index) => {
                        const chapter = module.chapters.find((c) => c.id === id);
                        return chapter ? { ...chapter, order: index } : null;
                      })
                      .filter(Boolean),
                  }
                : module
            ),
          },
          isDraft: true,
        }));
      },

      /**
       * Reorder lessons
       * @param {string} moduleId - Module ID
       * @param {string} chapterId - Chapter ID
       * @param {string[]} lessonIds - Lesson IDs in new order
       */
      reorderLessons: (moduleId, chapterId, lessonIds) => {
        set((state) => ({
          courseData: {
            ...state.courseData,
            modules: state.courseData.modules.map((module) =>
              module.id === moduleId
                ? {
                    ...module,
                    chapters: module.chapters.map((chapter) =>
                      chapter.id === chapterId
                        ? {
                            ...chapter,
                            lessons: lessonIds
                              .map((id, index) => {
                                const lesson = chapter.lessons.find(
                                  (l) => l.id === id
                                );
                                return lesson ? { ...lesson, order: index } : null;
                              })
                              .filter(Boolean),
                          }
                        : chapter
                    ),
                  }
                : module
            ),
          },
          isDraft: true,
        }));
      },

      /**
       * Save draft to API
       */
      saveDraft: async () => {
        const state = get();
        
        // Don't save draft if in edit mode
        if (state.isEditMode) {
          console.log('⚠️ [SAVE DRAFT] Skipping draft save - in edit mode');
          return;
        }
        
        if (state.savingDraft) {
          return; // Prevent multiple simultaneous saves
        }

        set({ savingDraft: true, apiError: null });

        try {
          // Dynamically import apiClient to avoid circular dependencies
          const apiClient = (await import('@/lib/api/client.js')).default;
          const { getEndpoint } = await import('@/lib/api/endpoints.js');

          const response = await apiClient.post(getEndpoint('drafts.create'), {
            id: state.draftId,
            courseData: state.courseData,
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to save draft');
          }

          set({
            savingDraft: false,
            draftId: response.id || state.draftId,
            lastSaved: new Date(),
            isDraft: true,
          });
        } catch (error) {
          console.error('Error saving draft:', error);
          set({
            savingDraft: false,
            apiError: errorToString(error),
          });
          throw error;
        }
      },

      /**
       * Check if draft is expired (older than 8 hours)
       * @param {Date|string} updatedAt - Draft updated timestamp
       * @returns {boolean} True if draft is expired
       */
      isDraftExpired: (updatedAt) => {
        if (!updatedAt) return true;
        
        const draftDate = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
        const now = new Date();
        const hoursDiff = (now - draftDate) / (1000 * 60 * 60); // Convert to hours
        
        // Draft expires after 8 hours
        return hoursDiff >= 8;
      },

      /**
       * Load draft from API
       * @param {string} draftId - Draft ID (optional, will load user's latest draft if not provided)
       */
      loadDraft: async (draftId = null) => {
        const state = get();
        
        // Don't load draft if in edit mode
        if (state.isEditMode) {
          console.log('⚠️ [LOAD DRAFT] Skipping draft load - in edit mode');
          return null;
        }
        
        if (state.loadingDraft) {
          return;
        }

        set({ loadingDraft: true, apiError: null });

        try {
          // Dynamically import apiClient to avoid circular dependencies
          const apiClient = (await import('@/lib/api/client.js')).default;
          const { getEndpoint } = await import('@/lib/api/endpoints.js');

          let response;
          if (draftId) {
            response = await apiClient.get(
              getEndpoint('drafts.get', { id: draftId })
            );
          } else {
            response = await apiClient.get(
              `${getEndpoint('drafts.list')}?latest=true`
            );
            if (response.draft) {
              response = { ...response, courseData: response.draft.courseData, id: response.draft.id, updatedAt: response.draft.updatedAt };
            }
          }

          if (!response.success) {
            if (response.status === 404) {
              // No draft found, that's okay
              set({ loadingDraft: false });
              return null;
            }
            throw new Error(response.error || 'Failed to load draft');
          }

          // Check if draft is expired (8 hours)
          const updatedAt = response.updatedAt || response.draft?.updatedAt;
          if (updatedAt && get().isDraftExpired(updatedAt)) {
            console.log('⏰ [LOAD DRAFT] Draft expired (older than 8 hours), clearing...');
            
            // Delete expired draft from API
            try {
              const { buildEndpoint } = await import('@/lib/api/endpoints.js');
              const draftIdToDelete = response.id || response.draft?.id;
              if (draftIdToDelete) {
                const deleteEndpoint = getEndpoint('drafts.delete');
                const deleteUrl = buildEndpoint(deleteEndpoint, { id: draftIdToDelete });
                await apiClient.delete(deleteUrl);
                console.log('🗑️ [LOAD DRAFT] Expired draft deleted from API');
              }
            } catch (deleteError) {
              console.error('❌ [LOAD DRAFT] Error deleting expired draft:', deleteError);
            }
            
            // Clear from localStorage
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                const storageKey = 'course-draft-storage';
                localStorage.removeItem(storageKey);
                console.log('🗑️ [LOAD DRAFT] Expired draft cleared from localStorage');
              }
            } catch (clearError) {
              console.error('❌ [LOAD DRAFT] Error clearing expired draft from localStorage:', clearError);
            }
            
            // Reset to initial state
            set({
              loadingDraft: false,
              courseData: { ...initialCourseData },
              draftId: null,
              lastSaved: null,
              isDraft: false,
            });
            
            return null;
          }

          set({
            loadingDraft: false,
            courseData: response.courseData || initialCourseData,
            draftId: response.id || null,
            lastSaved: response.updatedAt ? new Date(response.updatedAt) : null,
            isDraft: true,
          });

          return response;
        } catch (error) {
          console.error('Error loading draft:', error);
          set({
            loadingDraft: false,
            apiError: errorToString(error),
          });
          throw error;
        }
      },

      /**
       * Load course for edit mode
       * @param {string} courseId - Course ID to load
       */
      loadCourseForEdit: async (courseId) => {
        const state = get();
        
        if (state.loadingDraft) {
          return;
        }

        set({ loadingDraft: true, apiError: null });

        try {
          // Dynamically import apiClient and transformers
          const apiClient = (await import('@/lib/api/client.js')).default;
          const { getEndpoint, buildEndpoint } = await import('@/lib/api/endpoints.js');
          const { transformAPIResponseToCourseData } = await import('@/lib/course/transformers.js');

          // Fetch course from API
          const response = await apiClient.get(
            buildEndpoint(getEndpoint('courses.get'), { id: courseId })
          );

          if (!response.success) {
            throw new Error(response.error || 'Failed to load course');
          }

          const course = response.course;
          console.log('📥 [LOAD COURSE FOR EDIT] Raw course data from API:', course);

          // Transform API response to form structure
          const transformedCourseData = transformAPIResponseToCourseData(course);
          console.log('🔄 [LOAD COURSE FOR EDIT] Transformed course data:', transformedCourseData);

          set({
            loadingDraft: false,
            courseData: transformedCourseData,
            isEditMode: true,
            editingCourseId: courseId,
            isDraft: false,
            isPublished: false,
            draftId: null,
            lastSaved: course.updatedAt ? new Date(course.updatedAt) : null,
            // Clear any draft-related state when entering edit mode
            savingDraft: false,
          });
          
          console.log('✅ [LOAD COURSE FOR EDIT] Course data loaded into store');

          return response;
        } catch (error) {
          console.error('Error loading course for edit:', error);
          set({
            loadingDraft: false,
            apiError: errorToString(error),
          });
          throw error;
        }
      },

      /**
       * Check if slug exists
       * @param {string} slug - Slug to check
       * @param {string|null} excludeCourseId - Course ID to exclude from check (for edit mode)
       */
      checkSlugExists: async (slug, excludeCourseId = null) => {
        if (!slug || slug.trim() === '') {
          return { exists: false };
        }

        try {
          let url = `/api/courses/check-slug?slug=${encodeURIComponent(slug.trim())}`;
          if (excludeCourseId) {
            url += `&excludeCourseId=${encodeURIComponent(excludeCourseId)}`;
          }
          
          const response = await fetch(url);
          const data = await response.json();
          return {
            exists: !data.available,
            existingCourse: data.existingCourse || null,
            message: data.message || '',
          };
        } catch (error) {
          console.error('Error checking slug:', error);
          return { exists: false }; // Default to not exists on error
        }
      },

      /**
       * Publish course
       */
      publish: async () => {
        const state = get();
        
        if (state.publishing) {
          return;
        }

        // Validate before publishing
        const validation = get().validate();
        if (!validation.isValid) {
          set({
            validationErrors: validation.errors,
          });
          throw new Error('Please fix validation errors before publishing');
        }

        set({ publishing: true, apiError: null });

        try {
          // Prepare course data for API
          const { transformCourseDataForAPI } = await import('@/lib/course/transformers.js');
          const courseDataForAPI = transformCourseDataForAPI(state.courseData);

          // Determine if we're in edit mode
          const isEdit = state.isEditMode && state.editingCourseId;
          const url = isEdit 
            ? `/api/courses/${state.editingCourseId}`
            : '/api/courses';
          const method = isEdit ? 'PUT' : 'POST';

          console.log(`📝 [PUBLISH] ${isEdit ? 'Updating' : 'Creating'} course:`, { url, method, courseId: state.editingCourseId });

          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(courseDataForAPI),
          });

          const responseData = await response.json();

          if (!response.ok) {
            // Handle duplicate slug error - auto-generate new slug and retry once
            if (response.status === 409 && responseData.field === 'slug') {
              console.log('⚠️ [PUBLISH] Duplicate slug detected, generating new unique slug...');
              
              // Generate new unique slug with timestamp
              const { generateSlug } = await import('@/lib/course/transformers.js');
              const baseSlug = generateSlug(state.courseData.title);
              const uniqueSlug = `${baseSlug}-${Date.now()}`;
              
              // Update slug in store
              set({
                courseData: {
                  ...state.courseData,
                  slug: uniqueSlug,
                },
              });
              
              // Retry with new slug
              const retryData = transformCourseDataForAPI({
                ...state.courseData,
                slug: uniqueSlug,
              });
              
              const retryUrl = isEdit 
                ? `/api/courses/${state.editingCourseId}`
                : '/api/courses';
              const retryMethod = isEdit ? 'PUT' : 'POST';
              
              const retryResponse = await fetch(retryUrl, {
                method: retryMethod,
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(retryData),
              });
              
              const retryResponseData = await retryResponse.json();
              
              if (!retryResponse.ok) {
                const errorMessage = retryResponseData.error || 'Failed to publish course';
                throw new Error(errorMessage);
              }
              
              // Success on retry - use retry response data
              const data = retryResponseData;
              
              // If there was a draft, delete it from API
              if (state.draftId) {
                try {
                  const apiClient = (await import('@/lib/api/client.js')).default;
                  const { getEndpoint, buildEndpoint } = await import('@/lib/api/endpoints.js');
                  const endpoint = getEndpoint('drafts.delete');
                  const deleteUrl = buildEndpoint(endpoint, { id: state.draftId });
                  console.log('🗑️ [PUBLISH] Deleting draft (retry):', state.draftId, 'URL:', deleteUrl);
                  const deleteResponse = await apiClient.delete(deleteUrl);
                  if (deleteResponse.success) {
                    console.log('✅ [PUBLISH] Draft deleted successfully from API (retry)');
                  } else {
                    console.error('❌ [PUBLISH] Draft deletion failed (retry):', deleteResponse.error);
                  }
                } catch (error) {
                  console.error('❌ [PUBLISH] Error deleting draft from API (retry):', error);
                }
              }

              // Clear draft from localStorage as well
              try {
                if (typeof window !== 'undefined' && window.localStorage) {
                  const storageKey = 'course-draft-storage';
                  const stored = localStorage.getItem(storageKey);
                  if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.state && parsed.state.draftId) {
                      parsed.state.draftId = null;
                      parsed.state.isDraft = false;
                      parsed.state.isPublished = true;
                      localStorage.setItem(storageKey, JSON.stringify(parsed));
                      console.log('✅ [PUBLISH] Draft cleared from localStorage (retry)');
                    }
                  }
                }
              } catch (error) {
                console.error('❌ [PUBLISH] Error clearing draft from localStorage (retry):', error);
              }

              // Clear form AFTER successful database storage
              // In edit mode, clear edit mode state after successful publish
              set({
                publishing: false,
                isPublished: true,
                isDraft: false,
                draftId: null,
                lastSaved: new Date(),
                courseData: { ...initialCourseData }, // Always clear form data after publish
                isEditMode: false, // Clear edit mode after successful publish
                editingCourseId: null, // Clear editing course ID
                errors: {},
                validationErrors: {},
                validationAttempted: false,
              });
              
              // Clear edit mode from localStorage as well
              try {
                if (typeof window !== 'undefined' && window.localStorage) {
                  const storageKey = 'course-draft-storage';
                  const stored = localStorage.getItem(storageKey);
                  if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.state) {
                      parsed.state.isEditMode = false;
                      parsed.state.editingCourseId = null;
                      parsed.state.courseData = { ...initialCourseData };
                      localStorage.setItem(storageKey, JSON.stringify(parsed));
                      console.log('✅ [PUBLISH] Edit mode cleared from localStorage (retry)');
                    }
                  }
                }
              } catch (error) {
                console.error('❌ [PUBLISH] Error clearing edit mode from localStorage (retry):', error);
              }

              return data;
            }
            
            // Other errors
            const errorMessage = responseData.error || responseData.message || 'Failed to publish course';
            throw new Error(errorMessage);
          }

          const data = responseData;

          // Only proceed if we have a course ID (confirmation of database storage)
          if (!data.id && !data.success) {
            throw new Error('Course was not saved to database. Please try again.');
          }

          // If there was a draft, delete it from API
          if (state.draftId) {
            try {
              const apiClient = (await import('@/lib/api/client.js')).default;
              const { getEndpoint, buildEndpoint } = await import('@/lib/api/endpoints.js');
              const endpoint = getEndpoint('drafts.delete');
              const deleteUrl = buildEndpoint(endpoint, { id: state.draftId });
              console.log('🗑️ [PUBLISH] Deleting draft:', state.draftId, 'URL:', deleteUrl);
              const deleteResponse = await apiClient.delete(deleteUrl);
              if (deleteResponse.success) {
                console.log('✅ [PUBLISH] Draft deleted successfully from API');
              } else {
                console.error('❌ [PUBLISH] Draft deletion failed:', deleteResponse.error);
              }
            } catch (error) {
              console.error('❌ [PUBLISH] Error deleting draft from API:', error);
              // Don't throw, course is already published - but try to clear from localStorage
            }
          }

          // Clear draft from localStorage as well
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              // Clear the persisted state for drafts
              const storageKey = 'course-draft-storage';
              const stored = localStorage.getItem(storageKey);
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.state && parsed.state.draftId) {
                  parsed.state.draftId = null;
                  parsed.state.isDraft = false;
                  parsed.state.isPublished = true;
                  localStorage.setItem(storageKey, JSON.stringify(parsed));
                  console.log('✅ [PUBLISH] Draft cleared from localStorage');
                }
              }
            }
          } catch (error) {
            console.error('❌ [PUBLISH] Error clearing draft from localStorage:', error);
          }

          // Clear form AFTER successful database storage
          // In edit mode, clear edit mode state after successful publish
          set({
            publishing: false,
            isPublished: true,
            isDraft: false,
            draftId: null,
            lastSaved: new Date(),
            courseData: { ...initialCourseData }, // Always clear form data after publish
            isEditMode: false, // Clear edit mode after successful publish
            editingCourseId: null, // Clear editing course ID
            errors: {},
            validationErrors: {},
            validationAttempted: false,
          });
          
          // Clear edit mode from localStorage as well
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              const storageKey = 'course-draft-storage';
              const stored = localStorage.getItem(storageKey);
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.state) {
                  parsed.state.isEditMode = false;
                  parsed.state.editingCourseId = null;
                  parsed.state.courseData = { ...initialCourseData };
                  localStorage.setItem(storageKey, JSON.stringify(parsed));
                  console.log('✅ [PUBLISH] Edit mode cleared from localStorage');
                }
              }
            }
          } catch (error) {
            console.error('❌ [PUBLISH] Error clearing edit mode from localStorage:', error);
          }

          return data;
        } catch (error) {
          console.error('Error publishing course:', error);
          set({
            publishing: false,
            apiError: errorToString(error),
          });
          throw error;
        }
      },

      /**
       * Clear edit mode data (when edit mode is closed without saving)
       * This clears only edit mode data, preserves draft data if in create mode
       */
      clearEditModeData: () => {
        const state = get();
        
        // Only clear if we're in edit mode
        if (state.isEditMode) {
          console.log('🧹 [CLEAR EDIT MODE] Clearing edit mode data');
          
          // Clear edit mode specific data
          set({
            courseData: { ...initialCourseData },
            isEditMode: false,
            editingCourseId: null,
            errors: {},
            validationErrors: {},
            apiError: null,
            validationAttempted: false,
            // Also clear draft-related fields when exiting edit mode
            // Edit mode should not preserve draft state
            isDraft: false,
            draftId: null,
            lastSaved: null,
          });
          
          // Clear from localStorage if persisted
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              const storageKey = 'course-draft-storage';
              const stored = localStorage.getItem(storageKey);
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.state) {
                  // Clear edit mode data and draft-related fields
                  parsed.state.courseData = { ...initialCourseData };
                  parsed.state.isEditMode = false;
                  parsed.state.editingCourseId = null;
                  parsed.state.isDraft = false;
                  parsed.state.draftId = null;
                  parsed.state.lastSaved = null;
                  localStorage.setItem(storageKey, JSON.stringify(parsed));
                  console.log('🧹 [CLEAR EDIT MODE] Cleared from localStorage');
                }
              }
            }
          } catch (error) {
            console.error('❌ [CLEAR EDIT MODE] Error clearing from localStorage:', error);
          }
        }
      },

      /**
       * Reset form to initial state
       */
      reset: async () => {
        const state = get();
        
        // Delete draft if exists
        if (state.draftId) {
          try {
            const apiClient = (await import('@/lib/api/client.js')).default;
            const { getEndpoint, buildEndpoint } = await import('@/lib/api/endpoints.js');
            const endpoint = getEndpoint('drafts.delete');
            const deleteUrl = buildEndpoint(endpoint, { id: state.draftId });
            await apiClient.delete(deleteUrl);
          } catch (error) {
            console.error('Error deleting draft:', error);
          }
        }

        set({
          courseData: { ...initialCourseData },
          currentSection: 'info',
          isDraft: false,
          isPublished: false,
          lastSaved: null,
          draftId: null,
          isEditMode: false,
          editingCourseId: null,
          errors: {},
          validationErrors: {},
          apiError: null,
          validationAttempted: false,
        });
      },

      /**
       * Validate form data
       * @param {boolean} markAsAttempted - Whether to mark validation as attempted (default: true)
       * @returns {Object} Validation result
       */
      validate: (markAsAttempted = true) => {
        const { courseData } = get();
        
        try {
          // Get user context for role-based validation
          let userContext = null;
          if (typeof window !== 'undefined') {
            try {
              // Dynamically import to avoid circular dependencies
              const { useAuthStore } = require('@/store/index.js');
              const user = useAuthStore.getState().user;
              if (user) {
                userContext = {
                  role: user.role,
                  orgId: user.orgId,
                };
              }
            } catch (error) {
              console.warn('Could not get user context for validation:', error);
            }
          }

          // Basic field validation
          const basicValidation = validateCourseData(courseData);
          
          // Cross-field validation with user context
          const crossFieldValidation = validateAllCrossFields(courseData, userContext);

          // Combine all errors and sanitize them
          const errors = {
            ...sanitizeErrors(basicValidation.errors || {}),
            ...sanitizeErrors(crossFieldValidation.errors || {}),
          };

          // Mark validation as attempted if requested
          if (markAsAttempted) {
            set({ validationAttempted: true });
          }

          return {
            isValid: Object.keys(errors).length === 0,
            errors,
          };
        } catch (error) {
          console.error('Error during validation:', error);
          // Fallback to basic validation
          const errors = {};
          if (!courseData.title || courseData.title.trim() === '') {
            errors.title = 'Course title is required';
          }
          
          // Mark validation as attempted if requested
          if (markAsAttempted) {
            set({ validationAttempted: true });
          }
          
          return {
            isValid: Object.keys(errors).length === 0,
            errors,
          };
        }
      },

      /**
       * Set field error
       * @param {string} field - Field name
       * @param {string|Error} error - Error message or Error object
       */
      setError: (field, error) => {
        const errorMessage = errorToString(error);
        if (!errorMessage) return;
        set((state) => ({
          errors: {
            ...state.errors,
            [field]: errorMessage,
          },
        }));
      },

      /**
       * Clear field error
       * @param {string} field - Field name
       */
      clearError: (field) => {
        set((state) => {
          const newErrors = { ...state.errors };
          delete newErrors[field];
          return { errors: newErrors };
        });
      },

      /**
       * Set validation errors
       * @param {Object} errors - Validation errors object
       */
      setValidationErrors: (errors) => {
        const sanitized = sanitizeErrors(errors || {});
        set({ validationErrors: sanitized });
      },

      /**
       * Clear validation error for a specific field
       * @param {string} field - Field name
       */
      clearValidationError: (field) => {
        set((state) => {
          const newValidationErrors = { ...state.validationErrors };
          delete newValidationErrors[field];
          return { validationErrors: newValidationErrors };
        });
      },

      /**
       * Clear all errors
       */
      clearAllErrors: () => {
        set({
          errors: {},
          validationErrors: {},
          apiError: null,
        });
      },

      /**
       * Set current section
       * @param {string} section - Section name
       */
      setCurrentSection: (section) => {
        set({ currentSection: section });
      },
    };
  },
  {
      name: 'course-draft-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        courseData: state.courseData,
        isDraft: state.isDraft,
        draftId: state.draftId,
        lastSaved: state.lastSaved,
      }),
      onRehydrateStorage: () => (state) => {
        // Sanitize any errors that might have been persisted
        if (state) {
          if (state.errors) {
            state.errors = sanitizeErrors(state.errors);
          }
          if (state.validationErrors) {
            state.validationErrors = sanitizeErrors(state.validationErrors);
          }
          if (state.apiError) {
            state.apiError = errorToString(state.apiError);
          }
          
          // Check if draft is expired (8 hours) and clear it
          if (state.isDraft && state.lastSaved && !state.isEditMode) {
            const draftDate = state.lastSaved instanceof Date 
              ? state.lastSaved 
              : new Date(state.lastSaved);
            const now = new Date();
            const hoursDiff = (now - draftDate) / (1000 * 60 * 60);
            
            if (hoursDiff >= 8) {
              console.log('⏰ [REHYDRATE] Draft expired (older than 8 hours), clearing...');
              // Clear expired draft data
              state.courseData = { ...initialCourseData };
              state.draftId = null;
              state.lastSaved = null;
              state.isDraft = false;
              
              // Clear from localStorage
              try {
                if (typeof window !== 'undefined' && window.localStorage) {
                  const storageKey = 'course-draft-storage';
                  localStorage.removeItem(storageKey);
                  console.log('🗑️ [REHYDRATE] Expired draft cleared from localStorage');
                }
              } catch (error) {
                console.error('❌ [REHYDRATE] Error clearing expired draft:', error);
              }
            }
          }
        }
      },
    },
  )
);

export default useCourseStore;

