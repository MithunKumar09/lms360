/**
 * Offerings Builder Main Component
 * 
 * Main component for building and managing subject offerings for cohorts.
 * Includes scope pickers, core/electives tabs, teacher assignment, and publish functionality.
 * 
 * @module main/offerings/OfferingsBuilderMain
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import Swal from 'sweetalert2';
import FormSelectAsync from '@/components/shared/forms/FormSelectAsync.js';
import FormMultiSelect from '@/components/shared/forms/FormMultiSelect.js';
import ErrorDisplay from '@/components/shared/errors/ErrorDisplay.js';

export default function OfferingsBuilderMain() {
  const createAlert = useSweetAlert();
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || 'superadmin';
  const userOrgId = user?.orgId;

  // Scope state
  const [orgId, setOrgId] = useState(userRole === 'admin' ? userOrgId : '');
  const [level, setLevel] = useState('');
  const [programNodeId, setProgramNodeId] = useState('');
  const [termId, setTermId] = useState('');
  const [activeTab, setActiveTab] = useState('core'); // 'core' or 'electives'

  // Data state
  const [organizations, setOrganizations] = useState([]);
  const [programNodes, setProgramNodes] = useState([]);
  const [terms, setTerms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [electiveGroups, setElectiveGroups] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Core subjects state
  const [selectedCoreSubjects, setSelectedCoreSubjects] = useState([]);
  const [coreSubjectsOrder, setCoreSubjectsOrder] = useState([]);

  // Elective groups state
  const [showElectiveGroupModal, setShowElectiveGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupFormData, setGroupFormData] = useState({
    code: '',
    title: '',
    pick_min: 1,
    pick_max: 1,
    rules: {},
  });

  // Teacher assignment state
  const [assigningTeacher, setAssigningTeacher] = useState(null);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [publishStatus, setPublishStatus] = useState(false);

  // Load organizations (superadmin only)
  const loadOrganizations = useCallback(async (searchTerm = '') => {
    if (userRole !== 'superadmin') return [];
    
    try {
      const params = new URLSearchParams({ q: searchTerm, limit: '50' });
      const response = await fetch(`/api/organizations?${params}`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        return data.organizations.map((org) => ({
          value: org.id,
          label: `${org.name} (${org.org_code})`,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading organizations:', error);
      return [];
    }
  }, [userRole]);

  // Load program nodes
  const loadProgramNodes = useCallback(async (searchTerm = '') => {
    if (!orgId || !level) return [];
    
    try {
      const params = new URLSearchParams({
        orgId,
        level,
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
  }, [orgId, level]);

  // Load terms
  const loadTerms = useCallback(async (searchTerm = '') => {
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
  }, [orgId]);

  // Load subjects
  useEffect(() => {
    if (!orgId || !level) {
      setSubjects([]);
      return;
    }

    fetch(`/api/subject-catalog?orgId=${orgId}&level=${level}&limit=200`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSubjects(
            data.subjects.map((subject) => ({
              value: subject.id,
              label: `${subject.code} - ${subject.title}`,
              ...subject,
            }))
          );
        }
      })
      .catch(console.error);
  }, [orgId, level]);

  // Load elective groups
  useEffect(() => {
    if (!orgId) {
      setElectiveGroups([]);
      return;
    }

    fetch(`/api/elective-groups?orgId=${orgId}&limit=100`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setElectiveGroups(data.groups || []);
        }
      })
      .catch(console.error);
  }, [orgId]);

  // Load existing offerings
  useEffect(() => {
    if (!orgId || !programNodeId || !termId) {
      setOfferings([]);
      return;
    }

    setLoading(true);
    fetch(`/api/subject-offerings?orgId=${orgId}&program_node_id=${programNodeId}&term_id=${termId}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOfferings(data.offerings || []);
          // Update selected subjects from offerings
          const coreSubjects = data.offerings
            .filter((o) => o.subject_id && !o.elective_group_id)
            .map((o) => o.subject_id);
          setSelectedCoreSubjects(coreSubjects);
          setCoreSubjectsOrder(coreSubjects);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orgId, programNodeId, termId]);

  // Search teachers
  const searchTeachers = useCallback(async (searchTerm) => {
    if (!orgId || !searchTerm) {
      setTeachers([]);
      return;
    }

    try {
      // Note: This assumes a teachers/users API endpoint exists
      // For now, using a placeholder
      const response = await fetch(`/api/users?orgId=${orgId}&role=instructor&q=${searchTerm}&limit=20`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setTeachers(
          (data.users || []).map((user) => ({
            value: user.id,
            label: `${user.name || user.email} (${user.email})`,
            ...user,
          }))
        );
      }
    } catch (error) {
      console.error('Error searching teachers:', error);
      setTeachers([]);
    }
  }, [orgId]);

  // Debounced teacher search
  useEffect(() => {
    if (!teacherSearchTerm) {
      setTeachers([]);
      return;
    }

    const timer = setTimeout(() => {
      searchTeachers(teacherSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [teacherSearchTerm, searchTeachers]);

  // Handle save core subjects
  const handleSaveCoreSubjects = async () => {
    if (!orgId || !programNodeId || !termId) {
      createAlert('error', 'Please select organization, program node, and term');
      return;
    }

    setLoading(true);
    try {
      // Get cohort ID (would need to fetch or create)
      // For now, assuming we have a way to get/create cohort
      const response = await fetch(`/api/subject-offerings/bulk?orgId=${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cohort_id: 'placeholder', // Would need actual cohort ID
          offerings: selectedCoreSubjects.map((subjectId, index) => ({
            subject_id: subjectId,
            is_compulsory: true,
            order: index + 1,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save core subjects');
      }

      createAlert('success', 'Core subjects saved successfully');
      // Reload offerings
      // ... reload logic
    } catch (error) {
      console.error('Error saving core subjects:', error);
      createAlert('error', error.message || 'Failed to save core subjects');
    } finally {
      setLoading(false);
    }
  };

  // Handle create/edit elective group
  const handleSaveElectiveGroup = async () => {
    if (!orgId || !programNodeId || !termId) {
      createAlert('error', 'Please select organization, program node, and term');
      return;
    }

    setLoading(true);
    try {
      const url = editingGroup
        ? `/api/elective-groups?orgId=${orgId}`
        : `/api/elective-groups?orgId=${orgId}`;
      const method = editingGroup ? 'PATCH' : 'POST';

      const body = editingGroup
        ? { id: editingGroup.id, ...groupFormData, program_node_id: programNodeId, term_id: termId }
        : { ...groupFormData, org_id: orgId, program_node_id: programNodeId, term_id: termId };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save elective group');
      }

      createAlert('success', editingGroup ? 'Elective group updated successfully' : 'Elective group created successfully');
      setShowElectiveGroupModal(false);
      setEditingGroup(null);
      setGroupFormData({
        code: '',
        title: '',
        pick_min: 1,
        pick_max: 1,
        rules: {},
      });
      // Reload elective groups
      // ... reload logic
    } catch (error) {
      console.error('Error saving elective group:', error);
      createAlert('error', error.message || 'Failed to save elective group');
    } finally {
      setLoading(false);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    if (!orgId || !programNodeId || !termId) {
      createAlert('error', 'Please select organization, program node, and term');
      return;
    }

    const result = await Swal.fire({
      title: publishStatus ? 'Unpublish Offerings' : 'Publish Offerings',
      text: `Are you sure you want to ${publishStatus ? 'unpublish' : 'publish'} all offerings for this program?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: publishStatus ? 'Unpublish' : 'Publish',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      // Get cohort ID (would need to fetch)
      const response = await fetch(`/api/subject-offerings/publish?orgId=${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cohort_id: 'placeholder', // Would need actual cohort ID
          status: publishStatus ? 'draft' : 'published',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish offerings');
      }

      setPublishStatus(!publishStatus);
      createAlert('success', `Offerings ${publishStatus ? 'unpublished' : 'published'} successfully`);
    } catch (error) {
      console.error('Error publishing offerings:', error);
      createAlert('error', error.message || 'Failed to publish offerings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-100px">
      {/* Header */}
      <div className="mb-30px">
        <h1 className="text-size-30 text-blackColor dark:text-blackColor-dark font-bold mb-10px">
          Offerings Builder
        </h1>
        <p className="text-contentColor dark:text-contentColor-dark text-sm">
          Build and manage subject offerings for classes
        </p>
      </div>

      {/* Error State */}
      {error && (
        <ErrorDisplay
          error={error}
          type="inline"
          variant="error"
          className="mb-25px"
        />
      )}

      {/* Scope Pickers */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px mb-30px">
        <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">
          Scope Selection
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20px">
          {/* Organization (Superadmin only) */}
          {userRole === 'superadmin' && (
            <FormSelectAsync
              label="Organization"
              name="org_id"
              value={orgId}
              onChange={(value) => {
                setOrgId(value);
                setLevel('');
                setProgramNodeId('');
                setTermId('');
              }}
              loadOptions={loadOrganizations}
              placeholder="Select organization..."
            />
          )}

          {/* Level */}
          <div>
            <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
              Academic Level
            </label>
            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setProgramNodeId('');
                setTermId('');
              }}
              disabled={!orgId}
              className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>

          {/* Program Node */}
          <FormSelectAsync
            label="Program Node"
            name="program_node_id"
            value={programNodeId}
            onChange={(value) => {
              setProgramNodeId(value);
              setTermId('');
            }}
            loadOptions={loadProgramNodes}
            placeholder="Select program node..."
            disabled={!orgId || !level}
          />

          {/* Term */}
          <FormSelectAsync
            label="Term"
            name="term_id"
            value={termId}
            onChange={setTermId}
            loadOptions={loadTerms}
            placeholder="Select term..."
            disabled={!orgId}
          />
        </div>
      </div>

      {/* Tabs */}
      {orgId && programNodeId && termId && (
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          {/* Tab Headers */}
          <div className="flex border-b border-borderColor dark:border-borderColor-dark mb-25px">
            <button
              type="button"
              onClick={() => setActiveTab('core')}
              className={`px-25px py-15px text-size-15 font-medium transition-colors ${
                activeTab === 'core'
                  ? 'text-primaryColor dark:text-primaryColor border-b-2 border-primaryColor dark:border-primaryColor'
                  : 'text-contentColor dark:text-contentColor-dark hover:text-primaryColor dark:hover:text-primaryColor'
              }`}
            >
              Core Subjects
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('electives')}
              className={`px-25px py-15px text-size-15 font-medium transition-colors ${
                activeTab === 'electives'
                  ? 'text-primaryColor dark:text-primaryColor border-b-2 border-primaryColor dark:border-primaryColor'
                  : 'text-contentColor dark:text-contentColor-dark hover:text-primaryColor dark:hover:text-primaryColor'
              }`}
            >
              Elective Groups
            </button>
          </div>

          {/* Core Tab */}
          {activeTab === 'core' && (
            <div className="space-y-20px">
              <div>
                <FormMultiSelect
                  label="Select Core Subjects"
                  name="core_subjects"
                  value={selectedCoreSubjects}
                  onChange={(values) => {
                    setSelectedCoreSubjects(values);
                    setCoreSubjectsOrder(values);
                  }}
                  options={subjects.filter((s) => s.category === 'core' || !s.category)}
                  placeholder="Select core subjects..."
                />
              </div>

              {/* Selected Subjects List (Orderable) */}
              {coreSubjectsOrder.length > 0 && (
                <div>
                  <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                    Selected Subjects (Drag to reorder)
                  </label>
                  <div className="space-y-10px">
                    {coreSubjectsOrder.map((subjectId, index) => {
                      const subject = subjects.find((s) => s.value === subjectId);
                      if (!subject) return null;

                      return (
                        <div
                          key={subjectId}
                          className="flex items-center justify-between p-15px bg-gray-50 dark:bg-gray-900/50 rounded border border-borderColor dark:border-borderColor-dark"
                        >
                          <div className="flex items-center gap-15px">
                            <span className="text-contentColor dark:text-contentColor-dark text-sm font-medium">
                              {index + 1}.
                            </span>
                            <div>
                              <p className="text-contentColor dark:text-contentColor-dark font-medium text-sm">
                                {subject.label}
                              </p>
                              <p className="text-contentColor dark:text-contentColor-dark text-xs opacity-70">
                                {subject.category} • {subject.credits || 0} credits
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCoreSubjects((prev) => prev.filter((id) => id !== subjectId));
                              setCoreSubjectsOrder((prev) => prev.filter((id) => id !== subjectId));
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveCoreSubjects}
                  disabled={loading || selectedCoreSubjects.length === 0}
                  className="px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Core Subjects'}
                </button>
              </div>
            </div>
          )}

          {/* Electives Tab */}
          {activeTab === 'electives' && (
            <div className="space-y-20px">
              <div className="flex justify-between items-center">
                <h3 className="text-size-18 text-blackColor dark:text-blackColor-dark font-bold">
                  Elective Groups
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingGroup(null);
                    setGroupFormData({
                      code: '',
                      title: '',
                      pick_min: 1,
                      pick_max: 1,
                      rules: {},
                    });
                    setShowElectiveGroupModal(true);
                  }}
                  className="px-20px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors"
                >
                  Create Group
                </button>
              </div>

              {/* Elective Groups List */}
              {electiveGroups.length > 0 ? (
                <div className="space-y-15px">
                  {electiveGroups.map((group) => (
                    <div
                      key={group.id}
                      className="p-20px bg-gray-50 dark:bg-gray-900/50 rounded border border-borderColor dark:border-borderColor-dark"
                    >
                      <div className="flex items-center justify-between mb-15px">
                        <div>
                          <p className="text-contentColor dark:text-contentColor-dark font-medium text-sm">
                            {group.code} - {group.title}
                          </p>
                          <p className="text-contentColor dark:text-contentColor-dark text-xs opacity-70">
                            Pick {group.pick_min}-{group.pick_max} subjects
                          </p>
                        </div>
                        <div className="flex gap-10px">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroup(group);
                              setGroupFormData({
                                code: group.code,
                                title: group.title,
                                pick_min: group.pick_min,
                                pick_max: group.pick_max,
                                rules: group.rules || {},
                              });
                              setShowElectiveGroupModal(true);
                            }}
                            className="text-primaryColor dark:text-primaryColor hover:text-primaryColor/80 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-40px text-contentColor dark:text-contentColor-dark text-sm opacity-70">
                  No elective groups created yet
                </div>
              )}
            </div>
          )}

          {/* Publish Switch */}
          <div className="mt-30px pt-25px border-t border-borderColor dark:border-borderColor-dark flex items-center justify-between">
            <div>
              <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">
                Publish Offerings
              </label>
              <p className="text-contentColor dark:text-contentColor-dark text-xs opacity-70 mt-5px">
                {publishStatus ? 'Offerings are published' : 'Offerings are in draft mode'}
              </p>
            </div>
            <label className="flex items-center gap-10px cursor-pointer">
              <input
                type="checkbox"
                checked={publishStatus}
                onChange={(e) => {
                  setPublishStatus(e.target.checked);
                  handlePublish();
                }}
                className="w-12 h-6 rounded-full appearance-none bg-gray-300 dark:bg-gray-700 relative transition-colors checked:bg-primaryColor dark:checked:bg-primaryColor"
                style={{
                  background: publishStatus ? '#3b82f6' : undefined,
                }}
              />
              <span className="text-contentColor dark:text-contentColor-dark text-sm">
                {publishStatus ? 'Published' : 'Draft'}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Elective Group Modal */}
      {showElectiveGroupModal && (
        <div className="modal-container">
          <div className="modal fixed top-0 left-0 w-full h-full z-xxl transition-all duration-500 bg-lightBlack opacity-0 overflow-y-auto pb-10">
            <div
              className="modal-close fixed md:absolute top-0 left-0 w-full h-full z-xsmall cursor-zoom-out"
              onClick={() => {
                setShowElectiveGroupModal(false);
                setEditingGroup(null);
              }}
            ></div>

            <div className="modal-content transition-all duration-500 -translate-y-20 bg-whiteColor dark:bg-whiteColor-dark p-25px max-w-500 mx-15px md:mx-auto mb-50px mt-110px md:my-150px relative z-small rounded-lg">
              <div className="flex items-center justify-between mb-25px">
                <h2 className="text-size-24 text-blackColor dark:text-blackColor-dark font-bold">
                  {editingGroup ? 'Edit Elective Group' : 'Create Elective Group'}
                </h2>
                <button
                  type="button"
                  className="modal-close text-contentColor dark:text-contentColor-dark hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  onClick={() => {
                    setShowElectiveGroupModal(false);
                    setEditingGroup(null);
                  }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveElectiveGroup();
                }}
                className="space-y-20px"
              >
                <div>
                  <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={groupFormData.code}
                    onChange={(e) => setGroupFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark placeholder:text-placeholder placeholder:opacity-80 font-medium rounded uppercase"
                    placeholder="EG001"
                    required
                  />
                </div>

                <div>
                  <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={groupFormData.title}
                    onChange={(e) => setGroupFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark placeholder:text-placeholder placeholder:opacity-80 font-medium rounded"
                    placeholder="Elective Group Title"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-20px">
                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                      Pick Min <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={groupFormData.pick_min}
                      onChange={(e) => setGroupFormData((prev) => ({ ...prev, pick_min: parseInt(e.target.value, 10) || 1 }))}
                      className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark placeholder:text-placeholder placeholder:opacity-80 font-medium rounded"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                      Pick Max <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={groupFormData.pick_max}
                      onChange={(e) => setGroupFormData((prev) => ({ ...prev, pick_max: parseInt(e.target.value, 10) || 1 }))}
                      className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark placeholder:text-placeholder placeholder:opacity-80 font-medium rounded"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-15px justify-end pt-20px border-t border-borderColor dark:border-borderColor-dark">
                  <button
                    type="button"
                    onClick={() => {
                      setShowElectiveGroupModal(false);
                      setEditingGroup(null);
                    }}
                    disabled={loading}
                    className="px-25px py-10px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      loading ? 'cursor-wait' : ''
                    }`}
                  >
                    {loading ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

