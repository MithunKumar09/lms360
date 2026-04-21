/**
 * Classes List Main Component
 * 
 * Main component for displaying classes list with comprehensive filters, search, pagination, and actions.
 * 
 * @module main/classes/ClassesListMain
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import Swal from 'sweetalert2';
import ClassTable from '@/components/shared/classes/ClassTable.js';
import Pagination from '@/components/shared/others/Pagination.js';
import ErrorDisplay from '@/components/shared/errors/ErrorDisplay.js';
import FormSelectAsync from '@/components/shared/forms/FormSelectAsync.js';
import FormMultiSelect from '@/components/shared/forms/FormMultiSelect.js';
import ClassDetailsModal from '@/components/shared/classes/ClassDetailsModal.js';
import { useCohortsList, usePublishCohort } from '@/hooks/api/useClassesSubjects.js';
import { useOrganizations, useTerms, useSections, useAcademicSessions } from '@/hooks/api/useDropdownData.js';

// Status options
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

// Level options
const LEVEL_OPTIONS = [
  { value: 'primary', label: 'Primary' },
  { value: 'high_school', label: 'High School' },
  { value: 'puc', label: 'PUC' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'degree', label: 'Degree' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'post_graduation', label: 'Post Graduation' },
];

// Node type options
const NODE_TYPE_OPTIONS = [
  { value: 'stream', label: 'Stream' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'programme', label: 'Programme' },
  { value: 'branch', label: 'Branch' },
  { value: 'combination', label: 'Combination' },
  { value: 'grade', label: 'Grade' },
  { value: 'department', label: 'Department' },
];

export default function ClassesListMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createAlert = useSweetAlert();
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || 'superadmin';
  const userOrgId = user?.orgId;

  // State
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingClass, setViewingClass] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const isFetchingRef = useRef(false);

  // Filters
  const [orgId, setOrgId] = useState(userRole === 'admin' ? userOrgId : searchParams.get('orgId') || '');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [levels, setLevels] = useState([]);
  const [nodeTypes, setNodeTypes] = useState([]);
  const [termId, setTermId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [statuses, setStatuses] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [sort, setSort] = useState(searchParams.get('sort') || 'created_at');
  const [order, setOrder] = useState(searchParams.get('order') || 'DESC');

  // Pagination
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get('pageSize') || '20', 10));
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Debounced search
  const [searchDebounce, setSearchDebounce] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Set mounted state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);

  // Use cached hooks for dropdown data - enable immediately for instant loading
  const organizationsQuery = useOrganizations(
    { limit: 100 },
    { enabled: userRole === 'superadmin' }
  );

  // Only enable queries when orgId is available (prevents 400 errors)
  const termsQuery = useTerms(
    { orgId, limit: 50 },
    { enabled: Boolean(orgId) }
  );

  const sectionsQuery = useSections(
    { orgId, limit: 50 },
    { enabled: Boolean(orgId) }
  );

  const sessionsQuery = useAcademicSessions(
    { orgId, limit: 50 },
    { enabled: Boolean(orgId) }
  );

  // Update organizations state from query
  useEffect(() => {
    if (organizationsQuery.data?.organizations) {
      setOrganizations(
        organizationsQuery.data.organizations.map((org) => ({
          value: org.id,
          label: `${org.name} (${org.org_code})`,
        }))
      );
    }
  }, [organizationsQuery.data]);

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
        }));
      return filtered;
    }
    
    // Fallback to fetch if cache not available
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
  }, [userRole, organizationsQuery.data]);

  // Legacy loadTerms - now uses cache
  const loadTerms = useCallback(async (searchTerm = '') => {
    if (!orgId) return [];
    
    // Use cached data if available, filter client-side
    if (termsQuery.data?.terms) {
      const filtered = termsQuery.data.terms
        .filter((term) => 
          term.label?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((term) => ({
          value: term.id,
          label: term.label,
        }));
      return filtered;
    }
    
    return [];
  }, [orgId, termsQuery.data]);

  // Legacy loadSections - now uses cache
  const loadSections = useCallback(async (searchTerm = '') => {
    if (!orgId) return [];
    
    // Use cached data if available, filter client-side
    if (sectionsQuery.data?.sections) {
      const filtered = sectionsQuery.data.sections
        .filter((section) => 
          section.label?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((section) => ({
          value: section.id,
          label: section.label,
        }));
      return filtered;
    }
    
    return [];
  }, [orgId, sectionsQuery.data]);

  // Legacy loadSessions - now uses cache
  const loadSessions = useCallback(async (searchTerm = '') => {
    if (!orgId) return [];
    
    // Use cached data if available, filter client-side
    if (sessionsQuery.data?.sessions) {
      const filtered = sessionsQuery.data.sessions
        .filter((session) => 
          session.code?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((session) => ({
          value: session.id,
          label: `${session.code} (${new Date(session.start_date).getFullYear()}-${new Date(session.end_date).getFullYear()})`,
        }));
      return filtered;
    }
    
    return [];
  }, [orgId, sessionsQuery.data]);

  // React Query: cache-first cohorts list
  const { data, isLoading, isError, error: rqError, refetch } = useCohortsList(
    {
      orgId: userRole === 'admin' ? userOrgId : orgId,
      page,
      pageSize,
      sort,
      order,
      q: searchDebounce || undefined,
      level: levels,
      node_type: nodeTypes,
      term_id: termId || undefined,
      section_id: sectionId || undefined,
      status: statuses,
      session_id: sessionId || undefined,
    },
    { enabled: mounted && (userRole !== 'superadmin' || Boolean(orgId)) }
  );

  // Simple refresher for child modals
  const fetchClasses = useCallback(() => {
    return refetch();
  }, [refetch]);

  // Mirror query state into local UI state for minimal edits
  useEffect(() => {
    setLoading(isLoading);
    if (isError) {
      const message = rqError?.message || 'Failed to fetch classes';
      setError(message);
    } else {
      setError(null);
    }
    if (data) {
      setClasses(data.classes);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.pages || 0);
    }
  }, [isLoading, isError, rqError, data]);

  // Update URL when filters change
  useEffect(() => {
    if (!mounted) return;

    const params = new URLSearchParams();
    if (userRole === 'superadmin' && orgId) params.set('orgId', orgId);
    if (searchDebounce) params.set('q', searchDebounce);
    if (levels.length > 0) levels.forEach((level) => params.append('level', level));
    if (nodeTypes.length > 0) nodeTypes.forEach((type) => params.append('node_type', type));
    if (termId) params.set('term_id', termId);
    if (sectionId) params.set('section_id', sectionId);
    if (statuses.length > 0) statuses.forEach((status) => params.append('status', status));
    if (sessionId) params.set('session_id', sessionId);
    if (sort !== 'created_at') params.set('sort', sort);
    if (order !== 'DESC') params.set('order', order);
    if (page > 1) params.set('page', page.toString());
    if (pageSize !== 20) params.set('pageSize', pageSize.toString());

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    // Avoid infinite replace loops by only navigating when the query actually changes
    if (typeof window !== 'undefined') {
      const currentSearch = window.location.search || '';
      if (currentSearch !== newUrl) {
        router.replace(`/dashboards/superadmin-classes-subjects/classes${newUrl}`, { scroll: false });
      }
    } else {
      // SSR guard: do nothing
    }
  }, [mounted, orgId, searchDebounce, levels, nodeTypes, termId, sectionId, statuses, sessionId, sort, order, page, pageSize, router, userRole]);

  // Handle view
  const handleView = (cohort) => {
    // Navigate to dedicated details page instead of opening modal
    if (cohort?.id) {
      const currentOrgId = userRole === 'admin' ? userOrgId : orgId;
      const qs = currentOrgId ? `?orgId=${currentOrgId}` : '';
      router.push(`/dashboards/superadmin-classes-subjects/classes/${cohort.id}${qs}`);
      return;
    }
    // Fallback to modal if id missing
    setViewingClass(cohort);
    setShowDetailsModal(true);
  };

  // Handle edit - navigate to create page with edit mode
  const handleEdit = (cohort) => {
    try {
      if (!cohort || !cohort.id) {
        console.error('[ClassesListMain] handleEdit: cohort is null or missing id');
        createAlert('error', 'Class data is missing');
        return;
      }
      
      // Navigate to create class page with edit mode
      const currentOrgId = userRole === 'admin' ? userOrgId : orgId;
      const queryParams = new URLSearchParams();
      if (currentOrgId) queryParams.set('orgId', currentOrgId);
      queryParams.set('edit', cohort.id);
      
      router.push(`/dashboards/superadmin-classes-subjects/classes/new?${queryParams.toString()}`);
    } catch (error) {
      console.error('[ClassesListMain] Error in handleEdit:', error);
      createAlert('error', error.message || 'Failed to open edit page');
    }
  };

  // Handle publish
  const publishMutation = usePublishCohort();
  const handlePublish = async (id, unpublish = false) => {
    const cohort = classes.find((c) => c.id === id);
    if (!cohort) return;
    await publishMutation.mutateAsync({
      id,
      orgId: userRole === 'admin' ? userOrgId : orgId,
      action: unpublish ? 'archive' : 'publish',
    });
  };

  // Handle archive
  const handleArchive = async (id, unarchive = false) => {
    const cohort = classes.find((c) => c.id === id);
    if (!cohort) return;
    await publishMutation.mutateAsync({
      id,
      orgId: userRole === 'admin' ? userOrgId : orgId,
      action: unarchive ? 'publish' : 'archive',
    });
  };

  // Handle bulk publish
  const handleBulkPublish = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: 'Publish Classes',
      text: `Are you sure you want to publish ${selectedIds.length} class(es)?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Publish',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => handlePublish(id, false)));
      setSelectedIds([]);
      createAlert('success', `${selectedIds.length} class(es) published successfully`);
    } catch (error) {
      createAlert('error', error.message || 'Failed to publish classes');
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk archive
  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: 'Archive Classes',
      text: `Are you sure you want to archive ${selectedIds.length} class(es)?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Archive',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => handleArchive(id, false)));
      setSelectedIds([]);
      createAlert('success', `${selectedIds.length} class(es) archived successfully`);
    } catch (error) {
      createAlert('error', error.message || 'Failed to archive classes');
    } finally {
      setLoading(false);
    }
  };

  // Handle export
  const handleExport = async (format = 'csv') => {
    try {
      const params = new URLSearchParams({
        orgId: userRole === 'admin' ? userOrgId : orgId,
        format,
      });

      if (searchDebounce) params.set('q', searchDebounce);
      if (levels.length > 0) levels.forEach((level) => params.append('level', level));
      if (nodeTypes.length > 0) nodeTypes.forEach((type) => params.append('node_type', type));
      if (termId) params.set('term_id', termId);
      if (sectionId) params.set('section_id', sectionId);
      if (statuses.length > 0) statuses.forEach((status) => params.append('status', status));
      if (sessionId) params.set('session_id', sessionId);

      const response = await fetch(`/api/cohorts/export?${params}&format=${format}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to export classes');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `classes-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      createAlert('success', 'Classes exported successfully');
    } catch (error) {
      console.error('Error exporting classes:', error);
      createAlert('error', error.message || 'Failed to export classes');
    }
  };

  // Handle select
  const handleSelect = (id, checked) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    setSelectedIds(checked ? classes.map((c) => c.id) : []);
  };

  // Handle pagination
  const handlePagination = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle sort
  const handleSort = (column, newOrder) => {
    setSort(column);
    setOrder(newOrder);
    setPage(1);
  };

  // Handle reset filters
  const handleResetFilters = () => {
    setSearch('');
    setLevels([]);
    setNodeTypes([]);
    setTermId('');
    setSectionId('');
    setStatuses([]);
    setSessionId('');
    setSort('created_at');
    setOrder('DESC');
    setPage(1);
  };

  return (
    <div className="pb-100px">
      {/* Header */}
      <div className="mb-30px flex flex-col sm:flex-row gap-20px items-start sm:items-center justify-between">
        <div>
          <h1 className="text-size-30 text-blackColor dark:text-blackColor-dark font-bold mb-10px">
            Classes
          </h1>
          <p className="text-contentColor dark:text-contentColor-dark text-sm">
            Manage all classes ({total} total)
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-15px">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={loading}
            className="px-20px py-10px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
          <Link
            href="/dashboards/superadmin-classes-subjects/classes/new"
            className="px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors"
          >
            Create Class
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <ErrorDisplay
          error={typeof error === 'string' ? error : (error?.message || 'An error occurred')}
          type="inline"
          variant="error"
          className="mb-25px"
          onRetry={() => {}}
        />
      )}

      {/* Filters */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px mb-30px">
        {/* Organization Select (Superadmin only) */}
        {userRole === 'superadmin' && (
          <div className="mb-20px">
            <FormSelectAsync
              label="Organization"
              name="org_id"
              value={orgId}
              onChange={(value) => {
                setOrgId(value);
                setPage(1);
              }}
              queryHook={organizationsQuery}
              mapData={(data) => 
                (data?.organizations || []).map((org) => ({
                  value: org.id,
                  label: `${org.name} (${org.org_code})`,
                }))
              }
              loadOptions={loadOrganizations}
              placeholder="Select organization..."
            />
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-20px">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search classes by code, program, or section..."
            className="w-full h-52px leading-52px pl-5 pr-40px bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark placeholder:text-placeholder placeholder:opacity-80 font-medium rounded"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-15px mb-20px">
          <FormMultiSelect
            label="Level"
            name="levels"
            value={levels}
            onChange={(values) => {
              setLevels(values);
              setPage(1);
            }}
            options={LEVEL_OPTIONS}
            placeholder="All Levels"
          />

          <FormMultiSelect
            label="Program Node Type"
            name="node_types"
            value={nodeTypes}
            onChange={(values) => {
              setNodeTypes(values);
              setPage(1);
            }}
            options={NODE_TYPE_OPTIONS}
            placeholder="All Types"
          />

          <FormSelectAsync
            label="Term"
            name="term_id"
            value={termId}
            onChange={(value) => {
              setTermId(value);
              setPage(1);
            }}
            queryHook={termsQuery}
            mapData={(data) => 
              (data?.terms || []).map((term) => ({
                value: term.id,
                label: term.label,
              }))
            }
            loadOptions={loadTerms}
            placeholder="All Terms"
            disabled={!orgId}
          />

          <FormSelectAsync
            label="Section"
            name="section_id"
            value={sectionId}
            onChange={(value) => {
              setSectionId(value);
              setPage(1);
            }}
            queryHook={sectionsQuery}
            mapData={(data) => 
              (data?.sections || []).map((section) => ({
                value: section.id,
                label: section.label,
              }))
            }
            loadOptions={loadSections}
            placeholder="All Sections"
            disabled={!orgId}
          />

          <FormMultiSelect
            label="Status"
            name="statuses"
            value={statuses}
            onChange={(values) => {
              setStatuses(values);
              setPage(1);
            }}
            options={STATUS_OPTIONS}
            placeholder="All Statuses"
          />

          <FormSelectAsync
            label="Session"
            name="session_id"
            value={sessionId}
            onChange={(value) => {
              setSessionId(value);
              setPage(1);
            }}
            queryHook={sessionsQuery}
            mapData={(data) => 
              (data?.sessions || []).map((session) => ({
                value: session.id,
                label: `${session.code} (${new Date(session.start_date).getFullYear()}-${new Date(session.end_date).getFullYear()})`,
              }))
            }
            loadOptions={loadSessions}
            placeholder="All Sessions"
            disabled={!orgId}
          />

          <div>
            <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
              Sort By
            </label>
            <select
              value={`${sort}-${order}`}
              onChange={(e) => {
                const [newSort, newOrder] = e.target.value.split('-');
                setSort(newSort);
                setOrder(newOrder);
                setPage(1);
              }}
              className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded font-medium"
            >
              <option value="created_at-DESC">Newest First</option>
              <option value="created_at-ASC">Oldest First</option>
              <option value="code-ASC">Code (A-Z)</option>
              <option value="code-DESC">Code (Z-A)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full px-20px py-10px h-52px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10px">
            <label className="text-contentColor dark:text-contentColor-dark text-sm">
              Page Size:
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="h-40px pl-5 pr-30px bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded font-medium"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && userRole === 'superadmin' && (
        <div className="bg-primaryColor/10 dark:bg-primaryColor/20 border border-primaryColor dark:border-primaryColor rounded p-20px mb-30px flex items-center justify-between">
          <span className="text-contentColor dark:text-contentColor-dark text-sm font-medium">
            {selectedIds.length} class(es) selected
          </span>
          <div className="flex gap-10px">
            <button
              type="button"
              onClick={handleBulkPublish}
              disabled={loading}
              className="px-20px py-8px text-size-14 text-green-600 dark:text-green-400 bg-transparent border border-green-600 dark:border-green-400 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Publish Selected
            </button>
            <button
              type="button"
              onClick={handleBulkArchive}
              disabled={loading}
              className="px-20px py-8px text-size-14 text-orange-600 dark:text-orange-400 bg-transparent border border-orange-600 dark:border-orange-400 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Archive Selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-20px py-8px text-size-14 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
        <ClassTable
          classes={classes}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onView={handleView}
          onEdit={handleEdit}
          onPublish={handlePublish}
          onArchive={handleArchive}
          loading={loading}
          userRole={userRole}
          onSort={handleSort}
          sortColumn={sort}
          sortOrder={order}
        />

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <Pagination
            pages={Array.from({ length: totalPages }, (_, i) => i + 1)}
            skip={(page - 1) * pageSize}
            limit={pageSize}
            totalItems={total}
            handlePagesnation={(newPage) => handlePagination(typeof newPage === 'number' ? newPage : page + (newPage === 'next' ? 1 : -1))}
            currentPage={page - 1}
          />
        )}
      </div>

      {/* Details are now a dedicated page; modal retained only as fallback if needed */}
    </div>
  );
}

