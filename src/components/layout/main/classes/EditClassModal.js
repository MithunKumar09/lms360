/**
 * Edit Class Modal Component
 * 
 * Modal for editing class (cohort) with role-aware field locking.
 * Admins can only edit non-locked fields, superadmins can edit everything.
 * 
 * @module main/classes/EditClassModal
 */

'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import FormSelectAsync from '@/components/shared/forms/FormSelectAsync.js';
import FormMultiSelect from '@/components/shared/forms/FormMultiSelect.js';
import { cohortUpdateSchema, validateForm } from '@/lib/validation/classesSubjectsSchemas.js';
import ValidationError from '@/components/shared/errors/ValidationError.js';

/**
 * Edit Class Modal Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.cohort - Cohort data
 * @param {string} props.orgId - Organization ID
 * @param {string} props.userRole - User role
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSave - Save handler
 */
export default function EditClassModal({
  cohort,
  orgId,
  userRole,
  onClose,
  onSave,
}) {
  const createAlert = useSweetAlert();
  const [formData, setFormData] = useState({
    section_id: cohort?.section_id || '',
    term_id: cohort?.term_id || null,
    session_id: cohort?.session_id || '',
    program_node_id: cohort?.program_node_id || '',
    level: cohort?.level || '',
    subject_ids: cohort?.subject_ids || [],
  });
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [programNodes, setProgramNodes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const modalRef = useRef(null);
  const modalContentRef = useRef(null);

  // Helper function to normalize locked_fields to array format
  // PostgreSQL JSONB can return object {} or array [], we need array for frontend
  const normalizeLockedFields = (lockedFields) => {
    try {
      console.log('[EditClassModal] Normalizing locked_fields:', lockedFields, 'Type:', typeof lockedFields);
      
      if (!lockedFields) {
        console.log('[EditClassModal] locked_fields is null/undefined, returning empty array');
        return [];
      }
      
      // If it's already an array, return it
      if (Array.isArray(lockedFields)) {
        console.log('[EditClassModal] locked_fields is already an array:', lockedFields);
        return lockedFields;
      }
      
      // If it's an object, convert to array of keys where value is truthy
      if (typeof lockedFields === 'object') {
        const fieldsArray = Object.keys(lockedFields).filter(key => lockedFields[key]);
        console.log('[EditClassModal] Converted object to array:', fieldsArray);
        return fieldsArray;
      }
      
      // If it's a string, try to parse it
      if (typeof lockedFields === 'string') {
        try {
          const parsed = JSON.parse(lockedFields);
          if (Array.isArray(parsed)) {
            console.log('[EditClassModal] Parsed string to array:', parsed);
            return parsed;
          }
          if (typeof parsed === 'object') {
            const fieldsArray = Object.keys(parsed).filter(key => parsed[key]);
            console.log('[EditClassModal] Parsed string to object, converted to array:', fieldsArray);
            return fieldsArray;
          }
        } catch (parseError) {
          console.error('[EditClassModal] Error parsing locked_fields string:', parseError);
          return [];
        }
      }
      
      console.warn('[EditClassModal] Unexpected locked_fields type, returning empty array');
      return [];
    } catch (error) {
      console.error('[EditClassModal] Error normalizing locked_fields:', error);
      return [];
    }
  };

  // Get normalized locked fields array (memoized to avoid recalculating)
  const lockedFieldsArray = useMemo(() => {
    return normalizeLockedFields(cohort?.locked_fields);
  }, [cohort?.locked_fields]);

  // Update formData when cohort changes (only when cohort.id changes to avoid render issues)
  useEffect(() => {
    if (!cohort?.id) {
      return;
    }

    // Update form data when cohort changes
    const newFormData = {
      section_id: cohort.section_id || '',
      term_id: cohort.term_id || null,
      session_id: cohort.session_id || '',
      program_node_id: cohort.program_node_id || '',
      level: cohort.level || '',
      subject_ids: Array.isArray(cohort.subject_ids) ? cohort.subject_ids : [],
    };

    setFormData(newFormData);
    
    // Log cohort data (using normalized locked fields from memoized value)
    const normalizedLockedFields = normalizeLockedFields(cohort.locked_fields);
    console.log('[EditClassModal] Cohort data received:', {
      id: cohort.id,
      code: cohort.code,
      locked_fields: cohort.locked_fields,
      locked_fields_type: typeof cohort.locked_fields,
      locked_fields_isArray: Array.isArray(cohort.locked_fields),
      normalized_locked_fields: normalizedLockedFields,
      subject_ids: cohort.subject_ids,
    });
  }, [cohort?.id]); // Only depend on cohort.id to avoid unnecessary re-renders

  // Show modal when component mounts
  useEffect(() => {
    if (!cohort) return;

    // Wait for refs to be available
    const showModal = () => {
      if (!modalRef.current || !modalContentRef.current) {
        console.log('[EditClassModal] Refs not ready, retrying...');
        setTimeout(showModal, 10);
        return;
      }

      console.log('[EditClassModal] Showing modal');
      const modalElement = modalRef.current;
      const modalContent = modalContentRef.current;
      const body = document.body;

      // Show modal
      modalElement.style.display = 'block';
      
      // Prevent body scroll
      const scrollY = window.scrollY;
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      body.style.paddingRight = '17px';

      // Animate in after a short delay
      setTimeout(() => {
        modalElement.style.opacity = '1';
        modalElement.style.visibility = 'visible';
        modalContent.style.transform = 'translateY(0px)';
      }, 10);
    };

    // Start showing modal
    showModal();

    // Cleanup function
    return () => {
      const modalElement = modalRef.current;
      const modalContent = modalContentRef.current;
      
      if (modalElement && modalContent) {
        modalElement.style.opacity = '0';
        modalElement.style.visibility = 'hidden';
        modalContent.style.transform = 'translateY(-80px)';

        setTimeout(() => {
          modalElement.style.display = 'none';
          // Restore body scroll
          const body = document.body;
          const scrollY = body.style.top;
          body.style.position = '';
          body.style.top = '';
          body.style.width = '';
          body.style.overflow = '';
          body.style.paddingRight = '0';
          if (scrollY) {
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
          }
        }, 500);
      }
    };
  }, [cohort]);

  // Load sections
  const loadSections = async (searchTerm = '') => {
    if (!orgId) return [];
    
    try {
      const params = new URLSearchParams({
        orgId,
        q: searchTerm,
        limit: '50',
      });
      const response = await fetch(`/api/sections?${params}`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        return data.sections.map((section) => ({
          value: section.id,
          label: section.label,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading sections:', error);
      return [];
    }
  };

  // Load terms
  const loadTerms = async (searchTerm = '') => {
    if (!orgId) return [];
    
    try {
      const params = new URLSearchParams({
        orgId,
        q: searchTerm,
        limit: '50',
      });
      const response = await fetch(`/api/terms?${params}`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        return data.terms.map((term) => ({
          value: term.id,
          label: term.label,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading terms:', error);
      return [];
    }
  };

  // Load sessions
  const loadSessions = async (searchTerm = '') => {
    if (!orgId) return [];
    
    try {
      const params = new URLSearchParams({
        orgId,
        q: searchTerm,
        limit: '50',
      });
      const response = await fetch(`/api/academic-sessions?${params}`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        return data.sessions.map((session) => ({
          value: session.id,
          label: `${session.code} (${new Date(session.start_date).getFullYear()}-${new Date(session.end_date).getFullYear()})`,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  };

  // Load program nodes
  const loadProgramNodes = async (searchTerm = '') => {
    if (!orgId || !formData.level) return [];
    
    try {
      const params = new URLSearchParams({
        orgId,
        level: formData.level,
        q: searchTerm,
        limit: '50',
      });
      const response = await fetch(`/api/program-nodes?${params}`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        return data.nodes.map((node) => ({
          value: node.id,
          label: `${node.code} - ${node.title}`,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading program nodes:', error);
      return [];
    }
  };

  // Load subjects
  useEffect(() => {
    if (!orgId || !formData.level) {
      setSubjects([]);
      return;
    }

    setSubjectsLoading(true);
    const params = new URLSearchParams({
      orgId,
      level: formData.level,
      limit: '100',
    });
    
    fetch(`/api/subject-catalog?${params}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSubjects(
            data.subjects.map((subject) => ({
              value: subject.id,
              label: `${subject.code} - ${subject.title}`,
              category: subject.category || 'core',
              ...subject,
            }))
          );
        }
      })
      .catch(console.error)
      .finally(() => setSubjectsLoading(false));
  }, [orgId, formData.level]);

  // Build category options for subjects
  const buildCategoryOptions = useCallback(() => {
    const byCategory = {
      core: [],
      elective: [],
      lab: [],
      mandatory: [],
      project: [],
      internship: [],
      aecc: [],
      sec: [],
      open_elective: [],
      prof_elective: [],
    };
    subjects.forEach((s) => {
      const cat = s.category || 'core';
      if (byCategory[cat]) {
        byCategory[cat].push(s);
      }
    });
    return byCategory;
  }, [subjects]);

  const categoryOptions = buildCategoryOptions();

  // Get selected subjects for a category
  const getSelectedForCategory = useCallback(
    (categoryKey) => {
      const optionsForCategory = categoryOptions[categoryKey] || [];
      const optionIds = new Set(optionsForCategory.map((o) => o.value));
      const currentSubjectIds = Array.isArray(formData.subject_ids) ? formData.subject_ids : [];
      return currentSubjectIds.filter((v) => optionIds.has(v));
    },
    [categoryOptions, formData.subject_ids]
  );

  // Update category selection
  const updateCategorySelection = useCallback(
    (categoryKey, newValues) => {
      const optionsForCategory = categoryOptions[categoryKey] || [];
      const optionIds = new Set(optionsForCategory.map((o) => o.value));
      const currentSubjectIds = Array.isArray(formData.subject_ids) ? formData.subject_ids : [];
      const remaining = currentSubjectIds.filter((v) => !optionIds.has(v));
      setFormData((prev) => ({ ...prev, subject_ids: [...remaining, ...newValues] }));
    },
    [categoryOptions, formData.subject_ids]
  );

  // Check if field is locked (using safe array)
  const isFieldLocked = (field) => {
    try {
      const safeArray = Array.isArray(lockedFieldsArray) ? lockedFieldsArray : [];
      const isLocked = safeArray.includes(field) && userRole === 'admin';
      console.log('[EditClassModal] isFieldLocked check:', { field, isLocked, lockedFieldsArray: safeArray, userRole });
      return isLocked;
    } catch (error) {
      console.error('[EditClassModal] Error checking if field is locked:', error);
      return false;
    }
  };

  // Handle save
  const handleSave = async () => {
    // Build update data (only include fields that can be edited)
    const updateData = {};

    // Admins can only edit non-locked fields
    if (userRole === 'admin') {
      if (!isFieldLocked('section_id') && formData.section_id) {
        updateData.section_id = formData.section_id;
      }
      if (!isFieldLocked('term_id') && formData.term_id) {
        updateData.term_id = formData.term_id;
      }
      if (!isFieldLocked('session_id') && formData.session_id) {
        updateData.session_id = formData.session_id;
      }
    } else {
      // Superadmin can edit everything
      if (formData.section_id) updateData.section_id = formData.section_id;
      if (formData.term_id !== null) updateData.term_id = formData.term_id;
      if (formData.session_id) updateData.session_id = formData.session_id;
      if (formData.program_node_id) updateData.program_node_id = formData.program_node_id;
      if (formData.level) updateData.level = formData.level;
      if (Array.isArray(formData.subject_ids)) updateData.subject_ids = formData.subject_ids;
    }

    // Validate
    const validation = validateForm(cohortUpdateSchema, updateData);

    if (!validation.success) {
      setFormErrors(validation.errors);
      createAlert('error', 'Please fix the validation errors');
      return;
    }

    setLoading(true);
    setFormErrors({});

    try {
      const response = await fetch(`/api/cohorts/${cohort.id}?orgId=${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(validation.data),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setFormErrors(data.errors);
        }
        throw new Error(data.error || 'Failed to update class');
      }

      createAlert('success', 'Class updated successfully');
      if (onSave) onSave();
    } catch (error) {
      console.error('Error updating class:', error);
      createAlert('error', error.message || 'Failed to update class');
    } finally {
      setLoading(false);
    }
  };

  // Safety check - ensure cohort exists and is valid
  if (!cohort) {
    console.warn('[EditClassModal] Cohort is null/undefined, not rendering modal');
    return null;
  }

  // Ensure cohort has required fields
  if (!cohort.id) {
    console.error('[EditClassModal] Cohort missing required id field:', cohort);
    return null;
  }

  // Ensure lockedFieldsArray is always an array (safety check)
  const safeLockedFieldsArray = Array.isArray(lockedFieldsArray) ? lockedFieldsArray : [];

  return (
    <div className="modal-container">
        <div 
          ref={modalRef}
          className="modal fixed top-0 left-0 w-full h-full z-xxl transition-all duration-500 bg-lightBlack opacity-0 overflow-y-auto pb-10"
          style={{ display: 'none', visibility: 'hidden', position: 'fixed' }}
          onClick={(e) => {
            // Close modal when clicking on backdrop
            if (e.target === modalRef.current || e.target.classList.contains('modal-close')) {
              onClose();
            }
          }}
        >
        <div
          className="modal-close fixed md:absolute top-0 left-0 w-full h-full z-xsmall cursor-zoom-out"
          onClick={onClose}
        ></div>

        <div 
          ref={modalContentRef}
          className="modal-content transition-all duration-500 -translate-y-20 bg-whiteColor dark:bg-whiteColor-dark max-w-full md:max-w-md w-full mx-15px md:mx-auto mb-50px mt-50px md:mt-80px relative z-small rounded-xl shadow-2xl border border-borderColor dark:border-borderColor-dark overflow-hidden"
        >
          {/* Header with icon and gradient background */}
          <div className="bg-gradient-to-r from-primaryColor to-primaryColor/90 dark:from-primaryColor dark:to-primaryColor/80 px-30px py-20px border-b border-primaryColor/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-15px">
                <div className="flex items-center justify-center w-40px h-40px bg-whiteColor/20 dark:bg-whiteColor/10 rounded-lg backdrop-blur-sm">
                  <svg className="w-5 h-5 text-whiteColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-size-20 md:text-size-22 text-whiteColor font-bold leading-tight">
                    Edit Class
                  </h2>
                  <p className="text-xs text-whiteColor/80 mt-2px">
                    Update class information
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close flex items-center justify-center w-32px h-32px rounded-lg bg-whiteColor/10 hover:bg-whiteColor/20 text-whiteColor hover:text-whiteColor transition-all duration-200 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-30px">

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-25px"
            >
              {/* Level (Superadmin only, or if not locked) */}
              {(userRole === 'superadmin' || !isFieldLocked('level')) && (
                <div>
                  <label className="text-contentColor dark:text-contentColor-dark mb-8px block text-sm font-semibold">
                    Academic Level
                    {isFieldLocked('level') && (
                      <span className="ml-5px text-red-500" title="This field is locked">
                        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </span>
                    )}
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData((prev) => ({ ...prev, level: e.target.value, program_node_id: '' }))}
                    disabled={isFieldLocked('level')}
                    className={`w-full h-48px leading-48px pl-15px pr-40px bg-whiteColor dark:bg-whiteColor-dark text-sm focus:outline-none focus:ring-2 focus:ring-primaryColor/20 text-contentColor dark:text-contentColor-dark border-2 ${
                      formErrors.level
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-borderColor dark:border-borderColor-dark hover:border-primaryColor/50'
                    } rounded-lg font-medium transition-colors ${isFieldLocked('level') ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <option value="">Select level</option>
                    <option value="primary">Primary</option>
                    <option value="high_school">High School</option>
                    <option value="puc">PUC</option>
                    <option value="diploma">Diploma</option>
                    <option value="degree">Degree</option>
                    <option value="engineering">Engineering</option>
                    <option value="post_graduation">Post Graduation</option>
                  </select>
                  <ValidationError error={formErrors.level} field="level" />
                </div>
              )}

              {/* Program Node (Superadmin only, or if not locked) */}
              {(userRole === 'superadmin' || !isFieldLocked('program_node_id')) && (
                <FormSelectAsync
                  label="Program Node"
                  name="program_node_id"
                  value={formData.program_node_id}
                  onChange={(value) => setFormData((prev) => ({ ...prev, program_node_id: value }))}
                  loadOptions={loadProgramNodes}
                  error={formErrors.program_node_id}
                  placeholder="Select program node..."
                  disabled={isFieldLocked('program_node_id') || !formData.level}
                />
              )}

              {/* Term (if not locked) */}
              {!isFieldLocked('term_id') && (
                <FormSelectAsync
                  label="Term"
                  name="term_id"
                  value={formData.term_id || ''}
                  onChange={(value) => setFormData((prev) => ({ ...prev, term_id: value || null }))}
                  loadOptions={loadTerms}
                  error={formErrors.term_id}
                  placeholder="Select term..."
                  disabled={!orgId}
                />
              )}

              {/* Section (if not locked) */}
              {!isFieldLocked('section_id') && (
                <FormSelectAsync
                  label="Section"
                  name="section_id"
                  value={formData.section_id}
                  onChange={(value) => setFormData((prev) => ({ ...prev, section_id: value }))}
                  loadOptions={loadSections}
                  error={formErrors.section_id}
                  placeholder="Select section..."
                  disabled={!orgId}
                />
              )}

              {/* Session (if not locked) */}
              {!isFieldLocked('session_id') && (
                <FormSelectAsync
                  label="Academic Session"
                  name="session_id"
                  value={formData.session_id}
                  onChange={(value) => setFormData((prev) => ({ ...prev, session_id: value }))}
                  loadOptions={loadSessions}
                  error={formErrors.session_id}
                  placeholder="Select session..."
                  disabled={!orgId}
                />
              )}

              {/* Subjects Selection */}
              {!isFieldLocked('subject_ids') && (
                <div>
                  <label className="text-contentColor dark:text-contentColor-dark mb-8px block text-sm font-semibold">
                    Subjects
                  </label>
                  {subjectsLoading ? (
                    <div className="p-15px text-center text-contentColor dark:text-contentColor-dark text-sm">
                      Loading subjects...
                    </div>
                  ) : (
                    <div className="space-y-20px">
                      {categoryOptions.core.length > 0 && (
                        <FormMultiSelect
                          label="Core Subjects"
                          name="core_subjects"
                          value={getSelectedForCategory('core')}
                          onChange={(values) => updateCategorySelection('core', values)}
                          options={categoryOptions.core}
                          error={formErrors.subject_ids}
                          placeholder="Select core subjects..."
                          disabled={!orgId || !formData.level}
                        />
                      )}

                      {categoryOptions.elective.length > 0 && (
                        <FormMultiSelect
                          label="Elective Subjects"
                          name="elective_subjects"
                          value={getSelectedForCategory('elective')}
                          onChange={(values) => updateCategorySelection('elective', values)}
                          options={categoryOptions.elective}
                          error={formErrors.subject_ids}
                          placeholder="Select elective subjects..."
                          disabled={!orgId || !formData.level}
                        />
                      )}

                      {categoryOptions.lab.length > 0 && (
                        <FormMultiSelect
                          label="Lab Subjects"
                          name="lab_subjects"
                          value={getSelectedForCategory('lab')}
                          onChange={(values) => updateCategorySelection('lab', values)}
                          options={categoryOptions.lab}
                          error={formErrors.subject_ids}
                          placeholder="Select lab subjects..."
                          disabled={!orgId || !formData.level}
                        />
                      )}

                      {categoryOptions.mandatory.length > 0 && (
                        <FormMultiSelect
                          label="Mandatory Subjects"
                          name="mandatory_subjects"
                          value={getSelectedForCategory('mandatory')}
                          onChange={(values) => updateCategorySelection('mandatory', values)}
                          options={categoryOptions.mandatory}
                          error={formErrors.subject_ids}
                          placeholder="Select mandatory subjects..."
                          disabled={!orgId || !formData.level}
                        />
                      )}

                      {categoryOptions.project.length > 0 && (
                        <FormMultiSelect
                          label="Project Subjects"
                          name="project_subjects"
                          value={getSelectedForCategory('project')}
                          onChange={(values) => updateCategorySelection('project', values)}
                          options={categoryOptions.project}
                          error={formErrors.subject_ids}
                          placeholder="Select project subjects..."
                          disabled={!orgId || !formData.level}
                        />
                      )}

                      {categoryOptions.internship.length > 0 && (
                        <FormMultiSelect
                          label="Internship Subjects"
                          name="internship_subjects"
                          value={getSelectedForCategory('internship')}
                          onChange={(values) => updateCategorySelection('internship', values)}
                          options={categoryOptions.internship}
                          error={formErrors.subject_ids}
                          placeholder="Select internship subjects..."
                          disabled={!orgId || !formData.level}
                        />
                      )}

                      {categoryOptions.aecc.length > 0 && (
                        <FormMultiSelect
                          label="AECC Subjects"
                          name="aecc_subjects"
                          value={getSelectedForCategory('aecc')}
                          onChange={(values) => updateCategorySelection('aecc', values)}
                          options={categoryOptions.aecc}
                          error={formErrors.subject_ids}
                          placeholder="Select AECC subjects..."
                          disabled={!orgId || !formData.level}
                        />
                      )}

                      {categoryOptions.sec.length > 0 && (
                        <FormMultiSelect
                          label="SEC Subjects"
                          name="sec_subjects"
                          value={getSelectedForCategory('sec')}
                          onChange={(values) => updateCategorySelection('sec', values)}
                          options={categoryOptions.sec}
                          error={formErrors.subject_ids}
                          placeholder="Select SEC subjects..."
                          disabled={!orgId || !formData.level}
                        />
                      )}

                      {categoryOptions.open_elective.length > 0 && (
                        <FormMultiSelect
                          label="Open Elective Subjects"
                          name="open_elective_subjects"
                          value={getSelectedForCategory('open_elective')}
                          onChange={(values) => updateCategorySelection('open_elective', values)}
                          options={categoryOptions.open_elective}
                          error={formErrors.subject_ids}
                          placeholder="Select open elective subjects..."
                          disabled={!orgId || !formData.level}
                        />
                      )}

                      {categoryOptions.prof_elective.length > 0 && (
                        <FormMultiSelect
                          label="Professional Elective Subjects"
                          name="prof_elective_subjects"
                          value={getSelectedForCategory('prof_elective')}
                          onChange={(values) => updateCategorySelection('prof_elective', values)}
                          options={categoryOptions.prof_elective}
                          error={formErrors.subject_ids}
                          placeholder="Select professional elective subjects..."
                          disabled={!orgId || !formData.level}
                        />
                      )}
                    </div>
                  )}
                  <ValidationError error={formErrors.subject_ids} field="subject_ids" />
                </div>
              )}

              {/* Locked Fields Info */}
              {safeLockedFieldsArray && safeLockedFieldsArray.length > 0 && userRole === 'admin' && (
                <div className="p-15px bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-500 rounded-r-lg">
                  <div className="flex items-start gap-12px">
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                      <p className="text-yellow-800 dark:text-yellow-300 text-sm font-semibold mb-3px">
                        Locked Fields
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-400 text-xs leading-relaxed">
                        The following fields are locked and cannot be edited: <span className="font-medium">{safeLockedFieldsArray.join(', ')}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-12px justify-end pt-25px mt-25px border-t border-borderColor dark:border-borderColor-dark">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-25px py-12px text-size-15 font-medium text-contentColor dark:text-contentColor-dark bg-transparent border-2 border-borderColor dark:border-borderColor-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-25px py-12px text-size-15 font-semibold text-whiteColor bg-primaryColor border-2 border-primaryColor rounded-lg hover:bg-primaryColor/90 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-8px ${
                    loading ? 'cursor-wait' : ''
                  }`}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-whiteColor"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

