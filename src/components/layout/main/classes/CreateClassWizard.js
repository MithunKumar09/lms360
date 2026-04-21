/**
 * Create Class (Cohort) Wizard Component
 * 
 * 3-step wizard for creating classes with role-aware, dynamic inputs.
 * 
 * @module main/classes/CreateClassWizard
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import Swal from 'sweetalert2';
import { cohortCreateSchema, validateForm } from '@/lib/validation/classesSubjectsSchemas.js';
import FormSelectAsync from '@/components/shared/forms/FormSelectAsync.js';
import FormMultiSelect from '@/components/shared/forms/FormMultiSelect.js';
import ValidationError from '@/components/shared/errors/ValidationError.js';
import ErrorDisplay from '@/components/shared/errors/ErrorDisplay.js';
import { 
  useOrganizations, 
  useTerms, 
  useSections, 
  useAcademicSessions, 
  useProgramNodes,
  useElectiveGroups,
  useSubjectCatalogForDropdown 
} from '@/hooks/api/useDropdownData.js';
import { useCohort, useCohortExists, useCreateCohort, useUpdateCohort } from '@/hooks/api/useCohorts.js';
import { useOrganization } from '@/hooks/api/useOrganizations.js';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';

// Step 0: Organization Selection
const Step0Organization = ({ orgId, setOrgId, organization, setOrganization, errors, userRole }) => {
  // Use cached hook for organizations
  const organizationsQuery = useOrganizations(
    { limit: 100 },
    { enabled: userRole === 'superadmin' }
  );

  // Map organizations data to options format
  const mapOrganizations = useCallback((data) => {
    if (!data?.organizations) return [];
    return data.organizations.map((org) => ({
      value: org.id,
      label: `${org.name} (${org.org_code})`,
      ...org,
    }));
  }, []);

  // Legacy loadOrganizations for backward compatibility (now uses cache)
  const loadOrganizations = useCallback(async (searchTerm = '') => {
    if (userRole !== 'superadmin') return [];
    
    // Use cached data if available, filter client-side
    if (organizationsQuery.data?.organizations) {
      const filtered = organizationsQuery.data.organizations
        .filter((org) => 
          org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          org.org_code?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((org) => ({
          value: org.id,
          label: `${org.name} (${org.org_code})`,
          ...org,
        }));
      return filtered;
    }
    
    return [];
  }, [userRole, organizationsQuery.data]);

      // For admin, orgId is locked
  useEffect(() => {
    if (userRole === 'admin') {
      const user = useAuthStore.getState().user;
      if (user?.orgId) {
        setOrgId(user.orgId);
        // Fetch organization details using API client
        apiClient.get(buildEndpoint(getEndpoint('organizations.get'), { id: user.orgId }))
          .then((response) => {
            if (response.success && response.organization) {
              setOrganization(response.organization);
            }
          })
          .catch(console.error);
      }
    }
  }, [userRole, setOrgId, setOrganization]);

  if (userRole === 'admin') {
    return (
      <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
        <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">
          Organization
        </h2>
        <div className="relative">
          <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
            Organization <span className="text-red-500">*</span>
            <span className="ml-2 text-xs text-contentColor/70 dark:text-contentColor-dark/70">
              (Locked - Your Organization)
            </span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={organization?.name || 'Loading...'}
              disabled
              className="w-full h-52px leading-52px pl-5 bg-gray-100 dark:bg-gray-800 text-sm text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded opacity-60 cursor-not-allowed"
            />
            <div className="absolute right-5 top-1/2 transform -translate-y-1/2">
              <svg className="h-5 w-5 text-contentColor dark:text-contentColor-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
      <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">
        Select Organization
      </h2>
      <FormSelectAsync
        label="Organization"
        name="org_id"
        value={orgId}
        onChange={(value) => {
          setOrgId(value);
          // Fetch organization details using API client
          if (value) {
            apiClient.get(buildEndpoint(getEndpoint('organizations.get'), { id: value }))
              .then((response) => {
                if (response.success && response.organization) {
                  setOrganization(response.organization);
                }
              })
              .catch(console.error);
          }
        }}
        queryHook={organizationsQuery}
        mapData={mapOrganizations}
        loadOptions={loadOrganizations}
        error={errors.org_id}
        placeholder="Search and select organization..."
        disabled={organizationsQuery.isLoading}
      />
    </div>
  );
};

// Step 1: Structure Selection
const Step1Structure = ({ 
  formData, 
  setFormData, 
  organization, 
  errors, 
  cohortCodePreview 
}) => {
  const academicLevels = organization?.academic_levels || [];
  const selectedLevel = formData.level;

  // Use cached hooks for dropdown data
  const programNodesQuery = useProgramNodes(
    { orgId: formData.org_id, level: selectedLevel, limit: 50 },
    { enabled: Boolean(formData.org_id) && Boolean(selectedLevel) }
  );

  const sectionsQuery = useSections(
    { orgId: formData.org_id, limit: 50 },
    { enabled: Boolean(formData.org_id) }
  );

  const sessionsQuery = useAcademicSessions(
    { orgId: formData.org_id, limit: 50 },
    { enabled: Boolean(formData.org_id) }
  );

  const termsQuery = useTerms(
    { orgId: formData.org_id, limit: 50 },
    { enabled: Boolean(formData.org_id) }
  );

  // Map functions for query data
  const mapProgramNodes = useCallback((data) => {
    if (!data?.nodes) return [];
    return data.nodes.map((node) => ({
      value: node.id,
      label: `${node.code} - ${node.title}`,
      ...node,
    }));
  }, []);

  const mapSections = useCallback((data) => {
    if (!data?.sections) return [];
    return data.sections.map((section) => ({
      value: section.id,
      label: section.label,
      ...section,
    }));
  }, []);

  const mapSessions = useCallback((data) => {
    if (!data?.sessions) return [];
    return data.sessions.map((session) => ({
      value: session.id,
      label: `${session.code} (${new Date(session.start_date).getFullYear()}-${new Date(session.end_date).getFullYear()})`,
      ...session,
    }));
  }, []);

  const mapTerms = useCallback((data) => {
    if (!data?.terms) return [];
    return data.terms.map((term) => ({
      value: term.id,
      label: term.label,
      ...term,
    }));
  }, []);

  // Legacy load functions for backward compatibility (now use cache)
  const loadProgramNodes = useCallback(async (searchTerm = '') => {
    if (!formData.org_id || !selectedLevel) return [];
    
    if (programNodesQuery.data?.nodes) {
      const filtered = programNodesQuery.data.nodes
        .filter((node) => 
          node.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.title?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((node) => ({
          value: node.id,
          label: `${node.code} - ${node.title}`,
          ...node,
        }));
      return filtered;
    }
    
    return [];
  }, [formData.org_id, selectedLevel, programNodesQuery.data]);

  const loadSections = useCallback(async (searchTerm = '') => {
    if (!formData.org_id) return [];
    
    if (sectionsQuery.data?.sections) {
      const filtered = sectionsQuery.data.sections
        .filter((section) => 
          section.label?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((section) => ({
          value: section.id,
          label: section.label,
          ...section,
        }));
      return filtered;
    }
    
    return [];
  }, [formData.org_id, sectionsQuery.data]);

  const loadSessions = useCallback(async (searchTerm = '') => {
    if (!formData.org_id) return [];
    
    if (sessionsQuery.data?.sessions) {
      const filtered = sessionsQuery.data.sessions
        .filter((session) => 
          session.code?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((session) => ({
          value: session.id,
          label: `${session.code} (${new Date(session.start_date).getFullYear()}-${new Date(session.end_date).getFullYear()})`,
          ...session,
        }));
      return filtered;
    }
    
    return [];
  }, [formData.org_id, sessionsQuery.data]);

  const loadTerms = useCallback(async (searchTerm = '') => {
    if (!formData.org_id) return [];
    
    if (termsQuery.data?.terms) {
      const filtered = termsQuery.data.terms
        .filter((term) => 
          term.label?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((term) => ({
          value: term.id,
          label: term.label,
          ...term,
        }));
      return filtered;
    }
    
    return [];
  }, [formData.org_id, termsQuery.data]);

  // Determine which fields to show based on academic level
  const showTermField = selectedLevel === 'puc' || selectedLevel === 'diploma' || selectedLevel === 'degree' || selectedLevel === 'engineering';
  const showProgramNodeField = true; // Always show for all levels

  return (
    <div className="space-y-25px">
      <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
        <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">
          Class Structure
        </h2>

        {/* Academic Level */}
        <div className="mb-25px">
          <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
            Academic Level <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.level || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, level: e.target.value, program_node_id: '', term_id: null }))}
            className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
              errors.level
                ? 'border-red-500 dark:border-red-500'
                : 'border-borderColor dark:border-borderColor-dark'
            } rounded font-medium`}
          >
            <option value="">Select academic level</option>
            {academicLevels.map((level) => (
              <option key={level} value={level}>
                {level.charAt(0).toUpperCase() + level.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
          <ValidationError error={errors.level} field="level" />
        </div>

        {/* Program Node (Grade/Stream/Combination/etc) */}
        {showProgramNodeField && selectedLevel && (
          <FormSelectAsync
            label={selectedLevel === 'primary' || selectedLevel === 'high_school' ? 'Grade' : 
                   selectedLevel === 'puc' ? 'Stream/Combination' :
                   selectedLevel === 'diploma' ? 'Branch' :
                   selectedLevel === 'degree' || selectedLevel === 'engineering' ? 'Programme' : 'Program Node'}
            name="program_node_id"
            value={formData.program_node_id}
            onChange={(value) => setFormData((prev) => ({ ...prev, program_node_id: value }))}
            queryHook={programNodesQuery}
            mapData={mapProgramNodes}
            loadOptions={loadProgramNodes}
            error={errors.program_node_id}
            placeholder="Search and select..."
            disabled={!selectedLevel}
          />
        )}

        {/* Term (Year/Semester) - for PUC, Diploma, Degree, Engineering */}
        {showTermField && selectedLevel && (
          <FormSelectAsync
            label={selectedLevel === 'puc' ? 'Year' : 'Semester'}
            name="term_id"
            value={formData.term_id || ''}
            onChange={(value) => setFormData((prev) => ({ ...prev, term_id: value || null }))}
            queryHook={termsQuery}
            mapData={mapTerms}
            loadOptions={loadTerms}
            error={errors.term_id}
            placeholder="Search and select..."
            disabled={!selectedLevel}
          />
        )}

        {/* Section */}
        <FormSelectAsync
          label="Section"
          name="section_id"
          value={formData.section_id}
          onChange={(value) => setFormData((prev) => ({ ...prev, section_id: value }))}
          queryHook={sectionsQuery}
          mapData={mapSections}
          loadOptions={loadSections}
          error={errors.section_id}
          placeholder="Search and select section..."
          disabled={!formData.org_id}
        />

        {/* Session */}
        <FormSelectAsync
          label="Academic Session"
          name="session_id"
          value={formData.session_id}
          onChange={(value) => setFormData((prev) => ({ ...prev, session_id: value }))}
          queryHook={sessionsQuery}
          mapData={mapSessions}
          loadOptions={loadSessions}
          error={errors.session_id}
          placeholder="Search and select session..."
          disabled={!formData.org_id}
        />

        {/* Cohort Code Preview */}
        {cohortCodePreview && (
          <div className="mt-20px p-15px bg-primaryColor/10 dark:bg-primaryColor/20 rounded">
            <label className="text-contentColor dark:text-contentColor-dark mb-5px block text-sm font-medium">
              Generated Class Code
            </label>
            <div className="text-size-18 font-mono font-bold text-primaryColor dark:text-primaryColor-dark">
              {cohortCodePreview}
            </div>
            <p className="text-xs text-contentColor/70 dark:text-contentColor-dark/70 mt-5px">
              This code will be automatically generated based on your selections
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Step 2: Subjects Selection
const Step2Subjects = ({ 
  formData, 
  setFormData, 
  errors 
}) => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [useTemplate, setUseTemplate] = useState(false);

  // Use cached hooks for subjects and elective groups
  const subjectsQuery = useSubjectCatalogForDropdown(
    { orgId: formData.org_id, level: formData.level, limit: 100 },
    { enabled: Boolean(formData.org_id) && Boolean(formData.level) }
  );

  const electiveGroupsQuery = useElectiveGroups(
    { orgId: formData.org_id, limit: 100 },
    { enabled: Boolean(formData.org_id) }
  );

  // Map elective groups to options format
  const electiveGroups = electiveGroupsQuery.data?.groups?.map((group) => ({
    value: group.id,
    label: `${group.code} - ${group.title}`,
    ...group,
  })) || [];

  // Build category option maps for easy filtering/updates
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

  // Helpers to derive and set selections per category while preserving others
  const getSelectedForCategory = useCallback(
    (categoryKey) => {
      const optionsForCategory = categoryOptions[categoryKey] || [];
      const optionIds = new Set(optionsForCategory.map((o) => o.value));
      return selectedSubjects.filter((v) => optionIds.has(v));
    },
    [categoryOptions, selectedSubjects]
  );

  const updateCategorySelection = useCallback(
    (categoryKey, newValues) => {
      const optionsForCategory = categoryOptions[categoryKey] || [];
      const optionIds = new Set(optionsForCategory.map((o) => o.value));
      const remaining = selectedSubjects.filter((v) => !optionIds.has(v));
      setSelectedSubjects([...remaining, ...newValues]);
    },
    [categoryOptions, selectedSubjects]
  );

  // Track previous level to detect changes
  const prevLevelRef = useRef(formData.level);
  const initializedRef = useRef(false);
  
  // Update subjects from cached query data
  useEffect(() => {
    const oldLevel = prevLevelRef.current;
    const levelChanged = oldLevel !== formData.level && oldLevel !== undefined;
    
    if (levelChanged) {
      initializedRef.current = false;
      console.log('[Step2Subjects] Level changed, clearing selected subjects. Old level:', oldLevel, 'New level:', formData.level);
      setSelectedSubjects([]);
      setFormData((prev) => ({ ...prev, subject_ids: [] }));
      prevLevelRef.current = formData.level;
    } else if (oldLevel === undefined) {
      prevLevelRef.current = formData.level;
    }
    
    if (!formData.org_id || !formData.level) {
      setSubjects([]);
      setSelectedSubjects([]);
      setFormData((prev) => ({ ...prev, subject_ids: [] }));
      return;
    }

    // Use cached data from query
    if (subjectsQuery.data?.subjects) {
      const loadedSubjects = subjectsQuery.data.subjects.map((subject) => ({
        value: subject.id,
        label: `${subject.code} - ${subject.title}`,
        ...subject,
      }));
      setSubjects(loadedSubjects);
      
      // If level changed, ensure selectedSubjects is empty
      if (levelChanged) {
        console.log('[Step2Subjects] Level changed, ensuring selectedSubjects is empty');
        setSelectedSubjects([]);
        setFormData((prev) => ({ ...prev, subject_ids: [] }));
      } else {
        const loadedSubjectIds = new Set(loadedSubjects.map((s) => s.value));
        setSelectedSubjects((prev) => {
          const filtered = prev.filter((id) => loadedSubjectIds.has(id));
          if (filtered.length !== prev.length) {
            console.log('[Step2Subjects] Filtered out invalid subject IDs. Before:', prev.length, 'After:', filtered.length);
            setFormData((formPrev) => ({ ...formPrev, subject_ids: filtered }));
          }
          return filtered;
        });
      }
      
      console.log('[Step2Subjects] Loaded subjects for level:', formData.level, 'Count:', loadedSubjects.length);
    }
  }, [formData.org_id, formData.level, setFormData, subjectsQuery.data]);

  // Initialize selectedSubjects from formData.subject_ids only when subjects are first loaded (for edit mode)
  // This should only happen once when subjects are loaded and formData has subject_ids
  useEffect(() => {
    // Only initialize once when subjects are loaded and formData has subject_ids
    if (subjects.length > 0 && formData.subject_ids && Array.isArray(formData.subject_ids) && formData.subject_ids.length > 0 && !initializedRef.current) {
      const validSubjectIds = new Set(subjects.map((s) => s.value));
      const validIds = formData.subject_ids.filter((id) => validSubjectIds.has(id));
      if (validIds.length > 0 && selectedSubjects.length === 0) {
        console.log('[Step2Subjects] Initializing selectedSubjects from formData for edit mode. Valid IDs:', validIds);
        setSelectedSubjects(validIds);
        initializedRef.current = true;
      } else if (validIds.length === 0 && formData.subject_ids.length > 0) {
        console.log('[Step2Subjects] formData.subject_ids contains invalid IDs for current level. Clearing.');
        setFormData((prev) => ({ ...prev, subject_ids: [] }));
      }
    }
  }, [subjects, formData.subject_ids, selectedSubjects.length, setFormData]);

  // Update formData when selectedSubjects changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, subject_ids: selectedSubjects }));
  }, [selectedSubjects, setFormData]);

  return (
    <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
      <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">
        Subject Selection
      </h2>

      <div className="mb-25px">
        <label className="flex items-center gap-10px cursor-pointer">
          <input
            type="radio"
            checked={!useTemplate}
            onChange={() => setUseTemplate(false)}
            className="w-4 h-4"
          />
          <span className="text-contentColor dark:text-contentColor-dark">Manual Selection</span>
        </label>
        <label className="flex items-center gap-10px cursor-pointer mt-10px">
          <input
            type="radio"
            checked={useTemplate}
            onChange={() => setUseTemplate(true)}
            className="w-4 h-4"
          />
          <span className="text-contentColor dark:text-contentColor-dark">Use Offering Template</span>
        </label>
      </div>

      {!useTemplate ? (
        <div className="space-y-25px">
          {subjectsQuery.isLoading ? (
            <div className="p-15px text-center text-contentColor dark:text-contentColor-dark">
              Loading subjects...
            </div>
          ) : (
            <>
              <FormMultiSelect
                label="Core Subjects"
                name="core_subjects"
                value={getSelectedForCategory('core')}
                onChange={(values) => updateCategorySelection('core', values)}
                options={categoryOptions.core}
                error={errors.subjects}
                placeholder="Select core subjects..."
                disabled={!formData.org_id || !formData.level}
              />

              <FormMultiSelect
                label="Elective Subjects"
                name="elective_subjects"
                value={getSelectedForCategory('elective')}
                onChange={(values) => updateCategorySelection('elective', values)}
                options={categoryOptions.elective}
                error={errors.subjects}
                placeholder="Select elective subjects..."
                disabled={!formData.org_id || !formData.level}
              />

              <FormMultiSelect
                label="Lab Subjects"
                name="lab_subjects"
                value={getSelectedForCategory('lab')}
                onChange={(values) => updateCategorySelection('lab', values)}
                options={categoryOptions.lab}
                error={errors.subjects}
                placeholder="Select lab subjects..."
                disabled={!formData.org_id || !formData.level}
              />

              <FormMultiSelect
                label="Mandatory Subjects"
                name="mandatory_subjects"
                value={getSelectedForCategory('mandatory')}
                onChange={(values) => updateCategorySelection('mandatory', values)}
                options={categoryOptions.mandatory}
                error={errors.subjects}
                placeholder="Select mandatory subjects..."
                disabled={!formData.org_id || !formData.level}
              />

              <FormMultiSelect
                label="Project Subjects"
                name="project_subjects"
                value={getSelectedForCategory('project')}
                onChange={(values) => updateCategorySelection('project', values)}
                options={categoryOptions.project}
                error={errors.subjects}
                placeholder="Select project subjects..."
                disabled={!formData.org_id || !formData.level}
              />

              <FormMultiSelect
                label="Internship Subjects"
                name="internship_subjects"
                value={getSelectedForCategory('internship')}
                onChange={(values) => updateCategorySelection('internship', values)}
                options={categoryOptions.internship}
                error={errors.subjects}
                placeholder="Select internship subjects..."
                disabled={!formData.org_id || !formData.level}
              />

              <FormMultiSelect
                label="AECC Subjects"
                name="aecc_subjects"
                value={getSelectedForCategory('aecc')}
                onChange={(values) => updateCategorySelection('aecc', values)}
                options={categoryOptions.aecc}
                error={errors.subjects}
                placeholder="Select AECC subjects..."
                disabled={!formData.org_id || !formData.level}
              />

              <FormMultiSelect
                label="SEC Subjects"
                name="sec_subjects"
                value={getSelectedForCategory('sec')}
                onChange={(values) => updateCategorySelection('sec', values)}
                options={categoryOptions.sec}
                error={errors.subjects}
                placeholder="Select SEC subjects..."
                disabled={!formData.org_id || !formData.level}
              />

              <FormMultiSelect
                label="Open Elective Subjects"
                name="open_elective_subjects"
                value={getSelectedForCategory('open_elective')}
                onChange={(values) => updateCategorySelection('open_elective', values)}
                options={categoryOptions.open_elective}
                error={errors.subjects}
                placeholder="Select open elective subjects..."
                disabled={!formData.org_id || !formData.level}
              />

              <FormMultiSelect
                label="Professional Elective Subjects"
                name="prof_elective_subjects"
                value={getSelectedForCategory('prof_elective')}
                onChange={(values) => updateCategorySelection('prof_elective', values)}
                options={categoryOptions.prof_elective}
                error={errors.subjects}
                placeholder="Select professional elective subjects..."
                disabled={!formData.org_id || !formData.level}
              />

              <FormMultiSelect
                label="Elective Groups"
                name="elective_groups"
                value={formData.elective_group_ids || []}
                onChange={(values) => setFormData((prev) => ({ ...prev, elective_group_ids: values }))}
                options={electiveGroups}
                error={errors.elective_groups}
                placeholder="Select elective groups..."
                disabled={!formData.org_id}
              />
            </>
          )}
        </div>
      ) : (
        <div className="p-15px bg-gray-100 dark:bg-gray-800 rounded">
          <p className="text-contentColor dark:text-contentColor-dark text-sm">
            Template selection will be implemented in a future update. Please use manual selection for now.
          </p>
        </div>
      )}
    </div>
  );
};

// Step 3: Review & Save
const Step3Review = ({ 
  formData, 
  organization, 
  cohortCodePreview, 
  errors,
  userRole,
  onSave,
  loading,
  isEditMode = false,
}) => {
  const [saveAsPublish, setSaveAsPublish] = useState(false);
  const [nodeDetail, setNodeDetail] = useState(null);
  const [termDetail, setTermDetail] = useState(null);
  const [sectionDetail, setSectionDetail] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [electiveGroupsDetail, setElectiveGroupsDetail] = useState([]);
  const [subjectsDetail, setSubjectsDetail] = useState([]);

  // Load human-readable details for IDs to show a complete review
  useEffect(() => {
    const orgId = organization?.id || formData.org_id;
    if (!orgId) return;

    const requests = [];

    if (formData.program_node_id) {
      requests.push(
        fetch(`/api/program-nodes/${formData.program_node_id}?orgId=${orgId}`, { credentials: 'include' })
          .then(async (r) => {
            if (!r.ok && process.env.NODE_ENV !== 'production') {
              console.error('[DEV] Review: program node fetch failed', r.status, r.statusText);
            }
            return r.json();
          })
          .then((d) => d.success ? d.node : null)
          .then(setNodeDetail)
          .catch((e) => {
            if (process.env.NODE_ENV !== 'production') console.error('[DEV] Review: program node error', e);
          })
      );
    } else {
      setNodeDetail(null);
    }

    if (formData.term_id) {
      requests.push(
        fetch(`/api/terms?orgId=${orgId}`, { credentials: 'include' })
          .then(async (r) => {
            if (!r.ok && process.env.NODE_ENV !== 'production') {
              console.error('[DEV] Review: term fetch failed', r.status, r.statusText);
            }
            return r.json();
          })
          .then((d) => {
            const term = d.success ? (d.terms || []).find((t) => t.id === formData.term_id) : null;
            return term || null;
          })
          .then(setTermDetail)
          .catch((e) => {
            if (process.env.NODE_ENV !== 'production') console.error('[DEV] Review: term error', e);
          })
      );
    } else {
      setTermDetail(null);
    }

    if (formData.section_id) {
      requests.push(
        fetch(`/api/sections?orgId=${orgId}`, { credentials: 'include' })
          .then(async (r) => {
            if (!r.ok && process.env.NODE_ENV !== 'production') {
              console.error('[DEV] Review: section fetch failed', r.status, r.statusText);
            }
            return r.json();
          })
          .then((d) => {
            const section = d.success ? (d.sections || []).find((s) => s.id === formData.section_id) : null;
            return section || null;
          })
          .then(setSectionDetail)
          .catch((e) => {
            if (process.env.NODE_ENV !== 'production') console.error('[DEV] Review: section error', e);
          })
      );
    } else {
      setSectionDetail(null);
    }

    if (formData.session_id) {
      requests.push(
        fetch(`/api/academic-sessions?orgId=${orgId}`, { credentials: 'include' })
          .then(async (r) => {
            if (!r.ok && process.env.NODE_ENV !== 'production') {
              console.error('[DEV] Review: session fetch failed', r.status, r.statusText);
            }
            return r.json();
          })
          .then((d) => {
            const session = d.success ? (d.sessions || []).find((s) => s.id === formData.session_id) : null;
            return session || null;
          })
          .then(setSessionDetail)
          .catch((e) => {
            if (process.env.NODE_ENV !== 'production') console.error('[DEV] Review: session error', e);
          })
      );
    } else {
      setSessionDetail(null);
    }

    const electiveIds = Array.isArray(formData.elective_group_ids) ? formData.elective_group_ids : [];
    if (electiveIds.length > 0) {
      requests.push(
        fetch(`/api/elective-groups?orgId=${orgId}&ids=${electiveIds.join(',')}`, { credentials: 'include' })
          .then(async (r) => {
            if (!r.ok && process.env.NODE_ENV !== 'production') {
              console.error('[DEV] Review: elective groups fetch failed', r.status, r.statusText);
            }
            return r.json();
          })
          .then((d) => d.success ? d.groups : [])
          .then(setElectiveGroupsDetail)
          .catch((e) => {
            if (process.env.NODE_ENV !== 'production') console.error('[DEV] Review: elective groups error', e);
          })
      );
    } else {
      setElectiveGroupsDetail([]);
    }

    const subjectIds = Array.isArray(formData.subject_ids) ? formData.subject_ids : [];
    if (subjectIds.length > 0) {
      requests.push(
        fetch(`/api/subject-catalog?orgId=${orgId}&ids=${subjectIds.join(',')}`, { credentials: 'include' })
          .then(async (r) => {
            if (!r.ok && process.env.NODE_ENV !== 'production') {
              console.error('[DEV] Review: subjects fetch failed', r.status, r.statusText);
            }
            return r.json();
          })
          .then((d) => d.success ? d.subjects : [])
          .then(setSubjectsDetail)
          .catch((e) => {
            if (process.env.NODE_ENV !== 'production') console.error('[DEV] Review: subjects error', e);
          })
      );
    } else {
      setSubjectsDetail([]);
    }

    // Execute in background; no need to await for rendering basic info
    Promise.allSettled(requests).then(() => {});
  }, [organization, formData]);

  return (
    <div className="space-y-25px">
      <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
        <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">
          Review & Save
        </h2>

        {/* Summary */}
        <div className="space-y-15px mb-25px">
          <div>
            <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Organization:</label>
            <p className="text-contentColor dark:text-contentColor-dark">{organization?.name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Academic Level:</label>
            <p className="text-contentColor dark:text-contentColor-dark">{formData.level || 'N/A'}</p>
          </div>
          <div>
            <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Program:</label>
            <p className="text-contentColor dark:text-contentColor-dark">
              {nodeDetail ? `${nodeDetail.code} - ${nodeDetail.title}` : 'N/A'}
            </p>
          </div>
          {(formData.level === 'puc' || formData.level === 'diploma' || formData.level === 'degree' || formData.level === 'engineering') && (
            <div>
              <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">
                {formData.level === 'puc' ? 'Year' : 'Semester'}:
              </label>
              <p className="text-contentColor dark:text-contentColor-dark">{termDetail?.label || 'N/A'}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-15px">
            <div>
              <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Section:</label>
              <p className="text-contentColor dark:text-contentColor-dark">{sectionDetail?.label || 'N/A'}</p>
            </div>
            <div>
              <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Academic Session:</label>
              <p className="text-contentColor dark:text-contentColor-dark">
                {sessionDetail ? `${sessionDetail.code}` : 'N/A'}
              </p>
            </div>
          </div>
          <div>
            <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Elective Groups:</label>
            <p className="text-contentColor dark:text-contentColor-dark">
              {electiveGroupsDetail.length > 0
                ? electiveGroupsDetail.map((g) => `${g.code} - ${g.title}`).join(', ')
                : 'None'}
            </p>
          </div>
          <div>
            <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Selected Subjects:</label>
            {subjectsDetail.length > 0 ? (
              <ul className="list-disc pl-20px text-contentColor dark:text-contentColor-dark">
                {subjectsDetail.map((s) => (
                  <li key={s.id}>{`${s.code} - ${s.title} (${s.category || 'core'})`}</li>
                ))}
              </ul>
            ) : (
              <p className="text-contentColor dark:text-contentColor-dark">None</p>
            )}
          </div>
          <div>
            <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Class Code:</label>
            <p className="text-contentColor dark:text-contentColor-dark font-mono font-bold">{cohortCodePreview || 'N/A'}</p>
          </div>
        </div>

        {/* Status Selection */}
        <div className="mb-25px">
          <label className="flex items-center gap-10px cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsPublish}
              onChange={(e) => setSaveAsPublish(e.target.checked)}
              disabled={userRole !== 'superadmin'}
              className="w-4 h-4"
            />
            <span className="text-contentColor dark:text-contentColor-dark">
              Save as Published
              {userRole !== 'superadmin' && (
                <span className="ml-2 text-xs text-contentColor/70 dark:text-contentColor-dark/70">
                  (Superadmin only)
                </span>
              )}
            </span>
          </label>
        </div>

        {errors.general && (
          <ErrorDisplay error={errors.general} type="inline" variant="error" className="mb-25px" />
        )}

        <div className="flex gap-15px">
          <button
            type="button"
            onClick={() => onSave(saveAsPublish ? 'published' : 'draft')}
            disabled={loading}
            className={`px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              loading ? 'cursor-wait' : ''
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-whiteColor"
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
                {isEditMode ? 'Updating...' : 'Creating...'}
              </span>
            ) : (
              isEditMode ? 'Update Class' : 'Create Class'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Wizard Component
export default function CreateClassWizard({ editId = null, isEditMode = false }) {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || 'superadmin';
  const userOrgId = user?.orgId;

  // Mutations for create/update (without default alerts since we handle them in handleSave)
  const createCohort = useCreateCohort({
    onSuccess: () => {
      // Alert handled in handleSave
    },
    onError: () => {
      // Error handled in handleSave
    },
  });
  const updateCohort = useUpdateCohort({
    onSuccess: () => {
      // Alert handled in handleSave
    },
    onError: () => {
      // Error handled in handleSave
    },
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [orgId, setOrgId] = useState(userRole === 'admin' ? userOrgId : '');
  const [organization, setOrganization] = useState(null);
  const [formData, setFormData] = useState({
    org_id: userRole === 'admin' ? userOrgId : '',
    level: '',
    program_node_id: '',
    term_id: null,
    section_id: '',
    session_id: '',
    elective_group_ids: [],
    subject_ids: [],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingCohort, setLoadingCohort] = useState(isEditMode);
  const [cohortCodePreview, setCohortCodePreview] = useState('');

  // Generate cohort code preview
  useEffect(() => {
    if (formData.org_id && formData.level && formData.program_node_id && formData.section_id && formData.session_id) {
      // Fetch program node, section, and session details for code generation
      Promise.all([
        fetch(`/api/program-nodes/${formData.program_node_id}?orgId=${formData.org_id}`, { credentials: 'include' })
          .then(async (r) => {
            if (!r.ok && process.env.NODE_ENV !== 'production') {
              console.error('[DEV] Program node details fetch failed', { status: r.status, statusText: r.statusText });
            }
            return r.json().catch((e) => {
              if (process.env.NODE_ENV !== 'production') {
                console.error('[DEV] Program node details JSON parse error', e);
              }
              return {};
            });
          }),
        fetch(`/api/sections?orgId=${formData.org_id}`, { credentials: 'include' })
          .then(async (r) => {
            if (!r.ok && process.env.NODE_ENV !== 'production') {
              console.error('[DEV] Sections fetch failed', { status: r.status, statusText: r.statusText });
            }
            return r.json().catch((e) => {
              if (process.env.NODE_ENV !== 'production') {
                console.error('[DEV] Sections JSON parse error', e);
              }
              return {};
            });
          }),
        fetch(`/api/academic-sessions?orgId=${formData.org_id}`, { credentials: 'include' })
          .then(async (r) => {
            if (!r.ok && process.env.NODE_ENV !== 'production') {
              console.error('[DEV] Academic sessions fetch failed', { status: r.status, statusText: r.statusText });
            }
            return r.json().catch((e) => {
              if (process.env.NODE_ENV !== 'production') {
                console.error('[DEV] Academic sessions JSON parse error', e);
              }
              return {};
            });
          }),
      ])
        .then(([nodeData, sectionsData, sessionsData]) => {
          const node = nodeData.success ? nodeData.node : null;
          const section = sectionsData.success ? sectionsData.sections.find((s) => s.id === formData.section_id) : null;
          const session = sessionsData.success ? sessionsData.sessions.find((s) => s.id === formData.session_id) : null;

          if (node && section && session) {
            // Generate code: Level-ProgramCode-Section-SessionCode
            // Format matches server-side generation pattern
            const levelCode = formData.level.toUpperCase().substring(0, 1);
            const programCode = node.code;
            const sectionCode = section.label;
            const sessionCode = session.code;
            setCohortCodePreview(`${levelCode}-${programCode}-${sectionCode}-${sessionCode}`);
          } else {
            setCohortCodePreview('');
          }
        })
        .catch((err) => {
          if (process.env.NODE_ENV !== 'production') {
            console.error('[DEV] Cohort code preview generation failed', err);
          }
          // Fallback to simplified preview
          const levelCode = formData.level.toUpperCase().substring(0, 1);
          setCohortCodePreview(`${levelCode}-XXXX-A-2025-26`);
        });
    } else {
      setCohortCodePreview('');
    }
  }, [formData.org_id, formData.level, formData.program_node_id, formData.section_id, formData.session_id]);

  // Fetch cohort data for edit mode using React Query
  const { data: cohortData, isLoading: isLoadingCohort, error: cohortError } = useCohort(
    editId,
    { enabled: isEditMode && !!editId }
  );

  // Fetch organization when cohort is loaded
  const { data: orgData } = useOrganization(
    cohortData?.cohort?.org_id,
    { enabled: isEditMode && !!cohortData?.cohort?.org_id }
  );

  // Handle cohort data when loaded - use ref to prevent duplicate processing
  const cohortProcessedRef = useRef(false);
  useEffect(() => {
    if (!isEditMode || !cohortData?.cohort) {
      cohortProcessedRef.current = false;
      return;
    }

    // Prevent processing the same cohort data multiple times
    const cohortId = cohortData.cohort.id;
    if (cohortProcessedRef.current === cohortId) return;
    cohortProcessedRef.current = cohortId;

    const cohort = cohortData.cohort;
    
    // Set organization
    if (cohort.org_id) {
      setOrgId(cohort.org_id);
      if (orgData?.organization) {
        setOrganization(orgData.organization);
      }
    }

    // Populate form data
    setFormData((prev) => ({
      ...prev,
      org_id: cohort.org_id || prev.org_id,
      level: cohort.level || '',
      program_node_id: cohort.program_node_id || '',
      term_id: cohort.term_id || null,
      section_id: cohort.section_id || '',
      session_id: cohort.session_id || '',
      subject_ids: Array.isArray(cohort.subject_ids) ? cohort.subject_ids : [],
      elective_group_ids: Array.isArray(cohort.elective_group_ids) ? cohort.elective_group_ids : [],
    }));

    // Set code preview
    if (cohort.code) {
      setCohortCodePreview(cohort.code);
    }

    createAlert('success', 'Class data loaded successfully');
  }, [isEditMode, cohortData?.cohort?.id, orgData?.organization?.id]); // Only depend on IDs, not entire objects

  // Handle cohort loading state
  useEffect(() => {
    setLoadingCohort(isLoadingCohort);
  }, [isLoadingCohort]);

  // Handle cohort error - use ref to prevent duplicate error handling
  const errorHandledRef = useRef(false);
  useEffect(() => {
    if (cohortError && isEditMode && !errorHandledRef.current) {
      errorHandledRef.current = true;
      console.error('Error fetching cohort data:', cohortError);
      createAlert('error', cohortError.message || 'Failed to load class data');
      // Navigate back on error
      setTimeout(() => {
        router.push('/dashboards/superadmin-classes-subjects/classes');
      }, 2000);
    } else if (!cohortError) {
      errorHandledRef.current = false; // Reset when error clears
    }
  }, [cohortError?.message, isEditMode]); // Only depend on error message, not entire error object

  // Update formData.org_id when orgId changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, org_id: orgId }));
  }, [orgId]);

  // Validate current step
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 0) {
      if (!orgId) {
        newErrors.org_id = 'Organization is required';
      }
    }

    if (step === 1) {
      if (!formData.level) newErrors.level = 'Academic level is required';
      if (!formData.program_node_id) newErrors.program_node_id = 'Program node is required';
      if (!formData.section_id) newErrors.section_id = 'Section is required';
      if (!formData.session_id) newErrors.session_id = 'Academic session is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      createAlert('error', 'Please fill in all required fields');
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Check if cohort exists using React Query
  const cohortExistsParams = formData.org_id && formData.program_node_id && formData.section_id && formData.session_id
    ? {
        orgId: formData.org_id,
        program_node_id: formData.program_node_id,
        section_id: formData.section_id,
        session_id: formData.session_id,
        term_id: formData.term_id || '',
      }
    : {};

  const { data: existsData } = useCohortExists(
    cohortExistsParams,
    { enabled: !isEditMode && Object.keys(cohortExistsParams).length > 0 }
  );

  const checkCohortExists = async () => {
    if (!formData.org_id || !formData.program_node_id || !formData.section_id || !formData.session_id) {
      return false;
    }

    try {
      const response = await apiClient.get(
        getEndpoint('cohorts.exists'),
        cohortExistsParams
      );
      return response.exists || false;
    } catch (error) {
      console.error('Error checking cohort existence:', error);
      return false;
    }
  };

  // Handle save (create or update)
  const handleSave = async (status = 'draft') => {
    // Final validation
    const validation = validateForm(cohortCreateSchema, {
      org_id: orgId,
      level: formData.level,
      program_node_id: formData.program_node_id,
      term_id: formData.term_id || null,
      section_id: formData.section_id,
      session_id: formData.session_id,
      // Use preview if available; otherwise pass a placeholder so schema passes.
      code: cohortCodePreview || 'AUTO-GENERATE',
      created_by: user?.id || '',
      created_by_role: userRole,
      status,
      // code will be auto-generated server-side if not provided
    });

    if (!validation.success) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[DEV] ${isEditMode ? 'Update' : 'Create'} Class: client validation failed`, {
          dataAttempted: {
            org_id: orgId,
            level: formData.level,
            program_node_id: formData.program_node_id,
            term_id: formData.term_id || null,
            section_id: formData.section_id,
            session_id: formData.session_id,
            status,
          },
          errors: validation.errors,
        });
      }
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      createAlert('error', firstError || 'Please fix the validation errors');
      return;
    }

    // Check for duplicates (only for create mode)
    if (!isEditMode) {
      const exists = await checkCohortExists();
      if (exists) {
        const result = await Swal.fire({
          title: 'Duplicate Class',
          text: 'A class with this combination already exists. Do you want to continue?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Continue',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
        });
        if (!result.isConfirmed) return;
      }
    }

    setLoading(true);
    setErrors({});

    try {
      // Include subject_ids in the request
      const requestBody = {
        ...validation.data,
        subject_ids: Array.isArray(formData.subject_ids) ? formData.subject_ids : [],
        elective_group_ids: Array.isArray(formData.elective_group_ids) ? formData.elective_group_ids : [],
      };

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] ${isEditMode ? 'Update' : 'Create'} Class: sending request`, {
          body: requestBody,
          subjectCount: requestBody.subject_ids?.length || 0,
        });
      }

      let result;
      if (isEditMode) {
        result = await updateCohort.mutateAsync({
          id: editId,
          data: requestBody,
          params: { orgId },
        });
      } else {
        result = await createCohort.mutateAsync({
          data: requestBody,
          params: { orgId },
        });
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] ${isEditMode ? 'Update' : 'Create'} Class: success`, result);
      }
      
      // Redirect to classes list with orgId query parameter
      const redirectUrl = orgId 
        ? `/dashboards/superadmin-classes-subjects/classes?orgId=${orgId}`
        : '/dashboards/superadmin-classes-subjects/classes';
      router.push(redirectUrl);
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} class:`, error);
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[DEV] ${isEditMode ? 'Update' : 'Create'} Class: exception thrown`, {
          message: error?.message,
          stack: error?.stack,
        });
      }
      // Error is already handled by mutation hooks, but set local errors if provided
      if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ general: error.message || 'An error occurred' });
      }
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: 'Organization', component: Step0Organization },
    { title: 'Structure', component: Step1Structure },
    { title: 'Subjects', component: Step2Subjects },
    { title: 'Review', component: Step3Review },
  ];

  const CurrentStepComponent = steps[currentStep].component;

  // Show loading state while fetching cohort data in edit mode
  if (loadingCohort) {
    return (
      <div className="pb-100px">
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px text-center">
          <div className="flex flex-col items-center justify-center py-60px">
            <svg
              className="animate-spin h-12 w-12 text-primaryColor mb-20px"
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
            <p className="text-contentColor dark:text-contentColor-dark text-size-16 font-medium">
              Loading class data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-100px">
      {/* Step Indicator */}
      <div className="mb-30px">
        <div className="flex items-center justify-between mb-20px">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-bold select-none ${
                    index === currentStep
                      ? 'bg-primaryColor text-whiteColor'
                      : index < currentStep
                      ? 'bg-primaryColor/80 text-whiteColor'
                      : 'bg-gray-300 dark:bg-gray-700 text-blackColor dark:text-whiteColor-dark'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="mt-6px text-xs text-contentColor dark:text-contentColor-dark text-center">
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-3px flex-1 mx-12px rounded-full ${
                    index < currentStep ? 'bg-primaryColor/80' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <div className="mb-30px">
        <CurrentStepComponent
          orgId={orgId}
          setOrgId={setOrgId}
          organization={organization}
          setOrganization={setOrganization}
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          userRole={userRole}
          cohortCodePreview={cohortCodePreview}
          onSave={handleSave}
          loading={loading || loadingCohort}
          isEditMode={isEditMode}
        />
      </div>

      {/* Navigation Footer (Sticky) */}
      <div className="sticky bottom-0 bg-whiteColor dark:bg-whiteColor-dark border-t border-borderColor dark:border-borderColor-dark p-20px -mx-25px md:-mx-30px shadow-lg z-10">
        <div className="flex flex-col sm:flex-row gap-15px justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="px-25px py-10px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <div className="flex gap-15px">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrevious}
                disabled={loading}
                className="px-25px py-10px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

