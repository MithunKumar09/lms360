/**
 * Course Preview Modal
 * 
 * Professional Figma-style preview modal for course creation.
 * Shows all course details in a beautiful, responsive layout.
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useCourseStore } from '@/store/index.js';
import Image from 'next/image';
import { useCategories } from '@/hooks/api/useCourseSettings.js';
import { useSubcategories } from '@/hooks/api/useCourseSettings.js';
import { useCourseTypes } from '@/hooks/api/useCourseSettings.js';
import { useProgramTypes } from '@/hooks/api/useCourseSettings.js';
import { useCourseLevels } from '@/hooks/api/useCourseSettings.js';
import { useCourseSkills } from '@/hooks/api/useCourseSettings.js';
import { useInstructors } from '@/hooks/api/useCourseFormData.js';
import { useClasses } from '@/hooks/api/useCourseFormData.js';
import { useSubjects } from '@/hooks/api/useCourseFormData.js';
import { useOrganizations } from '@/hooks/api/useCourseFormData.js';
import { useAuthStore } from '@/store/index.js';

const CoursePreviewModal = ({ isOpen, onClose }) => {
  const { courseData, loadingPreview } = useCourseStore();
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const userOrgId = user?.orgId;

  // Fetch all related data to map IDs to names
  const { data: categoriesData } = useCategories({ status: 1 });
  const { data: subcategoriesData } = useSubcategories({ 
    categoryId: courseData.categoryId,
    status: 1 
  });
  const { data: courseTypesData } = useCourseTypes({ status: 1 });
  const { data: programTypesData } = useProgramTypes({ status: 1 });
  const { data: courseLevelsData } = useCourseLevels({ status: 1 });
  const { data: courseSkillsData } = useCourseSkills({ status: 1 });
  const { data: instructorsData } = useInstructors({ 
    role: 'instructor',
    ...(userRole === 'admin' && userOrgId ? { orgId: userOrgId } : {}),
  });
  const { data: classesData } = useClasses({ 
    status: 'published',
    ...(userRole === 'admin' && userOrgId ? { orgId: userOrgId } : {}),
    ...(userRole === 'superadmin' && courseData.organizationId ? { orgId: courseData.organizationId } : {}),
  }, {
    enabled: isOpen && (userRole === 'admin' || courseData.organizationId !== null),
  });
  const { data: subjectsData } = useSubjects({ 
    status: 'active',
    classIds: courseData.classIds || [],
    ...(userRole === 'admin' && userOrgId ? { orgId: userOrgId } : {}),
    ...(userRole === 'superadmin' && courseData.organizationId ? { orgId: courseData.organizationId } : {}),
  }, {
    enabled: isOpen && (courseData.classIds?.length > 0) && (userRole === 'admin' || courseData.organizationId !== null),
  });
  const { data: organizationsData } = useOrganizations({ status: 'active' }, {
    enabled: isOpen && userRole === 'superadmin',
  });

  // Create lookup maps for IDs to names
  const categoryName = useMemo(() => {
    if (!courseData.categoryId || !categoriesData?.categories) return null;
    const category = categoriesData.categories.find(cat => cat.id === courseData.categoryId);
    return category?.name || null;
  }, [courseData.categoryId, categoriesData]);

  const subcategoryName = useMemo(() => {
    if (!courseData.subcategoryId || !subcategoriesData?.subcategories) return null;
    const subcategory = subcategoriesData.subcategories.find(sub => sub.id === courseData.subcategoryId);
    return subcategory?.name || null;
  }, [courseData.subcategoryId, subcategoriesData]);

  const courseTypeName = useMemo(() => {
    if (!courseData.courseTypeId || !courseTypesData?.types) return null;
    const courseType = courseTypesData.types.find(type => type.id === courseData.courseTypeId);
    return courseType?.name || null;
  }, [courseData.courseTypeId, courseTypesData]);

  const programTypeName = useMemo(() => {
    if (!courseData.programTypeId || !programTypesData?.programTypes) return null;
    const programType = programTypesData.programTypes.find(type => type.id === courseData.programTypeId);
    return programType?.name || null;
  }, [courseData.programTypeId, programTypesData]);

  const courseLevelName = useMemo(() => {
    if (!courseData.courseLevelId || !courseLevelsData?.levels) return null;
    const courseLevel = courseLevelsData.levels.find(level => level.id === courseData.courseLevelId);
    return courseLevel?.name || null;
  }, [courseData.courseLevelId, courseLevelsData]);

  const courseSkillsNames = useMemo(() => {
    if (!courseData.courseSkills?.length || !courseSkillsData?.skills) return [];
    return courseData.courseSkills
      .map(skillId => {
        const skill = courseSkillsData.skills.find(s => s.id === skillId);
        return skill?.name;
      })
      .filter(Boolean);
  }, [courseData.courseSkills, courseSkillsData]);

  const instructorNames = useMemo(() => {
    if (!courseData.instructorIds?.length || !instructorsData?.instructors) return [];
    return courseData.instructorIds
      .map(instructorId => {
        const instructor = instructorsData.instructors.find(i => i.id === instructorId);
        return instructor?.name || instructor?.email;
      })
      .filter(Boolean);
  }, [courseData.instructorIds, instructorsData]);

  const classNames = useMemo(() => {
    if (!courseData.classIds?.length || !classesData?.classes) return [];
    return courseData.classIds
      .map(classId => {
        const classItem = classesData.classes.find(c => c.id === classId);
        // Use code, program_node_title, or fallback
        return classItem?.code || classItem?.program_node_title || classItem?.program_node_code || null;
      })
      .filter(Boolean);
  }, [courseData.classIds, classesData]);

  const subjectNames = useMemo(() => {
    if (!courseData.subjectIds?.length || !subjectsData?.subjects) return [];
    return courseData.subjectIds
      .map(subjectId => {
        const subject = subjectsData.subjects.find(s => s.id === subjectId);
        // Use title, code, or fallback
        return subject?.title || subject?.code || null;
      })
      .filter(Boolean);
  }, [courseData.subjectIds, subjectsData]);

  const organizationName = useMemo(() => {
    if (!courseData.organizationId || !organizationsData?.organizations) return null;
    const organization = organizationsData.organizations.find(org => org.id === courseData.organizationId);
    return organization?.name || null;
  }, [courseData.organizationId, organizationsData]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style jsx global>{`
        .rich-text-content {
          line-height: 1.6;
        }
        .rich-text-content p {
          margin-bottom: 1rem;
          color: inherit;
        }
        .rich-text-content h1,
        .rich-text-content h2,
        .rich-text-content h3,
        .rich-text-content h4,
        .rich-text-content h5,
        .rich-text-content h6 {
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          color: inherit;
        }
        .rich-text-content h1 {
          font-size: 1.875rem;
        }
        .rich-text-content h2 {
          font-size: 1.5rem;
        }
        .rich-text-content h3 {
          font-size: 1.25rem;
        }
        .rich-text-content h4 {
          font-size: 1.125rem;
        }
        .rich-text-content h5,
        .rich-text-content h6 {
          font-size: 1rem;
        }
        .rich-text-content ul,
        .rich-text-content ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .rich-text-content ul {
          list-style-type: disc;
        }
        .rich-text-content ol {
          list-style-type: decimal;
        }
        .rich-text-content li {
          margin-bottom: 0.5rem;
        }
        .rich-text-content a {
          color: #2563eb;
          text-decoration: underline;
        }
        .dark .rich-text-content a {
          color: #60a5fa;
        }
        .rich-text-content a:hover {
          color: #1d4ed8;
        }
        .dark .rich-text-content a:hover {
          color: #93c5fd;
        }
        .rich-text-content strong,
        .rich-text-content b {
          font-weight: 600;
          color: inherit;
        }
        .rich-text-content em,
        .rich-text-content i {
          font-style: italic;
        }
        .rich-text-content u {
          text-decoration: underline;
        }
        .rich-text-content blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #6b7280;
        }
        .dark .rich-text-content blockquote {
          border-left-color: #4b5563;
          color: #9ca3af;
        }
        .rich-text-content code {
          background-color: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875em;
        }
        .dark .rich-text-content code {
          background-color: #374151;
        }
        .rich-text-content pre {
          background-color: #f3f4f6;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .dark .rich-text-content pre {
          background-color: #374151;
        }
        .rich-text-content pre code {
          background-color: transparent;
          padding: 0;
        }
        .rich-text-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .rich-text-content hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 1.5rem 0;
        }
        .dark .rich-text-content hr {
          border-top-color: #4b5563;
        }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
      >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <div>
              <h2
                id="preview-title"
                className="text-xl font-bold text-gray-900 dark:text-gray-100"
              >
                Course Preview
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Review your course before publishing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Print Preview"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close preview"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingPreview ? (
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
                <p className="text-gray-600 dark:text-gray-400">
                  Loading preview...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Course Title & Basic Info */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {courseData.title || 'Untitled Course'}
                  </h1>
                  {courseData.slug && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      /{courseData.slug}
                    </p>
                  )}
                </div>

                {/* Pricing */}
                {(courseData.regularPrice > 0 ||
                  courseData.discountedPrice > 0) && (
                  <div className="flex items-center gap-4">
                    {courseData.discountedPrice > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          ${courseData.discountedPrice}
                        </span>
                        {courseData.regularPrice >
                          courseData.discountedPrice && (
                          <span className="text-lg text-gray-500 dark:text-gray-400 line-through">
                            ${courseData.regularPrice}
                          </span>
                        )}
                      </div>
                    )}
                    {courseData.regularPrice > 0 &&
                      courseData.discountedPrice === 0 && (
                        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          ${courseData.regularPrice}
                        </span>
                      )}
                  </div>
                )}

                {/* About Course */}
                {courseData.aboutCourse && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      About This Course
                    </h3>
                    <div 
                      className="rich-text-content text-gray-700 dark:text-gray-300"
                      dangerouslySetInnerHTML={{ __html: courseData.aboutCourse }}
                    />
                  </div>
                )}

                {/* Course Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {categoryName && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Category
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {categoryName}
                      </p>
                    </div>
                  )}
                  {subcategoryName && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Subcategory
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {subcategoryName}
                      </p>
                    </div>
                  )}
                  {courseTypeName && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Course Type
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {courseTypeName}
                      </p>
                    </div>
                  )}
                  {programTypeName && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Program Type
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {programTypeName}
                      </p>
                    </div>
                  )}
                  {courseLevelName && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Level
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {courseLevelName}
                      </p>
                    </div>
                  )}
                  {courseData.language && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Language
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {courseData.language}
                      </p>
                    </div>
                  )}
                  {courseData.startDate && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Start Date
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {new Date(courseData.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {organizationName && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Organization
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {organizationName}
                      </p>
                    </div>
                  )}
                </div>

                {/* Additional Details */}
                {(courseSkillsNames.length > 0 || instructorNames.length > 0 || classNames.length > 0 || subjectNames.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {courseSkillsNames.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Skills
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {courseSkillsNames.join(', ')}
                        </p>
                      </div>
                    )}
                    {instructorNames.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Instructors
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {instructorNames.join(', ')}
                        </p>
                      </div>
                    )}
                    {classNames.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Classes
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {classNames.join(', ')}
                        </p>
                      </div>
                    )}
                    {subjectNames.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Subjects
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {subjectNames.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Course Structure */}
              {courseData.modules && courseData.modules.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Course Curriculum
                  </h3>
                  <div className="space-y-3">
                    {courseData.modules.map((module, moduleIndex) => (
                      <div
                        key={module.id || moduleIndex}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900"
                      >
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          Module {moduleIndex + 1}: {module.title || 'Untitled Module'}
                        </h4>
                        {module.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {module.description}
                          </p>
                        )}
                        {module.chapters && module.chapters.length > 0 && (
                          <div className="space-y-2 ml-4">
                            {module.chapters.map((chapter, chapterIndex) => (
                              <div
                                key={chapter.id || chapterIndex}
                                className="border-l-2 border-blue-300 dark:border-blue-700 pl-3"
                              >
                                <h5 className="font-medium text-gray-800 dark:text-gray-200">
                                  Chapter {chapterIndex + 1}:{' '}
                                  {chapter.title || 'Untitled Chapter'}
                                </h5>
                                {chapter.lessons && chapter.lessons.length > 0 && (
                                  <ul className="mt-2 space-y-1 ml-4">
                                    {chapter.lessons.map((lesson, lessonIndex) => (
                                      <li
                                        key={lesson.id || lessonIndex}
                                        className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2"
                                      >
                                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                        {lesson.title || 'Untitled Lesson'} (
                                        {lesson.type || 'video'})
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {courseData.requirements &&
                courseData.requirements.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Requirements
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                      {courseData.requirements.map((req, index) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Description */}
              {courseData.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Description
                  </h3>
                  <div 
                    className="rich-text-content text-gray-700 dark:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: courseData.description }}
                  />
                </div>
              )}

              {/* Tags */}
              {courseData.tags && courseData.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {courseData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default CoursePreviewModal;

