/**
 * Class Details Modal Component
 * 
 * Right-side slide-in modal for displaying class (cohort) details with tabs.
 * 
 * @module classes/ClassDetailsModal
 */

'use client';

import { useState, useEffect } from 'react';
import useSweetAlert from '@/hooks/useSweetAlert';
import Swal from 'sweetalert2';

/**
 * Class Details Modal Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.cohort - Cohort data
 * @param {string} props.orgId - Organization ID
 * @param {string} props.userRole - User role
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onRefresh - Refresh handler
 */
export default function ClassDetailsModal({
  cohort,
  orgId,
  userRole,
  onClose,
  onEdit,
  onRefresh,
}) {
  const createAlert = useSweetAlert();
  const [activeTab, setActiveTab] = useState('summary');
  // Normalize cohort shape (API often returns flattened join columns)
  const normalizeCohort = (c) => {
    if (!c || typeof c !== 'object') return c;
    return {
      ...c,
      program_node: c.program_node || (c.program_node_title || c.program_node_code
        ? { title: c.program_node_title, code: c.program_node_code, type: c.program_node_type }
        : undefined),
      section: c.section || (c.section_label ? { label: c.section_label, capacity: c.section_capacity, room: c.section_room } : undefined),
      term: c.term || (c.term_label ? { label: c.term_label, term_type: c.term_type } : undefined),
      session: c.session || (c.session_code ? { code: c.session_code, start_date: c.session_start_date, end_date: c.session_end_date } : undefined),
    };
  };
  const [cohortDetails, setCohortDetails] = useState(normalizeCohort(cohort));
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Fetch full cohort details
  useEffect(() => {
    if (!cohort?.id) return;

    setLoading(true);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] ClassDetailsModal: fetching cohort details', { cohortId: cohort.id, orgId });
    }
    fetch(`/api/cohorts/${cohort.id}?orgId=${orgId}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCohortDetails(normalizeCohort(data.cohort));
        } else if (process.env.NODE_ENV !== 'production') {
          console.error('[DEV] ClassDetailsModal: cohort details response error', data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cohort?.id, orgId]);

  // Fetch subjects
  useEffect(() => {
    if (!cohort?.id) return;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] ClassDetailsModal: fetching subject offerings', { cohortId: cohort.id, orgId });
    }
    fetch(`/api/subject-offerings?cohort_id=${cohort.id}&orgId=${orgId}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSubjects(data.offerings || []);
        } else if (process.env.NODE_ENV !== 'production') {
          console.error('[DEV] ClassDetailsModal: subject offerings response error', data);
        }
      })
      .catch(console.error);
  }, [cohort?.id, orgId]);

  // Fetch teachers
  useEffect(() => {
    if (!cohort?.id) return;

    fetch(`/api/teacher-assignments?cohort_id=${cohort.id}&orgId=${orgId}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTeachers(data.assignments || []);
        }
      })
      .catch(console.error);
  }, [cohort?.id, orgId]);

  // Fetch audit logs
  useEffect(() => {
    if (!cohort?.id) return;

    // Note: Audit logs endpoint would need to be created
    // For now, placeholder
    setAuditLogs([]);
  }, [cohort?.id]);

  // Handle publish
  const handlePublish = async () => {
    const result = await Swal.fire({
      title: cohortDetails.status === 'published' ? 'Unpublish Class' : 'Publish Class',
      text: `Are you sure you want to ${cohortDetails.status === 'published' ? 'unpublish' : 'publish'} this class?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: cohortDetails.status === 'published' ? 'Unpublish' : 'Publish',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`/api/cohorts/${cohort.id}/${cohortDetails.status === 'published' ? 'archive' : 'publish'}?orgId=${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish class');
      }

      createAlert('success', `Class ${cohortDetails.status === 'published' ? 'unpublished' : 'published'} successfully`);
      if (onRefresh) onRefresh();
      // Update local state
      setCohortDetails((prev) => ({
        ...prev,
        status: prev.status === 'published' ? 'draft' : 'published',
      }));
    } catch (error) {
      console.error('Error publishing class:', error);
      createAlert('error', error.message || 'Failed to publish class');
    }
  };

  // Handle archive
  const handleArchive = async () => {
    const result = await Swal.fire({
      title: cohortDetails.status === 'archived' ? 'Unarchive Class' : 'Archive Class',
      text: `Are you sure you want to ${cohortDetails.status === 'archived' ? 'unarchive' : 'archive'} this class?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: cohortDetails.status === 'archived' ? 'Unarchive' : 'Archive',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`/api/cohorts/${cohort.id}/${cohortDetails.status === 'archived' ? 'publish' : 'archive'}?orgId=${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive class');
      }

      createAlert('success', `Class ${cohortDetails.status === 'archived' ? 'unarchived' : 'archived'} successfully`);
      if (onRefresh) onRefresh();
      // Update local state
      setCohortDetails((prev) => ({
        ...prev,
        status: prev.status === 'archived' ? 'draft' : 'archived',
      }));
    } catch (error) {
      console.error('Error archiving class:', error);
      createAlert('error', error.message || 'Failed to archive class');
    }
  };

  // Check if field is locked
  const isFieldLocked = (field) => {
    const lf = cohortDetails?.locked_fields;
    if (!lf || userRole !== 'admin') return false;
    if (Array.isArray(lf)) return lf.includes(field);
    if (typeof lf === 'object') return Boolean(lf[field]);
    return false;
  };

  const lockedCount = (() => {
    const lf = cohortDetails?.locked_fields;
    if (!lf) return 0;
    if (Array.isArray(lf)) return lf.length;
    if (typeof lf === 'object') return Object.keys(lf).length;
    return 0;
  })();

  if (!cohortDetails) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Panel (Right-side slide-in) */}
      <div className="fixed top-0 right-0 h-full w-full md:w-96 lg:w-[500px] bg-whiteColor dark:bg-whiteColor-dark shadow-2xl z-50 transform translate-x-0 transition-transform duration-300 ease-in-out overflow-y-auto animate-slideInRight">
        {/* Header */}
        <div className="sticky top-0 bg-whiteColor dark:bg-whiteColor-dark border-b border-borderColor dark:border-borderColor-dark p-20px flex items-center justify-between z-10">
          <div>
            <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold">
              Class Details
            </h2>
            <p className="text-contentColor dark:text-contentColor-dark text-xs mt-5px">
              {cohortDetails.code}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-contentColor dark:text-contentColor-dark hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status Badge */}
        <div className="p-20px border-b border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center justify-between">
            <span
              className={`inline-block px-10px py-5px text-xs font-medium rounded ${
                cohortDetails.status === 'published'
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                  : cohortDetails.status === 'archived'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'
                  : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
              }`}
            >
              {cohortDetails.status?.charAt(0).toUpperCase() + cohortDetails.status?.slice(1) || 'Draft'}
            </span>
            {lockedCount > 0 && (
              <div className="flex items-center gap-5px text-xs text-contentColor dark:text-contentColor-dark opacity-70">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>{lockedCount} field(s) locked</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-borderColor dark:border-borderColor-dark">
          <div className="flex">
            {['summary', 'subjects', 'teachers', 'audit'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-15px py-15px text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-primaryColor dark:text-primaryColor border-b-2 border-primaryColor dark:border-primaryColor'
                    : 'text-contentColor dark:text-contentColor-dark hover:text-primaryColor dark:hover:text-primaryColor'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-20px">
          {loading ? (
            <div className="text-center py-40px">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primaryColor dark:border-primaryColor"></div>
            </div>
          ) : (
            <>
              {/* Summary Tab */}
              {activeTab === 'summary' && (
                <div className="space-y-20px">
                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark text-xs font-medium opacity-70">
                      Code
                    </label>
                    <p className="text-contentColor dark:text-contentColor-dark font-mono font-bold">
                      {cohortDetails.code}
                    </p>
                  </div>

                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark text-xs font-medium opacity-70">
                      Academic Level
                      {isFieldLocked('level') && (
                        <span className="ml-5px text-red-500">
                          <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </span>
                      )}
                    </label>
                    <p className={`text-contentColor dark:text-contentColor-dark ${isFieldLocked('level') ? 'opacity-60' : ''}`}>
                      {cohortDetails.level?.charAt(0).toUpperCase() + cohortDetails.level?.slice(1).replace('_', ' ') || '-'}
                    </p>
                  </div>

                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark text-xs font-medium opacity-70">
                      Program/Combination
                      {isFieldLocked('program_node_id') && (
                        <span className="ml-5px text-red-500">
                          <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </span>
                      )}
                    </label>
                    <p className={`text-contentColor dark:text-contentColor-dark ${isFieldLocked('program_node_id') ? 'opacity-60' : ''}`}>
                      {cohortDetails.program_node?.title || '-'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-15px">
                    <div>
                      <label className="text-contentColor dark:text-contentColor-dark text-xs font-medium opacity-70">
                        Term
                      </label>
                      <p className="text-contentColor dark:text-contentColor-dark">
                        {cohortDetails.term?.label || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-contentColor dark:text-contentColor-dark text-xs font-medium opacity-70">
                        Section
                      </label>
                      <p className="text-contentColor dark:text-contentColor-dark">
                        {cohortDetails.section?.label || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-contentColor dark:text-contentColor-dark text-xs font-medium opacity-70">
                        Session
                      </label>
                      <p className="text-contentColor dark:text-contentColor-dark">
                        {cohortDetails.session?.code || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-contentColor dark:text-contentColor-dark text-xs font-medium opacity-70">
                        Total Subjects
                      </label>
                      <p className="text-contentColor dark:text-contentColor-dark">
                        {cohortDetails.total_subjects || 0}
                      </p>
                    </div>
                  </div>

                  {cohortDetails.created_by && (
                    <div>
                      <label className="text-contentColor dark:text-contentColor-dark text-xs font-medium opacity-70">
                        Created By
                      </label>
                      <p className="text-contentColor dark:text-contentColor-dark">
                        {cohortDetails.created_by_role === 'superadmin' ? 'Superadmin' : 'Admin'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Subjects Tab */}
              {activeTab === 'subjects' && (
                <div className="space-y-15px">
                  {subjects.length > 0 ? (
                    subjects.map((offering) => (
                      <div
                        key={offering.id}
                        className="p-15px bg-gray-50 dark:bg-gray-900/50 rounded border border-borderColor dark:border-borderColor-dark"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-contentColor dark:text-contentColor-dark font-medium text-sm">
                              {offering.subject?.title || offering.elective_group?.title || '-'}
                            </p>
                            <p className="text-contentColor dark:text-contentColor-dark text-xs opacity-70">
                              {offering.subject?.code || offering.elective_group?.code || ''}
                              {offering.is_compulsory && ' • Compulsory'}
                            </p>
                          </div>
                          {offering.teachers && offering.teachers.length > 0 && (
                            <div className="text-xs text-contentColor dark:text-contentColor-dark opacity-70">
                              {offering.teachers.length} teacher(s)
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-40px text-contentColor dark:text-contentColor-dark text-sm opacity-70">
                      No subjects assigned
                    </div>
                  )}
                </div>
              )}

              {/* Teachers Tab */}
              {activeTab === 'teachers' && (
                <div className="space-y-15px">
                  {teachers.length > 0 ? (
                    teachers.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="p-15px bg-gray-50 dark:bg-gray-900/50 rounded border border-borderColor dark:border-borderColor-dark"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-contentColor dark:text-contentColor-dark font-medium text-sm">
                              {assignment.teacher?.name || assignment.teacher?.email || '-'}
                            </p>
                            <p className="text-contentColor dark:text-contentColor-dark text-xs opacity-70">
                              {assignment.subject_offering?.subject?.title || assignment.subject_offering?.elective_group?.title || '-'}
                            </p>
                          </div>
                          <div className="text-xs text-contentColor dark:text-contentColor-dark">
                            Load: {assignment.load || 0}%
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-40px text-contentColor dark:text-contentColor-dark text-sm opacity-70">
                      No teachers assigned
                    </div>
                  )}
                </div>
              )}

              {/* Audit Tab */}
              {activeTab === 'audit' && (
                <div className="space-y-15px">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-15px bg-gray-50 dark:bg-gray-900/50 rounded border border-borderColor dark:border-borderColor-dark"
                      >
                        <div className="flex items-center justify-between mb-5px">
                          <p className="text-contentColor dark:text-contentColor-dark font-medium text-sm">
                            {log.action}
                          </p>
                          <p className="text-contentColor dark:text-contentColor-dark text-xs opacity-70">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-contentColor dark:text-contentColor-dark text-xs opacity-70">
                          By {log.actor?.email || 'System'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-40px text-contentColor dark:text-contentColor-dark text-sm opacity-70">
                      No audit logs available
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions Footer */}
        <div className="sticky bottom-0 bg-whiteColor dark:bg-whiteColor-dark border-t border-borderColor dark:border-borderColor-dark p-20px flex gap-10px">
          <button
            type="button"
            onClick={() => onEdit && onEdit(cohortDetails)}
            className="flex-1 px-15px py-10px text-size-14 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handlePublish}
            className={`flex-1 px-15px py-10px text-size-14 rounded transition-colors ${
              cohortDetails.status === 'published'
                ? 'text-orange-600 dark:text-orange-400 bg-transparent border border-orange-600 dark:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                : 'text-green-600 dark:text-green-400 bg-transparent border border-green-600 dark:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
            }`}
          >
            {cohortDetails.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
          <button
            type="button"
            onClick={handleArchive}
            className={`flex-1 px-15px py-10px text-size-14 rounded transition-colors ${
              cohortDetails.status === 'archived'
                ? 'text-green-600 dark:text-green-400 bg-transparent border border-green-600 dark:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                : 'text-orange-600 dark:text-orange-400 bg-transparent border border-orange-600 dark:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
            }`}
          >
            {cohortDetails.status === 'archived' ? 'Unarchive' : 'Archive'}
          </button>
        </div>
      </div>
    </>
  );
}

