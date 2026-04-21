/**
 * Subjects Catalog Main Component
 * 
 * Main component for displaying subjects catalog with search, filters, pagination, and CRUD operations.
 * 
 * @module main/subjects/SubjectsCatalogMain
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import Swal from 'sweetalert2';
import SubjectTable from '@/components/shared/subjects/SubjectTable.js';
import Pagination from '@/components/shared/others/Pagination.js';
import ErrorDisplay from '@/components/shared/errors/ErrorDisplay.js';
import FormMultiSelect from '@/components/shared/forms/FormMultiSelect.js';
import { subjectCatalogCreateSchema, subjectCatalogUpdateSchema, validateForm } from '@/lib/validation/classesSubjectsSchemas.js';
import ValidationError from '@/components/shared/errors/ValidationError.js';
import { useSubjectCatalogList, useUpsertSubject } from '@/hooks/api/useClassesSubjects.js';
import { useOrganizations, useProgramNodes } from '@/hooks/api/useDropdownData.js';

// Category options
const CATEGORY_OPTIONS = [
  { value: 'core', label: 'Core' },
  { value: 'elective', label: 'Elective' },
  { value: 'lab', label: 'Lab' },
  { value: 'mandatory', label: 'Mandatory' },
  { value: 'project', label: 'Project' },
  { value: 'internship', label: 'Internship' },
  { value: 'aecc', label: 'AECC' },
  { value: 'sec', label: 'SEC' },
  { value: 'open_elective', label: 'Open Elective' },
  { value: 'prof_elective', label: 'Professional Elective' },
];

// Academic level options
const LEVEL_OPTIONS = [
  { value: 'primary', label: 'Primary' },
  { value: 'high_school', label: 'High School' },
  { value: 'puc', label: 'PUC' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'degree', label: 'Degree' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'post_graduation', label: 'Post Graduation' },
];

export default function SubjectsCatalogMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createAlert = useSweetAlert();
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || 'superadmin';
  const userOrgId = user?.orgId;

  // State
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [viewingSubject, setViewingSubject] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const isFetchingRef = useRef(false);

  // Filters
  const [orgId, setOrgId] = useState(userRole === 'admin' ? userOrgId : searchParams.get('orgId') || '');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [categories, setCategories] = useState([]);
  const [levels, setLevels] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [sort, setSort] = useState(searchParams.get('sort') || 'created_at');
  const [order, setOrder] = useState(searchParams.get('order') || 'DESC');

  // Pagination
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    category: '',
    credits: '',
    hours_per_week: '',
    level: '',
    department_node_id: '',
    syllabus_url: '',
    metadata: {},
  });
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);

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

  // Use cached hooks for dropdown data
  const organizationsQuery = useOrganizations(
    { limit: 100 },
    { enabled: userRole === 'superadmin' && !orgId }
  );

  const departmentsQuery = useProgramNodes(
    { orgId, node_type: 'department', limit: 100 },
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

  // Update departments state from query
  useEffect(() => {
    if (departmentsQuery.data?.nodes) {
      setDepartments(
        departmentsQuery.data.nodes.map((node) => ({
          value: node.id,
          label: `${node.code} - ${node.title}`,
        }))
      );
    }
  }, [departmentsQuery.data]);

  // React Query: cache-first subjects list
  const { data, isLoading, isError, error: rqError } = useSubjectCatalogList(
    {
      orgId: userRole === 'admin' ? userOrgId : orgId,
      page,
      limit,
      sort,
      order,
      q: searchDebounce || undefined,
      category: categories,
      level: levels,
      department_node_id: departmentId || undefined,
    },
    { enabled: mounted && (userRole !== 'superadmin' || Boolean(orgId)) }
  );

  useEffect(() => {
    setLoading(isLoading);
    if (isError) {
      const message = rqError?.message || 'Failed to fetch subjects';
      setError(message);
    } else {
      setError(null);
    }
    if (data) {
      setSubjects(data.subjects);
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
    if (categories.length > 0) categories.forEach((cat) => params.append('category', cat));
    if (levels.length > 0) levels.forEach((level) => params.append('level', level));
    if (departmentId) params.set('department_node_id', departmentId);
    if (sort !== 'created_at') params.set('sort', sort);
    if (order !== 'DESC') params.set('order', order);
    if (page > 1) params.set('page', page.toString());

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/dashboards/superadmin-classes-subjects/subjects${newUrl}`, { scroll: false });
  }, [mounted, orgId, searchDebounce, categories, levels, departmentId, sort, order, page, router, userRole]);

  // Handle create/edit
  const upsertSubject = useUpsertSubject();
  const handleSave = async () => {
    // Require org selection for superadmin
    if (userRole === 'superadmin' && !orgId) {
      setFormErrors((prev) => ({ ...prev, org_id: 'Organization is required' }));
      createAlert('error', 'Please select organization');
      return;
    }

    // Normalize optional fields: empty string -> null
    const normalized = {
      ...formData,
      org_id: userRole === 'admin' ? userOrgId : orgId,
      credits: formData.credits ? parseFloat(formData.credits) : null,
      hours_per_week: formData.hours_per_week ? parseFloat(formData.hours_per_week) : null,
      department_node_id: formData.department_node_id || null,
      syllabus_url: formData.syllabus_url?.trim() ? formData.syllabus_url.trim() : null,
      description: formData.description?.trim() ? formData.description.trim() : null,
      metadata: formData.metadata && Object.keys(formData.metadata).length > 0 ? formData.metadata : null,
    };

    const validation = validateForm(
      editingSubject ? subjectCatalogUpdateSchema : subjectCatalogCreateSchema,
      normalized
    );

    if (!validation.success) {
      setFormErrors(validation.errors);
      if (process.env.NODE_ENV !== 'production') {
        // Development diagnostics for validation failures
        // eslint-disable-next-line no-console
        console.log('[DEV] Subject create/update validation errors:', validation.errors);
      }
      createAlert('error', 'Please fix the validation errors');
      return;
    }

    setFormLoading(true);
    setFormErrors({});

    try {
      const body = editingSubject
        ? { id: editingSubject.id, ...validation.data }
        : validation.data;
      await upsertSubject.mutateAsync({
        orgId: userRole === 'admin' ? userOrgId : orgId,
        body,
        method: editingSubject ? 'PATCH' : 'POST',
      });

      createAlert('success', editingSubject ? 'Subject updated successfully' : 'Subject created successfully');
      setShowModal(false);
      setEditingSubject(null);
      setFormData({
        code: '',
        title: '',
        description: '',
        category: '',
        credits: '',
        hours_per_week: '',
        level: '',
        department_node_id: '',
        syllabus_url: '',
        metadata: {},
      });
    } catch (error) {
      console.error('Error saving subject:', error);
      createAlert('error', error.message || 'Failed to save subject');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle archive
  const handleArchive = async (id, unarchive = false) => {
    const subject = subjects.find((s) => s.id === id);
    if (!subject) return;
    await upsertSubject.mutateAsync({
      orgId: userRole === 'admin' ? userOrgId : orgId,
      method: 'PATCH',
      body: { id, status: unarchive ? 'active' : 'archived' },
    });
  };

  // Handle edit
  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData({
      code: subject.code || '',
      title: subject.title || '',
      description: subject.description || '',
      category: subject.category || '',
      credits: subject.credits?.toString() || '',
      hours_per_week: subject.hours_per_week?.toString() || '',
      level: subject.level || '',
      department_node_id: subject.department_node_id || '',
      syllabus_url: subject.syllabus_url || '',
      metadata: subject.metadata || {},
    });
    setFormErrors({});
    setShowModal(true);
  };

  // Handle view
  const handleView = (subject) => {
    setViewingSubject(subject);
    setShowDetailsModal(true);
  };

  // Handle create new
  const handleCreate = () => {
    setEditingSubject(null);
    setFormData({
      code: '',
      title: '',
      description: '',
      category: '',
      credits: '',
      hours_per_week: '',
      level: '',
      department_node_id: '',
      syllabus_url: '',
      metadata: {},
    });
    setFormErrors({});
    setShowModal(true);
  };

  // Handle select
  const handleSelect = (id, checked) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    setSelectedIds(checked ? subjects.map((s) => s.id) : []);
  };

  // Handle pagination
  const handlePagination = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle reset filters
  const handleResetFilters = () => {
    setSearch('');
    setCategories([]);
    setLevels([]);
    setDepartmentId('');
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
            Subjects Catalog
          </h1>
          <p className="text-contentColor dark:text-contentColor-dark text-sm">
            Manage subject catalog ({total} total)
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors"
        >
          Create Subject
        </button>
      </div>

      {/* Error State */}
      {error && (
        <ErrorDisplay
          error={error}
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
            <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
              Organization <span className="text-red-500">*</span>
            </label>
            <select
              value={orgId}
              onChange={(e) => {
                setOrgId(e.target.value);
                setPage(1);
              }}
              className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded font-medium"
            >
              <option value="">Select organization</option>
              {organizations.map((org) => (
                <option key={org.value} value={org.value}>
                  {org.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-20px">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects by code, title, or description..."
            className="w-full h-52px leading-52px pl-5 pr-40px bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark placeholder:text-placeholder placeholder:opacity-80 font-medium rounded"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-15px mb-20px">
          <FormMultiSelect
            label="Category"
            name="categories"
            value={categories}
            onChange={(values) => {
              setCategories(values);
              setPage(1);
            }}
            options={CATEGORY_OPTIONS}
            placeholder="All Categories"
          />

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

          <div>
            <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
              className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded font-medium"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
          </div>

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
              <option value="title-ASC">Title (A-Z)</option>
              <option value="title-DESC">Title (Z-A)</option>
            </select>
          </div>
        </div>

        {/* Reset Filters */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-20px py-10px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
        <SubjectTable
          subjects={subjects}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onEdit={handleEdit}
          onArchive={handleArchive}
          onView={handleView}
          loading={loading}
          userRole={userRole}
        />

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <Pagination
            pages={Array.from({ length: totalPages }, (_, i) => i + 1)}
            skip={(page - 1) * limit}
            limit={limit}
            totalItems={total}
            handlePagesnation={(newPage) => handlePagination(typeof newPage === 'number' ? newPage : page + (newPage === 'next' ? 1 : -1))}
            currentPage={page - 1}
          />
        )}
      </div>

      {/* Create/Edit Inline Section */}
      {showModal && (
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px mt-25px">
          <div className="transition-all duration-300">
              <div className="flex items-center justify-between mb-25px">
                <h2 className="text-size-24 text-blackColor dark:text-blackColor-dark font-bold">
                  {editingSubject ? 'Edit Subject' : 'Create Subject'}
                </h2>
                <button
                  type="button"
                  className="text-contentColor dark:text-contentColor-dark hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSubject(null);
                    setFormErrors({});
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
                  handleSave();
                }}
                className="space-y-20px"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-25px gap-y-20px">
                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                      Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                        formErrors.code
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-borderColor dark:border-borderColor-dark'
                      } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded uppercase`}
                      placeholder="SUB001"
                      disabled={editingSubject && editingSubject.locked_fields?.includes('code') && userRole === 'admin'}
                    />
                    <ValidationError error={formErrors.code} field="code" />
                  </div>

                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                      className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                        formErrors.category
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-borderColor dark:border-borderColor-dark'
                      } rounded font-medium`}
                    >
                      <option value="">Select category</option>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    <ValidationError error={formErrors.category} field="category" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                        formErrors.title
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-borderColor dark:border-borderColor-dark'
                      } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                      placeholder="Subject Title"
                    />
                    <ValidationError error={formErrors.title} field="title" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className={`w-full p-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                        formErrors.description
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-borderColor dark:border-borderColor-dark'
                      } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                      placeholder="Subject description"
                    />
                    <ValidationError error={formErrors.description} field="description" />
                  </div>

                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                      Credits
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.credits}
                      onChange={(e) => setFormData((prev) => ({ ...prev, credits: e.target.value }))}
                      className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                        formErrors.credits
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-borderColor dark:border-borderColor-dark'
                      } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                      placeholder="0"
                    />
                    <ValidationError error={formErrors.credits} field="credits" />
                  </div>

                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                      Hours/Week
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.hours_per_week}
                      onChange={(e) => setFormData((prev) => ({ ...prev, hours_per_week: e.target.value }))}
                      className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                        formErrors.hours_per_week
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-borderColor dark:border-borderColor-dark'
                      } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                      placeholder="0"
                    />
                    <ValidationError error={formErrors.hours_per_week} field="hours_per_week" />
                  </div>

                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                      Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData((prev) => ({ ...prev, level: e.target.value }))}
                      className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                        formErrors.level
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-borderColor dark:border-borderColor-dark'
                      } rounded font-medium`}
                    >
                      <option value="">Select level</option>
                      {LEVEL_OPTIONS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                    <ValidationError error={formErrors.level} field="level" />
                  </div>

                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                      Department
                    </label>
                    <select
                      value={formData.department_node_id}
                      onChange={(e) => setFormData((prev) => ({ ...prev, department_node_id: e.target.value }))}
                      className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded font-medium"
                      disabled={!orgId && userRole === 'superadmin'}
                    >
                      <option value="">Select department</option>
                      {departments.map((dept) => (
                        <option key={dept.value} value={dept.value}>
                          {dept.label}
                        </option>
                      ))}
                    </select>
                    <ValidationError error={formErrors.department_node_id} field="department_node_id" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                      Syllabus URL
                    </label>
                    <input
                      type="url"
                      value={formData.syllabus_url}
                      onChange={(e) => setFormData((prev) => ({ ...prev, syllabus_url: e.target.value }))}
                      className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                        formErrors.syllabus_url
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-borderColor dark:border-borderColor-dark'
                      } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                      placeholder="https://example.com/syllabus.pdf"
                    />
                    <ValidationError error={formErrors.syllabus_url} field="syllabus_url" />
                  </div>
                </div>

                <div className="flex gap-15px justify-end pt-20px border-t border-borderColor dark:border-borderColor-dark">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingSubject(null);
                      setFormErrors({});
                    }}
                    disabled={formLoading}
                    className="px-25px py-10px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className={`px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      formLoading ? 'cursor-wait' : ''
                    }`}
                  >
                    {formLoading ? (
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
                        Saving...
                      </span>
                    ) : (
                      editingSubject ? 'Update Subject' : 'Create Subject'
                    )}
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && viewingSubject && (
        <div className="modal-container">
          <div className="modal fixed top-0 left-0 w-full h-full z-xxl transition-all duration-500 bg-lightBlack opacity-100 overflow-y-auto pb-10">
            <div
              className="modal-close fixed md:absolute top-0 left-0 w-full h-full z-xsmall cursor-zoom-out"
              onClick={() => {
                setShowDetailsModal(false);
                setViewingSubject(null);
              }}
            ></div>

            <div className="modal-content transition-all duration-500 translate-y-0 bg-whiteColor dark:bg-whiteColor-dark p-25px max-w-700 mx-15px md:mx-auto mb-50px mt-110px md:my-150px relative z-small rounded-lg">
              <div className="flex items-center justify-between mb-25px">
                <h2 className="text-size-24 text-blackColor dark:text-blackColor-dark font-bold">
                  Subject Details
                </h2>
                <button
                  type="button"
                  className="modal-close text-contentColor dark:text-contentColor-dark hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setViewingSubject(null);
                  }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-20px">
                <div>
                  <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Code:</label>
                  <p className="text-contentColor dark:text-contentColor-dark font-mono font-bold">{viewingSubject.code}</p>
                </div>
                <div>
                  <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Title:</label>
                  <p className="text-contentColor dark:text-contentColor-dark">{viewingSubject.title}</p>
                </div>
                {viewingSubject.description && (
                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Description:</label>
                    <p className="text-contentColor dark:text-contentColor-dark">{viewingSubject.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-20px">
                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Category:</label>
                    <p className="text-contentColor dark:text-contentColor-dark">{viewingSubject.category}</p>
                  </div>
                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Level:</label>
                    <p className="text-contentColor dark:text-contentColor-dark capitalize">{viewingSubject.level?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Credits:</label>
                    <p className="text-contentColor dark:text-contentColor-dark">{viewingSubject.credits || '-'}</p>
                  </div>
                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Hours/Week:</label>
                    <p className="text-contentColor dark:text-contentColor-dark">{viewingSubject.hours_per_week || '-'}</p>
                  </div>
                </div>
                {viewingSubject.syllabus_url && (
                  <div>
                    <label className="text-contentColor dark:text-contentColor-dark text-sm font-medium">Syllabus:</label>
                    <a
                      href={viewingSubject.syllabus_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primaryColor dark:text-primaryColor hover:underline inline-flex items-center gap-5px"
                    >
                      View Syllabus
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-15px justify-end pt-20px border-t border-borderColor dark:border-borderColor-dark mt-25px">
                <button
                  type="button"
                  onClick={() => {
                    handleEdit(viewingSubject);
                    setShowDetailsModal(false);
                  }}
                  className="px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setViewingSubject(null);
                  }}
                  className="px-25px py-10px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

