'use client';

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useCourseStore } from "@/store/index.js";
import { generateSlug } from "@/lib/course/transformers.js";
import ButtonPrimary from "@/components/shared/buttons/ButtonPrimary";
import Image from "next/image";
import DraftStatusIndicator from "@/components/shared/course-builder/DraftStatusIndicator";
import PublishButton from "@/components/shared/course-builder/PublishButton";
import ResetButton from "@/components/shared/course-builder/ResetButton";
import PreviewButton from "@/components/shared/course-builder/PreviewButton";
import FormProgressIndicator from "@/components/shared/course-builder/FormProgressIndicator";
import FieldError from "@/components/shared/errors/FieldError.js";
import accordions from "@/libs/accordions";
import MediaUpload from "@/components/shared/forms/MediaUpload.js";
import RichTextEditor from "@/components/shared/forms/RichTextEditor.js";
import ImagePicker from "@/components/shared/forms/ImagePicker.js";
import CertificateSection from "@/components/sections/create-course/CertificateSection.js";

// Selector Components
import CategorySelector from "@/components/shared/forms/CategorySelector.js";
import SubcategorySelector from "@/components/shared/forms/SubcategorySelector.js";
import CourseTypeSelector from "@/components/shared/forms/CourseTypeSelector.js";
import ProgramTypeSelector from "@/components/shared/forms/ProgramTypeSelector.js";
import { useCourseTypes } from "@/hooks/api/useCourseSettings.js";
import CourseLevelSelector from "@/components/shared/forms/CourseLevelSelector.js";
import CourseSkillsSelector from "@/components/shared/forms/CourseSkillsSelector.js";
import InstructorSelector from "@/components/shared/forms/InstructorSelector.js";
import ClassSelector from "@/components/shared/forms/ClassSelector.js";
import SubjectSelector from "@/components/shared/forms/SubjectSelector.js";
import OrganizationSelector from "@/components/shared/forms/OrganizationSelector.js";

// Course Builder
import CourseBuilderSection from "@/components/sections/create-course/CourseBuilderSection.js";

// Helper component for error icon in labels
const ErrorIcon = () => (
  <span className="inline-flex items-center text-red-600 dark:text-red-400" title="This field has an error">
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  </span>
);

