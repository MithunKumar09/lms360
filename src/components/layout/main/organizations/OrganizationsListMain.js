/**
 * Organizations List Main Component
 * 
 * Main component for displaying organizations list with search, filters, and pagination.
 * Uses React Query for data fetching and caching.
 * 
 * @module main/organizations/OrganizationsListMain
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useOrganizations, useDeleteOrganization } from '@/hooks/api/useOrganizations';
import OrganizationTable from '@/components/shared/organizations/OrganizationTable.js';
import Pagination from '@/components/shared/others/Pagination.js';
import ErrorDisplay from '@/components/shared/errors/ErrorDisplay.js';
import useSweetAlert from '@/hooks/useSweetAlert';

// Organization types
const ORG_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'college', label: 'College' },
  { value: 'university', label: 'University' },
  { value: 'institute', label: 'Institute' },
  { value: 'department', label: 'Department' },
  { value: 'training_center', label: 'Training Center' },
];

// Status options
const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

export default function OrganizationsListMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createAlert = useSweetAlert();
  const deleteOrganization = useDeleteOrganization();

  // Filters from URL params
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [orgType, setOrgType] = useState(searchParams.get('org_type') || '');
  const [country, setCountry] = useState(searchParams.get('country') || '');
  const [state, setState] = useState(searchParams.get('state') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'created_at');
  const [order, setOrder] = useState(searchParams.get('order') || 'DESC');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const limit = 20;

  // UI state (local only)
  const [selectedIds, setSelectedIds] = useState([]);

  // Build filters object for React Query
  const filters = useMemo(() => {
    const params = {
      page: page.toString(),
      limit: limit.toString(),
      sort,
      order,
    };

    if (search) params.q = search;
    if (status) params.status = status;
    if (orgType) params.org_type = orgType;
    if (country) params.country = country;
    if (state) params.state = state;
    if (city) params.city = city;

    return params;
  }, [page, limit, search, status, orgType, country, state, city, sort, order]);

  // Fetch organizations using React Query
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useOrganizations({
    filters,
    enabled: true,
  });

  const organizations = data?.organizations || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.pages || 0;

  // Update URL when filters change
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (status) params.set('status', status);
    if (orgType) params.set('org_type', orgType);
    if (country) params.set('country', country);
    if (state) params.set('state', state);
    if (city) params.set('city', city);
    if (sort !== 'created_at') params.set('sort', sort);
    if (order !== 'DESC') params.set('order', order);
    if (page > 1) params.set('page', page.toString());

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/dashboards/superadmin-organizations${newUrl}`, { scroll: false });
  }, [search, status, orgType, country, state, city, sort, order, page, router]);

  // Update URL when filters change (debounced to avoid too many updates)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateUrl();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [search, status, orgType, country, state, city, sort, order, page]);

  // Handle delete
  const handleDelete = useCallback(async (id) => {
    try {
      await deleteOrganization.mutateAsync(id);
      // Clear selection if deleted item was selected
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    } catch (error) {
      // Error is handled by the mutation hook
      throw error;
    }
  }, [deleteOrganization]);

  // Handle select
  const handleSelect = useCallback((id, checked) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  }, []);

  // Handle select all
  const handleSelectAll = useCallback((checked) => {
    setSelectedIds(checked ? organizations.map((org) => org.id) : []);
  }, [organizations]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;

    const confirmed = await createAlert(
      'warning',
      `Are you sure you want to delete ${selectedIds.length} organization(s)?`,
      'This action cannot be undone.',
      true
    );

    if (confirmed) {
      try {
        await Promise.all(selectedIds.map((id) => handleDelete(id)));
        setSelectedIds([]);
        createAlert('success', `${selectedIds.length} organization(s) deleted successfully`);
      } catch (error) {
        createAlert('error', error.message || 'Failed to delete organizations');
      }
    }
  }, [selectedIds, handleDelete, createAlert]);

  // Handle pagination
  const handlePagination = useCallback((newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle search
  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setPage(1);
    updateUrl();
  }, [updateUrl]);

  // Handle filter change
  const handleFilterChange = useCallback((filterName, value) => {
    if (filterName === 'status') setStatus(value);
    else if (filterName === 'orgType') setOrgType(value);
    else if (filterName === 'sort') {
      const [newSort, newOrder] = value.split('-');
      setSort(newSort);
      setOrder(newOrder);
    }
    setPage(1);
    updateUrl();
  }, [updateUrl]);

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    setSearch('');
    setStatus('');
    setOrgType('');
    setCountry('');
    setState('');
    setCity('');
    setSort('created_at');
    setOrder('DESC');
    setPage(1);
    updateUrl();
  }, [updateUrl]);

  return (
    <div className="pb-100px">
      {/* Header */}
      <div className="mb-30px flex flex-col sm:flex-row gap-20px items-start sm:items-center justify-between">
        <div>
          <h1 className="text-size-30 text-blackColor dark:text-blackColor-dark font-bold mb-10px">
            Organizations
          </h1>
          <p className="text-contentColor dark:text-contentColor-dark text-sm">
            Manage all organizations ({total} total)
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-15px">
          <Link
            href="/dashboards/superadmin-organizations/bulk"
            className="px-20px py-10px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Bulk Import
          </Link>
          <Link
            href="/dashboards/superadmin-organizations/new"
            className="px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors"
          >
            Create Organization
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <ErrorDisplay
          error={error.message || 'Failed to load organizations'}
          type="inline"
          variant="error"
          className="mb-25px"
          onRetry={refetch}
        />
      )}

      {/* Filters */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px mb-30px">
        <form onSubmit={handleSearch} className="space-y-20px">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-15px">
            <div className="flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search organizations..."
                className="w-full h-52px leading-52px pl-5 pr-40px bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark placeholder:text-placeholder placeholder:opacity-80 font-medium rounded"
              />
            </div>
            <button
              type="submit"
              className="px-25px py-10px h-52px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors"
            >
              Search
            </button>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-15px">
            <div>
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded font-medium"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                Type
              </label>
              <select
                value={orgType}
                onChange={(e) => handleFilterChange('orgType', e.target.value)}
                className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded font-medium"
              >
                {ORG_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
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
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded font-medium"
              >
                <option value="created_at-DESC">Newest First</option>
                <option value="created_at-ASC">Oldest First</option>
                <option value="name-ASC">Name (A-Z)</option>
                <option value="name-DESC">Name (Z-A)</option>
                <option value="updated_at-DESC">Recently Updated</option>
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
        </form>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-primaryColor/10 dark:bg-primaryColor/20 border border-primaryColor dark:border-primaryColor rounded p-20px mb-30px flex items-center justify-between">
          <span className="text-contentColor dark:text-contentColor-dark text-sm font-medium">
            {selectedIds.length} organization(s) selected
          </span>
          <div className="flex gap-10px">
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={deleteOrganization.isPending}
              className="px-20px py-8px text-size-14 text-red-600 dark:text-red-400 bg-transparent border border-red-600 dark:border-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              {deleteOrganization.isPending ? 'Deleting...' : 'Delete Selected'}
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
        <OrganizationTable
          organizations={organizations}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onDelete={handleDelete}
          loading={isLoading}
        />

        {/* Pagination */}
        {totalPages > 1 && !isLoading && (
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
    </div>
  );
}