const CreateCoursePrimary = ({ isVendorMode = false }) => {
  const {
    courseData,
    updateField,
    validationErrors,
    isEditMode,
    editingCourseId,
  } = useCourseStore();

  // Slug validation state
  const [slugStatus, setSlugStatus] = useState({
    checking: false,
    available: true,
    message: '',
    existingCourse: null,
  });
  const slugCheckTimeoutRef = useRef(null);

  // Fetch course types to check if selected type is "Free"
  const { data: courseTypesData, isLoading: courseTypesLoading } = useCourseTypes({ status: 1 });
  
  // Get selected course type - handle both data structures
  const courseTypes = courseTypesData?.types || courseTypesData || [];
  const selectedCourseType = Array.isArray(courseTypes) 
    ? courseTypes.find((type) => type.id === courseData.courseTypeId)
    : null;
  
  // Check if course is free - handle case-insensitive comparison and null/undefined
  const isFreeCourse = selectedCourseType?.name 
    ? selectedCourseType.name.toLowerCase().trim() === 'free'
    : false;

  // Check slug availability
  const checkSlugAvailability = useCallback(async (slug) => {
    if (!slug || slug.trim() === '') {
      setSlugStatus({
        checking: false,
        available: true,
        message: '',
        existingCourse: null,
      });
      return;
    }

    // Minimum length check
    if (slug.trim().length < 3) {
      setSlugStatus({
        checking: false,
        available: true,
        message: '',
        existingCourse: null,
      });
      return;
    }

    setSlugStatus((prev) => ({ ...prev, checking: true }));

    try {
      // Build URL with optional excludeCourseId parameter for edit mode
      let url = `/api/courses/check-slug?slug=${encodeURIComponent(slug.trim())}`;
      if (isEditMode && editingCourseId) {
        url += `&excludeCourseId=${encodeURIComponent(editingCourseId)}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.available) {
        setSlugStatus({
          checking: false,
          available: true,
          message: '✓ This slug is available',
          existingCourse: null,
        });
      } else {
        setSlugStatus({
          checking: false,
          available: false,
          message: data.message || 'This slug is already taken',
          existingCourse: data.existingCourse || null,
        });
      }
    } catch (error) {
      console.error('Error checking slug availability:', error);
      setSlugStatus({
        checking: false,
        available: true, // Default to available on error
        message: '',
        existingCourse: null,
      });
    }
  }, [isEditMode, editingCourseId]);

  // Handle slug change with debounce
  const handleSlugChange = useCallback((e) => {
    const newSlug = e.target.value;
    updateField('slug', newSlug);

    // Clear previous timeout
    if (slugCheckTimeoutRef.current) {
      clearTimeout(slugCheckTimeoutRef.current);
    }

    // Reset status if slug is empty
    if (!newSlug || newSlug.trim() === '') {
      setSlugStatus({
        checking: false,
        available: true,
        message: '',
        existingCourse: null,
      });
      return;
    }

    // Debounce slug check (wait 500ms after user stops typing)
    slugCheckTimeoutRef.current = setTimeout(() => {
      checkSlugAvailability(newSlug);
    }, 500);
  }, [updateField, checkSlugAvailability]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (slugCheckTimeoutRef.current) {
        clearTimeout(slugCheckTimeoutRef.current);
      }
    };
  }, []);

  // Auto-set prices to 0 when course type is "Free"
  useEffect(() => {
    if (isFreeCourse) {
      if (courseData.regularPrice !== 0 && courseData.regularPrice !== null && courseData.regularPrice !== undefined) {
        updateField('regularPrice', 0);
      }
      if (courseData.discountedPrice !== 0 && courseData.discountedPrice !== null && courseData.discountedPrice !== undefined) {
        updateField('discountedPrice', 0);
      }
    }
  }, [isFreeCourse, courseData.regularPrice, courseData.discountedPrice, updateField]);

  // Initialize accordion functionality
  useEffect(() => {
    // Initialize accordions when component mounts
    // Use a small delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(() => {
      accordions();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Only initialize once on mount

  // Auto-generate slug from title
  const handleTitleChange = (e) => {
    const title = e.target.value;
    updateField('title', title);
    
    // Auto-generate slug if slug is empty or matches previous title
    if (!courseData.slug || courseData.slug === generateSlug(courseData.title)) {
      updateField('slug', generateSlug(title));
    }
  };

  return (
    <div>
      <div className="container pt-100px pb-100px" data-aos="fade-up">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-30px gap-y-5">
          {/*  create course left */}
          <div data-aos="fade-up" className="lg:col-start-1 lg:col-span-8">
            {/* Draft Status and Action Buttons */}
            <div className="mb-5 p-4 md:p-5 bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <DraftStatusIndicator />
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <PreviewButton className="w-full sm:w-auto" />
                  <ResetButton className="w-full sm:w-auto" />
                  <PublishButton className="w-full sm:w-auto" />
                </div>
              </div>
            </div>

            {/* Form Progress Indicator */}
            <div className="mb-5">
              <FormProgressIndicator />
            </div>
            
            <ul className="accordion-container curriculum create-course">
              {/*  accordion */}
              <li className="accordion mb-5 active">
                <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-t-md">
                  {/*  controller */}
                  <div className="py-5 px-30px">
                    <div className="cursor-pointer accordion-controller flex justify-between items-center text-lg text-headingColor font-semibold w-full dark:text-headingColor-dark font-hind leading-27px rounded-t-md">
                      <div>
                        <span>Course Info</span>
                      </div>
                      <svg
                        className="transition-all duration-500 rotate-0"
                        width="20"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="#212529"
                      >
                        <path
                          fillRule="evenodd"
                          d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                        ></path>
                      </svg>
                    </div>
                  </div>
                  {/*  content */}
                  <div className="accordion-content transition-all duration-500 overflow-hidden">
                    <div className="content-wrapper py-4 px-5">
                      <div>
                        <form
                          className="p-10px md:p-10 lg:p-5 2xl:p-10 bg-darkdeep3 dark:bg-transparent text-sm text-blackColor dark:text-blackColor-dark leading-1.8"
                          data-aos="fade-up"
                        >
                          <div className="grid grid-cols-1 mb-15px gap-15px">
                            {/* Course Title */}
                            <div>
                              <label className="mb-3 block font-semibold flex items-center gap-2">
                                Course Title <span className="text-red-500">*</span>
                                {validationErrors.title && (
                                  <span className="inline-flex items-center text-red-600 dark:text-red-400" title="This field has an error">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </label>
                              <input
                                type="text"
                                value={courseData.title || ''}
                                onChange={handleTitleChange}
                                placeholder="Course Title"
                                className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                                  validationErrors.title
                                    ? 'border-red-500 dark:border-red-500'
                                    : 'border-borderColor dark:border-borderColor-dark'
                                } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no`}
                              />
                              <FieldError error={validationErrors.title} field="title" />
                            </div>

                            {/* Course Slug */}
                            <div>
                              <label className="mb-3 block font-semibold flex items-center gap-2">
                                Course Slug <span className="text-red-500">*</span>
                                {validationErrors.slug && <ErrorIcon />}
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={courseData.slug || ''}
                                  onChange={handleSlugChange}
                                  placeholder="course-slug"
                                  className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                                    validationErrors.slug
                                      ? 'border-red-500 dark:border-red-500'
                                      : !slugStatus.available && !slugStatus.checking
                                      ? 'border-amber-500 dark:border-amber-500'
                                      : slugStatus.available && slugStatus.message
                                      ? 'border-green-500 dark:border-green-500'
                                      : 'border-borderColor dark:border-borderColor-dark'
                                  } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no transition-colors duration-200`}
                                />
                                {slugStatus.checking && (
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <FieldError error={validationErrors.slug} field="slug" />
                              
                              {/* Slug Availability Status */}
                              {courseData.slug && courseData.slug.trim() && !slugStatus.checking && (
                                <div className={`mt-2 p-3 rounded-lg border-2 transition-all duration-300 ${
                                  !slugStatus.available
                                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                                    : slugStatus.message && slugStatus.available
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                                    : ''
                                }`}>
                                  <div className="flex items-start gap-2">
                                    {!slugStatus.available ? (
                                      <>
                                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <div className="flex-1">
                                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                                            ⚠️ Slug Already Exists
                                          </p>
                                          <p className="text-sm text-amber-700 dark:text-amber-300">
                                            {slugStatus.message}
                                          </p>
                                          {slugStatus.existingCourse && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                              Existing course: <span className="font-medium">{slugStatus.existingCourse.title}</span>
                                            </p>
                                          )}
                                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                                            💡 Tip: The system will automatically generate a unique slug when you publish, or you can change it manually.
                                          </p>
                                        </div>
                                      </>
                                    ) : slugStatus.message ? (
                                      <>
                                        <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                                          {slugStatus.message}
                                        </p>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              )}
                              
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Auto-generated from title. You can edit it manually.
                              </p>
                            </div>

                            {/* Course Type */}
                            <div>
                              <CourseTypeSelector
                                value={courseData.courseTypeId}
                                onChange={(value) => updateField('courseTypeId', value)}
                                error={validationErrors.courseTypeId}
                              />
                            </div>

                            {/* Regular Price */}
                            <div>
                              <label className="mb-3 block font-semibold">
                                Regular Price ($)
                              </label>
                              <input
                                type="number"
                                value={courseData.regularPrice || ''}
                                onChange={(e) => updateField('regularPrice', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                disabled={isFreeCourse}
                                className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                                  validationErrors.regularPrice
                                    ? 'border-red-500 dark:border-red-500'
                                    : 'border-borderColor dark:border-borderColor-dark'
                                } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md ${
                                  isFreeCourse ? 'opacity-60 cursor-not-allowed' : ''
                                }`}
                              />
                              <FieldError error={validationErrors.regularPrice} field="regularPrice" />
                            </div>

                            {/* Discounted Price */}
                            <div>
                              <p className="flex items-center gap-0.5 mb-2 text-xs text-gray-600 dark:text-gray-400">
                                <svg
                                  className="feather feather-info w-14px h-14px"
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="16" x2="12" y2="12"></line>
                                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                The Course Price Includes Your Author Fee.
                              </p>
                              <label className="mb-3 block font-semibold">
                                Discounted Price ($)
                              </label>
                              <input
                                type="number"
                                value={courseData.discountedPrice || ''}
                                onChange={(e) => updateField('discountedPrice', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                disabled={isFreeCourse}
                                className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                                  validationErrors.discountedPrice
                                    ? 'border-red-500 dark:border-red-500'
                                    : 'border-borderColor dark:border-borderColor-dark'
                                } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md ${
                                  isFreeCourse ? 'opacity-60 cursor-not-allowed' : ''
                                }`}
                              />
                              <FieldError error={validationErrors.discountedPrice} field="discountedPrice" />
                            </div>

                            {/* Category */}
                            <div>
                              <CategorySelector
                                value={courseData.categoryId}
                                onChange={(value) => {
                                  updateField('categoryId', value);
                                  // Clear subcategory when category changes
                                  if (value !== courseData.categoryId) {
                                    updateField('subcategoryId', null);
                                  }
                                }}
                                error={validationErrors.categoryId}
                              />
                            </div>

                            {/* Subcategory */}
                            <div>
                              <SubcategorySelector
                                categoryId={courseData.categoryId}
                                value={courseData.subcategoryId}
                                onChange={(value) => updateField('subcategoryId', value)}
                                error={validationErrors.subcategoryId}
                              />
                            </div>

                            {/* Program Type */}
                            <div>
                              <ProgramTypeSelector
                                value={courseData.programTypeId}
                                onChange={(value) => updateField('programTypeId', value)}
                                error={validationErrors.programTypeId}
                              />
                            </div>

                            {/* Course Level */}
                            <div>
                              <CourseLevelSelector
                                value={courseData.courseLevelId}
                                onChange={(value) => updateField('courseLevelId', value)}
                                error={validationErrors.courseLevelId}
                              />
                            </div>

                            {/* Course Skills */}
                            <div>
                              <CourseSkillsSelector
                                value={courseData.courseSkills || []}
                                onChange={(value) => updateField('courseSkills', value)}
                                error={validationErrors.courseSkills}
                              />
                            </div>

                            {/* Organization (Superadmin only) - Must be first - Hidden for vendors */}
                            {!isVendorMode && (
                              <div>
                                <OrganizationSelector
                                  value={courseData.organizationId}
                                  onChange={(value) => {
                                    updateField('organizationId', value);
                                    // Clear dependent fields when organization changes
                                    if (value !== courseData.organizationId) {
                                      updateField('instructorIds', []);
                                      updateField('classIds', []);
                                      updateField('subjectIds', []);
                                    }
                                  }}
                                  error={validationErrors.organizationId}
                                />
                              </div>
                            )}

                            {/* Instructors - Based on organization - Hidden for vendors */}
                            {!isVendorMode && (
                              <div>
                                <InstructorSelector
                                  value={(() => {
                                    const ids = courseData.instructorIds || [];
                                    if (!Array.isArray(ids)) return [];
                                    // Deduplicate and filter null/undefined
                                    const clean = [...new Set(ids.filter(id => id != null && id !== ''))];
                                    return clean;
                                  })()}
                                  onChange={(value) => {
                                    // Remove duplicates and null/undefined values
                                    const cleanValue = Array.isArray(value) 
                                      ? [...new Set(value.filter(id => id != null && id !== ''))]
                                      : [];
                                    
                                    // Only update if the value actually changed (avoid unnecessary updates)
                                    const currentIds = Array.isArray(courseData.instructorIds) 
                                      ? [...new Set(courseData.instructorIds.filter(id => id != null && id !== ''))]
                                      : [];
                                    
                                    if (JSON.stringify(cleanValue.sort()) !== JSON.stringify(currentIds.sort())) {
                                      updateField('instructorIds', cleanValue);
                                      // Clear classes and subjects when instructors change
                                      updateField('classIds', []);
                                      updateField('subjectIds', []);
                                    }
                                  }}
                                  error={validationErrors.instructorIds}
                                  organizationId={courseData.organizationId}
                                />
                              </div>
                            )}

                            {/* Classes - Based on instructor - Hidden for vendors */}
                            {!isVendorMode && (
                              <div>
                                <ClassSelector
                                  value={courseData.classIds || []}
                                  onChange={(value) => {
                                    updateField('classIds', value);
                                    // Clear subjects when classes change
                                    if (JSON.stringify(value) !== JSON.stringify(courseData.classIds)) {
                                      updateField('subjectIds', []);
                                    }
                                  }}
                                  error={validationErrors.classIds}
                                  organizationId={courseData.organizationId}
                                  instructorIds={courseData.instructorIds || []}
                                />
                              </div>
                            )}

                            {/* Subjects - Based on classes and instructor - Hidden for vendors */}
                            {!isVendorMode && (
                              <div>
                                <SubjectSelector
                                  classIds={courseData.classIds || []}
                                  value={courseData.subjectIds || []}
                                  onChange={(value) => updateField('subjectIds', value)}
                                  error={validationErrors.subjectIds}
                                  organizationId={courseData.organizationId}
                                  instructorIds={courseData.instructorIds || []}
                                />
                              </div>
                            )}
                          </div>

                          {/* About Course */}
                          <div className="mb-15px">
                            <label className="mb-3 block font-semibold">
                              About Course
                            </label>
                            <RichTextEditor
                              value={courseData.aboutCourse || ''}
                              onChange={(html) => updateField('aboutCourse', html)}
                              placeholder="Describe your course with rich formatting..."
                              error={!!validationErrors.aboutCourse}
                              className="mb-15px"
                            />
                            <FieldError error={validationErrors.aboutCourse} field="aboutCourse" />
                          </div>

                          {/* Note: Form submission is handled by auto-save and publish button */}
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
              {/*  accordion */}
              <li className="accordion mb-5">
                <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark">
                  {/*  controller */}
                  <div className="py-5 px-30px">
                    <div className="cursor-pointer accordion-controller flex justify-between items-center text-lg text-headingColor font-semibold w-full dark:text-headingColor-dark font-hind leading-27px">
                      <div>
                        <span>Course Intro Video</span>
                      </div>
                      <svg
                        className="transition-all duration-500 rotate-0"
                        width="20"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="#212529"
                      >
                        <path
                          fillRule="evenodd"
                          d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                        ></path>
                      </svg>
                    </div>
                  </div>
                  {/*  content */}
                  <div className="accordion-content transition-all duration-500 overflow-hidden h-0">
                    <div className="content-wrapper py-4 px-5">
                      <div>
                        <form
                          className="p-10px md:p-10 lg:p-5 2xl:p-10 bg-darkdeep3 dark:bg-transparent text-sm text-blackColor dark:text-blackColor-dark leading-1.8"
                          data-aos="fade-up"
                        >
                          <div className="grid grid-cols-1 mb-15px gap-15px">
                            <div data-field="introVideoUrl">
                              <MediaUpload
                                value={courseData.introVideoUrl || ''}
                                onChange={(url) => updateField('introVideoUrl', url)}
                                label="Course Intro Video"
                                placeholder="https://www.youtube.com/watch?v=yourvideoid or https://vimeo.com/yourvideoid"
                                mediaType="video"
                                accept="video/*"
                                error={validationErrors.introVideoUrl}
                                showPreview={true}
                              />
                              <FieldError error={validationErrors.introVideoUrl} field="introVideoUrl" />
                            </div>
                            <div data-field="coverImageUrl">
                              <ImagePicker
                                value={courseData.coverImageUrl || ''}
                                onChange={(url) => updateField('coverImageUrl', url)}
                                label="Course Cover Image"
                                name="coverImageUrl"
                                keyPrefix="courses/covers"
                                maxSize={5 * 1024 * 1024} // 5MB
                                previewWidth={400}
                                previewHeight={225}
                                error={validationErrors.coverImageUrl}
                              />
                              <FieldError error={validationErrors.coverImageUrl} field="coverImageUrl" />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Upload a cover image for your course (recommended: 1920x1080px or 16:9 aspect ratio)
                              </p>
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
              {/*  accordion */}
              <li className="accordion mb-5">
                <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark">
                  {/*  controller */}
                  <div className="py-5 px-30px">
                    <div className="cursor-pointer accordion-controller flex justify-between items-center text-lg text-headingColor font-semibold w-full dark:text-headingColor-dark font-hind leading-27px">
                      <div>
                        <span>Course Builder</span>
                      </div>
                      <svg
                        className="transition-all duration-500 rotate-0"
                        width="20"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="#212529"
                      >
                        <path
                          fillRule="evenodd"
                          d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                        ></path>
                      </svg>
                    </div>
                  </div>
                  {/*  content */}
                  <div className="accordion-content transition-all duration-500 overflow-hidden h-0">
                    <div className="content-wrapper py-4 px-5">
                      <CourseBuilderSection />
                    </div>
                  </div>
                </div>
              </li>
              {/*  accordion */}
              <li className="accordion mb-5">
                <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark">
                  {/*  controller */}
                  <div className="py-5 px-30px">
                    <div className="cursor-pointer accordion-controller flex justify-between items-center text-lg text-headingColor font-semibold w-full dark:text-headingColor-dark font-hind leading-27px">
                      <div>
                        <span>Additional Information</span>
                      </div>
                      <svg
                        className="transition-all duration-500 rotate-0"
                        width="20"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="#212529"
                      >
                        <path
                          fillRule="evenodd"
                          d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                        ></path>
                      </svg>
                    </div>
                  </div>
                  {/*  content */}
                  <div className="accordion-content transition-all duration-500 overflow-hidden h-0">
                    <div className="content-wrapper py-4 px-5">
                      <div>
                        <form
                          className="p-10px md:p-10 lg:p-5 2xl:p-10 bg-darkdeep3 dark:bg-transparent text-sm text-blackColor dark:text-blackColor-dark leading-1.8"
                          data-aos="fade-up"
                        >
                          <div className="grid grid-cols-1 xl:grid-cols-2 mb-15px gap-y-15px gap-x-30px">
                            <div>
                              <label className="mb-3 block font-semibold">
                                Start Date
                              </label>
                              <input
                                type="date"
                                value={courseData.startDate ? new Date(courseData.startDate).toISOString().split('T')[0] : ''}
                                onChange={(e) => updateField('startDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                                  validationErrors.startDate
                                    ? 'border-red-500 dark:border-red-500'
                                    : 'border-borderColor dark:border-borderColor-dark'
                                } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no`}
                              />
                              <FieldError error={validationErrors.startDate} field="startDate" />
                            </div>
                            <div>
                              <label className="mb-3 block font-semibold">
                                Language
                              </label>
                              <input
                                type="text"
                                value={courseData.language || ''}
                                onChange={(e) => updateField('language', e.target.value)}
                                placeholder="English"
                                className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                                  validationErrors.language
                                    ? 'border-red-500 dark:border-red-500'
                                    : 'border-borderColor dark:border-borderColor-dark'
                                } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no`}
                              />
                              <FieldError error={validationErrors.language} field="language" />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-30px">
                            <div>
                              <label className="mb-3 block font-semibold">
                                Requirements
                              </label>
                              <textarea
                                value={courseData.requirements ? courseData.requirements.join('\n') : ''}
                                onChange={(e) => {
                                  const requirements = e.target.value
                                    .split('\n')
                                    .map(line => line.trim())
                                    .filter(line => line.length > 0);
                                  updateField('requirements', requirements);
                                }}
                                placeholder="Enter one requirement per line..."
                                className={`w-full py-10px px-5 mb-15px text-sm text-contentColor dark:text-contentColor-dark text-start bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                                  validationErrors.requirements
                                    ? 'border-red-500 dark:border-red-500'
                                    : 'border-borderColor dark:border-borderColor-dark'
                                } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md`}
                                rows="8"
                              />
                              <FieldError error={validationErrors.requirements} field="requirements" />
                              <p className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400">
                                <svg
                                  className="feather feather-info w-14px h-14px"
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="16" x2="12" y2="12"></line>
                                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                Enter one requirement per line.
                              </p>
                            </div>
                            <div>
                              <label className="mb-3 block font-semibold">
                                Description
                              </label>
                              <RichTextEditor
                                value={courseData.description || ''}
                                onChange={(html) => updateField('description', html)}
                                placeholder="Add your course description here with rich formatting..."
                                error={!!validationErrors.description}
                                className="mb-15px"
                              />
                              <FieldError error={validationErrors.description} field="description" />
                            </div>
                          </div>
                          <div className="mb-15px">
                            <label className="mb-3 block font-semibold">
                              Course Tags
                            </label>
                            <textarea
                              value={courseData.tags ? courseData.tags.join(', ') : ''}
                              onChange={(e) => {
                                const tags = e.target.value
                                  .split(',')
                                  .map(tag => tag.trim())
                                  .filter(tag => tag.length > 0);
                                updateField('tags', tags);
                              }}
                              placeholder="Enter tags separated by commas (e.g., web development, javascript, react)"
                              className={`w-full py-10px px-5 text-sm text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                                validationErrors.tags
                                  ? 'border-red-500 dark:border-red-500'
                                  : 'border-borderColor dark:border-borderColor-dark'
                              } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md`}
                              rows="4"
                            />
                            <FieldError error={validationErrors.tags} field="tags" />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Separate tags with commas
                            </p>
                          </div>

                          {/* Note: Form data is automatically saved via auto-save functionality */}
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
              {/*  accordion */}
              <li className="accordion mb-5">
                <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-b-md">
                  {/*  controller */}
                  <div className="cursor-pointer py-5 px-30px">
                    <div className="accordion-controller flex justify-between items-center text-lg text-headingColor font-semibold w-full dark:text-headingColor-dark font-hind leading-27px rounded-b-md">
                      <div>
                        <span>Certificate Template</span>
                      </div>
                      <svg
                        className="transition-all duration-500 rotate-0"
                        width="20"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="#212529"
                      >
                        <path
                          fillRule="evenodd"
                          d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                        ></path>
                      </svg>
                    </div>
                  </div>
                  {/*  content */}
                  <div className="accordion-content transition-all duration-500 overflow-hidden h-0">
                    <div className="content-wrapper py-4 px-5">
                      <div>
                        <form
                          className="p-10px md:p-10 lg:p-5 2xl:p-10 bg-darkdeep3 dark:bg-transparent text-sm text-blackColor dark:text-blackColor-dark leading-1.8"
                          data-aos="fade-up"
                        >
                          <CertificateSection
                            certificateMode={courseData.certificateMode || 'prebuilt'}
                            onModeChange={(mode) => {
                              updateField('certificateMode', mode);
                              // Clear selections when switching modes
                              if (mode === 'prebuilt') {
                                updateField('certificateUploadUrl', '');
                              } else {
                                updateField('certificateTemplateId', null);
                              }
                            }}
                            selectedTemplateId={courseData.certificateTemplateId}
                            onTemplateSelect={(templateId) => updateField('certificateTemplateId', templateId)}
                            uploadedCertificateUrl={courseData.certificateUploadUrl || ''}
                            onCertificateUpload={(url) => updateField('certificateUploadUrl', url)}
                            validationErrors={validationErrors}
                          />
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>

            <div className="mt-10 leading-1.8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-30px gap-y-5">
              <div data-aos="fade-up" className="lg:col-start-1 lg:col-span-4">
                <PreviewButton className="w-full" />
              </div>

              <div data-aos="fade-up" className="lg:col-start-5 lg:col-span-8">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    console.log('🚀 [CREATE COURSE] Button clicked');
                    
                    try {
                      const { courseData, validate, publish, validationErrors, errors, publishing } = useCourseStore.getState();
                      
                      console.log('🚀 [CREATE COURSE] Current state:', {
                        title: courseData.title,
                        slug: courseData.slug,
                        categoryId: courseData.categoryId,
                        hasModules: courseData.modules?.length > 0,
                        modulesCount: courseData.modules?.length || 0,
                        isPublished: courseData.isPublished,
                        publishing: publishing,
                      });
                      
                      console.log('🚀 [CREATE COURSE] Validation errors:', validationErrors);
                      console.log('🚀 [CREATE COURSE] General errors:', errors);
                      
                      if (publishing) {
                        console.warn('⚠️ [CREATE COURSE] Already publishing, ignoring click');
                        return;
                      }
                      
                      // Validate form
                      console.log('🚀 [CREATE COURSE] Starting validation...');
                      const validationResult = validate(true); // Mark as attempted
                      console.log('🚀 [CREATE COURSE] Validation result:', validationResult);
                      
                      if (!validationResult.isValid) {
                        console.error('❌ [CREATE COURSE] Validation failed:', validationResult.errors);
                        console.error('❌ [CREATE COURSE] Error types:', Object.entries(validationResult.errors).map(([k, v]) => [k, typeof v, Array.isArray(v)]));
                        
                        // Helper function to find field element by error path
                        const findFieldElement = async (errorPath) => {
                          // Special handling for introVideoUrl
                          if (errorPath === 'introVideoUrl') {
                            let element = document.querySelector('[data-field="introVideoUrl"]') ||
                                         document.querySelector('[data-field*="intro-video"]') ||
                                         document.querySelector('input[placeholder*="youtube"]') ||
                                         document.querySelector('input[placeholder*="vimeo"]');
                            if (element) return element;
                          }
                          
                          // Try direct field name/id (skip ID selector for paths with dots)
                          let element = document.querySelector(`[name="${errorPath}"]`) ||
                                       document.querySelector(`[data-field="${errorPath}"]`);
                          
                          // Only try ID selector if errorPath doesn't contain dots (which are invalid in CSS selectors)
                          if (!errorPath.includes('.')) {
                            const idElement = document.querySelector(`#${errorPath}`);
                            if (idElement) element = idElement;
                          }
                          
                          if (element) return element;
                          
                          // Handle nested paths like modules.0.chapters.0.title
                          if (errorPath.includes('modules.')) {
                            const moduleMatch = errorPath.match(/modules\.(\d+)/);
                            const chapterMatch = errorPath.match(/modules\.(\d+)\.chapters\.(\d+)/);
                            const lessonMatch = errorPath.match(/modules\.(\d+)\.chapters\.(\d+)\.lessons\.(\d+)/);
                            
                            // Extract field name from error path (e.g., 'title', 'lessons', 'videoUrl')
                            const parts = errorPath.split('.');
                            const fieldName = parts[parts.length - 1]; // Get last part
                            
                            if (lessonMatch) {
                              // Error in lesson: modules.0.chapters.0.lessons.0.title
                              const moduleIndex = parseInt(lessonMatch[1]);
                              const chapterIndex = parseInt(lessonMatch[2]);
                              const lessonIndex = parseInt(lessonMatch[3]);
                              
                              // Find module
                              const moduleContainers = document.querySelectorAll('[data-module-index]');
                              for (const moduleContainer of moduleContainers) {
                                const containerModuleIndex = parseInt(moduleContainer.getAttribute('data-module-index'));
                                if (containerModuleIndex === moduleIndex) {
                                  // Expand module if collapsed
                                  const moduleHeader = moduleContainer.querySelector('[class*="cursor-pointer"]');
                                  if (moduleHeader) {
                                    const isExpanded = moduleContainer.querySelector('[class*="space-y-4"]');
                                    if (!isExpanded) {
                                      moduleHeader.click();
                                      await new Promise(resolve => setTimeout(resolve, 100));
                                    }
                                  }
                                  
                                  // Find chapter
                                  const chapterContainers = moduleContainer.querySelectorAll('[data-chapter-index]');
                                  for (const chapterContainer of chapterContainers) {
                                    const containerChapterIndex = parseInt(chapterContainer.getAttribute('data-chapter-index'));
                                    if (containerChapterIndex === chapterIndex) {
                                      // Expand chapter if collapsed
                                      const chapterHeader = chapterContainer.querySelector('[class*="cursor-pointer"]');
                                      if (chapterHeader) {
                                        const isExpanded = chapterContainer.querySelector('[class*="space-y-4"]');
                                        if (!isExpanded) {
                                          chapterHeader.click();
                                          await new Promise(resolve => setTimeout(resolve, 100));
                                        }
                                      }
                                      
                                      // Find lesson input field
                                      const lessonInput = chapterContainer.querySelector(
                                        `[data-module-index="${moduleIndex}"][data-chapter-index="${chapterIndex}"][data-lesson-index="${lessonIndex}"][data-field*="${fieldName}"]`
                                      ) || chapterContainer.querySelector(
                                        `[data-lesson-index="${lessonIndex}"][data-field*="${fieldName}"]`
                                      );
                                      
                                      if (lessonInput) return lessonInput;
                                      
                                      // Fallback: find any input in lesson
                                      const lessonContainer = chapterContainer.querySelector(`[data-lesson-index="${lessonIndex}"]`);
                                      if (lessonContainer) {
                                        const input = lessonContainer.querySelector('input, textarea, select');
                                        if (input) return input;
                                        return lessonContainer;
                                      }
                                    }
                                  }
                                }
                              }
                            } else if (chapterMatch) {
                              // Error in chapter: modules.0.chapters.0.title or modules.0.chapters.0.lessons
                              const moduleIndex = parseInt(chapterMatch[1]);
                              const chapterIndex = parseInt(chapterMatch[2]);
                              
                              // Find module
                              const moduleContainers = document.querySelectorAll('[data-module-index]');
                              for (const moduleContainer of moduleContainers) {
                                const containerModuleIndex = parseInt(moduleContainer.getAttribute('data-module-index'));
                                if (containerModuleIndex === moduleIndex) {
                                  // Expand module if collapsed
                                  const moduleHeader = moduleContainer.querySelector('[class*="cursor-pointer"]');
                                  if (moduleHeader) {
                                    const isExpanded = moduleContainer.querySelector('[class*="space-y-4"]');
                                    if (!isExpanded) {
                                      moduleHeader.click();
                                      await new Promise(resolve => setTimeout(resolve, 100));
                                    }
                                  }
                                  
                                  // Find chapter
                                  const chapterContainers = moduleContainer.querySelectorAll('[data-chapter-index]');
                                  for (const chapterContainer of chapterContainers) {
                                    const containerChapterIndex = parseInt(chapterContainer.getAttribute('data-chapter-index'));
                                    if (containerChapterIndex === chapterIndex) {
                                      // Expand chapter if collapsed
                                      const chapterHeader = chapterContainer.querySelector('[class*="cursor-pointer"]');
                                      if (chapterHeader) {
                                        const isExpanded = chapterContainer.querySelector('[class*="space-y-4"]');
                                        if (!isExpanded) {
                                          chapterHeader.click();
                                          await new Promise(resolve => setTimeout(resolve, 100));
                                        }
                                      }
                                      
                                      // Find exact field
                                      if (fieldName === 'title') {
                                        const titleInput = chapterContainer.querySelector('[data-field="chapter-title"]');
                                        if (titleInput) return titleInput;
                                      } else if (fieldName === 'lessons') {
                                        // If lessons error, highlight the lessons section or first lesson
                                        const lessonsSection = chapterContainer.querySelector('[class*="space-y-3"]');
                                        if (lessonsSection) return lessonsSection;
                                        const firstLesson = chapterContainer.querySelector('[data-lesson-index="0"]');
                                        if (firstLesson) return firstLesson;
                                      }
                                      
                                      // Fallback: find any input in chapter
                                      const input = chapterContainer.querySelector('input, textarea, select');
                                      if (input) return input;
                                      return chapterContainer;
                                    }
                                  }
                                }
                              }
                            } else if (moduleMatch) {
                              // Error in module: modules.0.title or modules.0.chapters
                              const moduleIndex = parseInt(moduleMatch[1]);
                              
                              // Find module container
                              const moduleContainers = document.querySelectorAll('[data-module-index]');
                              for (const moduleContainer of moduleContainers) {
                                const containerModuleIndex = parseInt(moduleContainer.getAttribute('data-module-index'));
                                if (containerModuleIndex === moduleIndex) {
                                  // Expand module if collapsed
                                  const moduleHeader = moduleContainer.querySelector('[class*="cursor-pointer"]');
                                  if (moduleHeader) {
                                    const isExpanded = moduleContainer.querySelector('[class*="space-y-4"]');
                                    if (!isExpanded) {
                                      moduleHeader.click();
                                      await new Promise(resolve => setTimeout(resolve, 100));
                                    }
                                  }
                                  
                                  // Find exact field
                                  if (fieldName === 'title') {
                                    const titleInput = moduleContainer.querySelector('[data-field="module-title"]');
                                    if (titleInput) return titleInput;
                                  } else if (fieldName === 'chapters') {
                                    // If chapters error, highlight the chapters section
                                    const chaptersSection = moduleContainer.querySelector('[class*="space-y-4"]');
                                    if (chaptersSection) return chaptersSection;
                                  }
                                  
                                  // Fallback: return module container
                                  return moduleContainer;
                                }
                              }
                            }
                            
                            // Fallback: try to find by field name (fieldName already defined above)
                            element = document.querySelector(`[name="${fieldName}"]`) ||
                                     document.querySelector(`input[name*="${fieldName}"]`) ||
                                     document.querySelector(`textarea[name*="${fieldName}"]`) ||
                                     document.querySelector(`select[name*="${fieldName}"]`);
                            
                            if (element) return element;
                          } else if (errorPath.includes('.')) {
                            const parts = errorPath.split('.');
                            const fieldName = parts[parts.length - 1];
                            element = document.querySelector(`[name="${fieldName}"]`) ||
                                     document.querySelector(`input[name*="${fieldName}"]`) ||
                                     document.querySelector(`textarea[name*="${fieldName}"]`) ||
                                     document.querySelector(`select[name*="${fieldName}"]`);
                            
                            if (element) return element;
                          }
                          
                          // Try to find by label text
                          const labels = document.querySelectorAll('label');
                          for (const label of labels) {
                            const labelText = label.textContent?.toLowerCase() || '';
                            const fieldName = errorPath.toLowerCase().replace(/modules\.\d+\.chapters\.\d+\.lessons\.\d+\./, '')
                                                                   .replace(/modules\.\d+\.chapters\.\d+\./, '')
                                                                   .replace(/modules\.\d+\./, '');
                            
                            if (labelText.includes(fieldName) || labelText.includes(errorPath.toLowerCase())) {
                              const input = label.querySelector('input, textarea, select') ||
                                          label.nextElementSibling?.querySelector('input, textarea, select') ||
                                          document.getElementById(label.getAttribute('for'));
                              if (input) return input;
                            }
                          }
                          
                          return null;
                        };
                        
                        // Get all error field paths (flatten nested errors)
                        const getAllErrorPaths = (errors) => {
                          const paths = [];
                          const traverse = (obj, prefix = '') => {
                            for (const [key, value] of Object.entries(obj)) {
                              const path = prefix ? `${prefix}.${key}` : key;
                              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                // Check if it's an error object with message/title
                                if (value.message || value.title) {
                                  paths.push(path);
                                } else {
                                  // Nested object, recurse
                                  traverse(value, path);
                                }
                              } else if (typeof value === 'string') {
                                paths.push(path);
                              }
                            }
                          };
                          traverse(errors);
                          return paths;
                        };
                        
                        const errorPaths = getAllErrorPaths(validationResult.errors);
                        console.log('🔍 [CREATE COURSE] Error paths:', errorPaths);
                        
                        // Add visual highlighting to all error fields
                        setTimeout(async () => {
                          let firstErrorElement = null;
                          
                          for (let index = 0; index < errorPaths.length; index++) {
                            const errorPath = errorPaths[index];
                            const fieldElement = await findFieldElement(errorPath);
                            
                            if (fieldElement) {
                              // Add error class for red border
                              fieldElement.classList.add('error-highlight');
                              
                              // Add pulsing animation
                              fieldElement.style.animation = 'pulse-red 2s ease-in-out';
                              
                              // For input/textarea/select fields, add red border
                              if (fieldElement.tagName === 'INPUT' || fieldElement.tagName === 'TEXTAREA' || fieldElement.tagName === 'SELECT') {
                                fieldElement.style.borderColor = 'rgb(239, 68, 68)';
                                fieldElement.style.borderWidth = '2px';
                              }
                              
                              // For module/chapter/lesson containers, add border highlight
                              if (fieldElement.hasAttribute('data-module-index') || 
                                  fieldElement.hasAttribute('data-chapter-index') || 
                                  fieldElement.hasAttribute('data-lesson-index')) {
                                fieldElement.style.border = '2px solid rgb(239, 68, 68)';
                                fieldElement.style.borderRadius = '8px';
                                if (!fieldElement.style.padding) {
                                  fieldElement.style.padding = '12px';
                                }
                                fieldElement.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
                              }
                              
                              // Scroll to first error
                              if (index === 0) {
                                firstErrorElement = fieldElement;
                              }
                              
                              // Remove animation after 2 seconds, but keep error class and border
                              setTimeout(() => {
                                fieldElement.style.animation = '';
                              }, 2000);
                            }
                          }
                          
                          // Scroll to first error field
                          if (firstErrorElement) {
                            firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setTimeout(() => {
                              firstErrorElement.focus();
                            }, 300);
                          } else {
                            // Fallback: scroll to form start
                            const formElement = document.querySelector('.create-course') || 
                                              document.querySelector('form') ||
                                              document.querySelector('[data-aos="fade-up"]');
                            if (formElement) {
                              formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }
                        }, 100);
                        
                        // Format field names for display
                        const formatFieldName = (field) => {
                          // Handle nested paths like modules.0.chapters.0
                          if (field.includes('modules.')) {
                            const match = field.match(/modules\.(\d+)\.chapters\.(\d+)/);
                            if (match) {
                              const moduleNum = parseInt(match[1]) + 1;
                              const chapterNum = parseInt(match[2]) + 1;
                              if (field.includes('.title')) {
                                return `Module ${moduleNum}, Chapter ${chapterNum} - Title`;
                              }
                              if (field.includes('.lessons')) {
                                return `Module ${moduleNum}, Chapter ${chapterNum} - Lessons`;
                              }
                              return `Module ${moduleNum}, Chapter ${chapterNum}`;
                            }
                            
                            const moduleMatch = field.match(/modules\.(\d+)/);
                            if (moduleMatch) {
                              const moduleNum = parseInt(moduleMatch[1]) + 1;
                              if (field.includes('.title')) {
                                return `Module ${moduleNum} - Title`;
                              }
                              if (field.includes('.chapters')) {
                                return `Module ${moduleNum} - Chapters`;
                              }
                              return `Module ${moduleNum}`;
                            }
                          }
                          
                          // Handle lesson paths
                          if (field.includes('lessons.')) {
                            const match = field.match(/modules\.(\d+)\.chapters\.(\d+)\.lessons\.(\d+)/);
                            if (match) {
                              const moduleNum = parseInt(match[1]) + 1;
                              const chapterNum = parseInt(match[2]) + 1;
                              const lessonNum = parseInt(match[3]) + 1;
                              if (field.includes('.title')) {
                                return `Module ${moduleNum}, Chapter ${chapterNum}, Lesson ${lessonNum} - Title`;
                              }
                              if (field.includes('.videoUrl')) {
                                return `Module ${moduleNum}, Chapter ${chapterNum}, Lesson ${lessonNum} - Video URL`;
                              }
                              return `Module ${moduleNum}, Chapter ${chapterNum}, Lesson ${lessonNum}`;
                            }
                          }
                          
                          // Map common field names
                          const fieldMap = {
                            'introVideoUrl': 'Course Intro Video URL',
                            'title': 'Course Title',
                            'slug': 'Course Slug',
                            'categoryId': 'Category',
                            'subcategoryId': 'Subcategory',
                            'instructorIds': 'Instructors',
                            'classIds': 'Classes',
                            'subjectIds': 'Subjects',
                            'courseTypeId': 'Course Type',
                            'programTypeId': 'Program Type',
                            'courseLevelId': 'Course Level',
                            'regularPrice': 'Regular Price',
                            'discountedPrice': 'Discounted Price',
                            'certificateTemplateId': 'Certificate Template',
                            'certificateMode': 'Certificate Mode',
                            'certificateUploadUrl': 'Certificate Upload',
                          };
                          
                          return fieldMap[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
                        };
                        
                        // Format errors for user-friendly display
                        const formatValidationErrors = (errors) => {
                          const formattedErrors = [];
                          
                          const processError = (field, error) => {
                            // Handle the case where error might be a string "[object Object]"
                            if (typeof error === 'string' && error === '[object Object]') {
                              // This shouldn't happen, but if it does, try to get the actual error from validationErrors
                              formattedErrors.push(`• ${formatFieldName(field)}: Please check this section for missing required fields`);
                              return;
                            }
                            
                            // Handle nested error objects (like modules.0.chapters.0 which contains { title: "...", lessons: "..." })
                            if (typeof error === 'object' && error !== null && !Array.isArray(error)) {
                              // Check if it's an error object with common properties
                              if (error.message) {
                                formattedErrors.push(`• ${formatFieldName(field)}: ${error.message}`);
                              } else if (error.title) {
                                formattedErrors.push(`• ${formatFieldName(field)}: ${error.title}`);
                              } else {
                                // It's a nested object with multiple errors - flatten them
                                // Example: modules.0.chapters.0 = { title: "Chapter title is required", lessons: "At least one lesson..." }
                                const nestedErrors = [];
                                for (const [nestedKey, nestedValue] of Object.entries(error)) {
                                  const nestedField = `${field}.${nestedKey}`;
                                  if (typeof nestedValue === 'string') {
                                    // Format the nested field name properly
                                    const displayField = formatFieldName(nestedField);
                                    nestedErrors.push(`${displayField}: ${nestedValue}`);
                                  } else if (typeof nestedValue === 'object' && nestedValue !== null) {
                                    // Recursively process nested errors
                                    processError(nestedField, nestedValue);
                                  }
                                }
                                
                                // If we have nested errors, add them; otherwise add a generic message
                                if (nestedErrors.length > 0) {
                                  nestedErrors.forEach(err => formattedErrors.push(`• ${err}`));
                                } else {
                                  formattedErrors.push(`• ${formatFieldName(field)}: Please check this section for missing required fields`);
                                }
                              }
                            } else if (typeof error === 'string') {
                              // Simple string error
                              formattedErrors.push(`• ${formatFieldName(field)}: ${error}`);
                            } else {
                              // Fallback for other types
                              formattedErrors.push(`• ${formatFieldName(field)}: Please check this field`);
                            }
                          };
                          
                          for (const [field, error] of Object.entries(errors)) {
                            processError(field, error);
                          }
                          
                          return formattedErrors;
                        };
                        
                        const formattedErrors = formatValidationErrors(validationResult.errors);
                        const errorCount = formattedErrors.length;
                        
                        // Create user-friendly error message
                        const errorMessage = `Please fix the following ${errorCount} error(s) before publishing:\n\n${formattedErrors.join('\n')}\n\nPlease review the form and correct these issues.`;
                        
                        alert(errorMessage);
                        return;
                      }
                      
                      console.log('🚀 [CREATE COURSE] Validation passed, checking slug...');
                      
                      // Check if slug exists before publishing
                      // In edit mode, exclude current course ID from slug check
                      const { checkSlugExists: checkSlug, editingCourseId: currentEditingCourseId } = useCourseStore.getState();
                      const slugCheck = await checkSlug(courseData.slug, isEditMode ? currentEditingCourseId : null);
                      
                      if (slugCheck.exists) {
                        // Show confirmation dialog
                        const existingCourseTitle = slugCheck.existingCourse?.title || 'Unknown Course';
                        const confirmMessage = `⚠️ Slug Already Exists!\n\n` +
                          `The slug "${courseData.slug}" is already used by another course:\n"${existingCourseTitle}"\n\n` +
                          `Options:\n` +
                          `1. Change the slug manually and try again\n` +
                          `2. Continue - System will auto-generate a unique slug\n\n` +
                          `Do you want to continue with auto-generated slug?`;
                        
                        const userChoice = window.confirm(confirmMessage);
                        
                        if (!userChoice) {
                          console.log('❌ [CREATE COURSE] User cancelled publish due to duplicate slug');
                          alert('Publish cancelled. Please change the slug and try again.');
                          return;
                        }
                        
                        console.log('✅ [CREATE COURSE] User confirmed to continue with auto-generated slug');
                      }
                      
                      console.log('🚀 [CREATE COURSE] Attempting to publish...');
                      
                      // Publish course
                      const publishResult = await publish();
                      console.log('🚀 [CREATE COURSE] Publish result:', publishResult);
                      
                      if (publishResult && (publishResult.id || publishResult.success)) {
                        console.log('✅ [CREATE COURSE] Course published successfully! Course ID:', publishResult.id);
                        alert('Course published successfully! The form has been cleared and is ready for a new course.');
                        // Optionally redirect to course list or course page
                        // window.location.href = '/dashboards/superadmin-course';
                      } else {
                        console.error('❌ [CREATE COURSE] Publish returned unexpected result:', publishResult);
                        alert('Course may have been published, but received unexpected response. Check console for details.');
                      }
                    } catch (error) {
                      console.error('❌ [CREATE COURSE] Unexpected error:', error);
                      console.error('❌ [CREATE COURSE] Error name:', error.name);
                      console.error('❌ [CREATE COURSE] Error message:', error.message);
                      console.error('❌ [CREATE COURSE] Error stack:', error.stack);
                      
                      // Show user-friendly error message
                      let errorMessage = error.message || 'Unknown error';
                      
                      // Handle specific error types
                      if (errorMessage.includes('duplicate') || errorMessage.includes('slug')) {
                        errorMessage = 'A course with this slug already exists. The system will automatically generate a new unique slug and retry.';
                      } else if (errorMessage.includes('validation')) {
                        errorMessage = 'Please fix all validation errors before publishing.';
                      } else if (errorMessage.includes('database')) {
                        errorMessage = 'The course could not be saved to the database. Please try again.';
                      }
                      
                      alert(`Error: ${errorMessage}\n\nThe form has not been cleared. Please fix the issue and try again.`);
                    }
                  }}
                  className="text-whiteColor bg-primaryColor w-full p-13px hover:text-whiteColor hover:bg-secondaryColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-secondaryColor text-center cursor-pointer"
                >
                  Create Course
                </button>
              </div>
            </div>
          </div>
          {/*  create course righ */}
          <div data-aos="fade-up" className="lg:col-start-9 lg:col-span-4">
            <div className="p-30px border-2 border-primaryColor">
              <ul>
                <li className="my-7px flex gap-10px">
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
                    className="feather feather-check flex-shrink-0"
                  >
                    <polyline
                      points="20 6 9 17 4 12"
                      className="text-greencolor"
                    ></polyline>
                  </svg>
                  <p className="text-lg text-contentColor dark:text-contentColor-dark leading-1.45">
                    Set the Course Price option make it free.
                  </p>
                </li>
                <li className="my-7px flex gap-10px">
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
                    className="feather feather-check flex-shrink-0"
                  >
                    <polyline
                      points="20 6 9 17 4 12"
                      className="text-greencolor"
                    ></polyline>
                  </svg>
                  <p className="text-lg text-contentColor dark:text-contentColor-dark leading-1.45">
                    Standard size for the course thumbnail.
                  </p>
                </li>
                <li className="my-7px flex gap-10px">
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
                    className="feather feather-check flex-shrink-0"
                  >
                    <polyline
                      points="20 6 9 17 4 12"
                      className="text-greencolor"
                    ></polyline>
                  </svg>
                  <p className="text-lg text-contentColor dark:text-contentColor-dark leading-1.45">
                    Video section controls the course overview video.
                  </p>
                </li>
                <li className="my-7px flex gap-10px">
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
                    className="feather feather-check flex-shrink-0"
                  >
                    <polyline
                      points="20 6 9 17 4 12"
                      className="text-greencolor"
                    ></polyline>
                  </svg>
                  <p className="text-lg text-contentColor dark:text-contentColor-dark leading-1.45">
                    Course Builder is where you create course.
                  </p>
                </li>
                <li className="my-7px flex gap-10px">
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
                    className="feather feather-check flex-shrink-0"
                  >
                    <polyline
                      points="20 6 9 17 4 12"
                      className="text-greencolor"
                    ></polyline>
                  </svg>
                  <p className="text-lg text-contentColor dark:text-contentColor-dark leading-1.45">
                    Add Topics in the Course Builder section to create lessons,
                    .
                  </p>
                </li>
                <li className="my-7px flex gap-10px">
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
                    className="feather feather-check flex-shrink-0"
                  >
                    <polyline
                      points="20 6 9 17 4 12"
                      className="text-greencolor"
                    ></polyline>
                  </svg>
                  <p className="text-lg text-contentColor dark:text-contentColor-dark leading-1.45">
                    Prerequisites refers to the fundamental courses .
                  </p>
                </li>
                <li className="my-7px flex gap-10px">
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
                    className="feather feather-check flex-shrink-0"
                  >
                    <polyline
                      points="20 6 9 17 4 12"
                      className="text-greencolor"
                    ></polyline>
                  </svg>
                  <p className="text-lg text-contentColor dark:text-contentColor-dark leading-1.45">
                    Information from the Additional Data section.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCoursePrimary;
