"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useAuditLogs } from "@/hooks/api/useAuditLogs.js";
import { useDebouncedValue } from "@/hooks/useDebouncedValue.js";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader.js";
import { 
  FiSearch, 
  FiFilter,
  FiX,
  FiDownload,
  FiRefreshCw,
  FiCalendar,
  FiClock,
  FiLogIn,
  FiLogOut,
  FiShield,
  FiGlobe,
  FiHome,
  FiUser,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

function Badge({ children, variant = "primary", className = "" }) {
  const variantClasses = {
    primary: 'bg-primaryColor/10 text-primaryColor border-primaryColor/20',
    success: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    danger: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    info: 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
    secondary: 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800',
  };

  const baseClasses = 'inline-flex items-center gap-4px px-12px py-4px rounded-5 text-12px font-semibold border transition-colors duration-200';
  const variantClass = variantClasses[variant] || variantClasses.primary;

  return (
    <span className={`${baseClasses} ${variantClass} ${className}`}>
      {children}
    </span>
  );
}

function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Invalid date';
  }
}

function formatFullDateTime(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Invalid date';
  }
}

export default function AuditLogsMain({ actorRole = "superadmin" }) {
  const isSuperadmin = actorRole === "superadmin";
  const isAdmin = actorRole === "admin";

  // UI state
  const [filters, setFilters] = useState({
    q: "",
    eventType: "",
    role: "",
    orgId: "",
    dateFrom: "",
    dateTo: "",
    page: 1,
    pageSize: 20,
    sort: "event_time:desc",
  });
  
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  
  const qDebounced = useDebouncedValue(filters.q, 300);

  // Build query filters for React Query
  const queryFilters = useMemo(() => {
    const params = {
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    };
    
    if (qDebounced) params.search = qDebounced;
    if (filters.eventType) params.eventType = filters.eventType;
    if (filters.role) params.role = filters.role;
    if (isSuperadmin && filters.orgId) params.orgId = filters.orgId;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.sort) params.sort = filters.sort;
    
    return params;
  }, [filters, qDebounced, isSuperadmin]);

  // Fetch audit logs using React Query
  const { data, isLoading, error, refetch } = useAuditLogs({
    filters: queryFilters,
    enabled: true,
  });

  const items = useMemo(() => data?.items || [], [data?.items]);
  const pagination = data?.pagination || {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  // Filter handlers
  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page on filter change
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      q: "",
      eventType: "",
      role: "",
      orgId: "",
      dateFrom: "",
      dateTo: "",
      page: 1,
      pageSize: 20,
      sort: "event_time:desc",
    });
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.q) count++;
    if (filters.eventType) count++;
    if (filters.role) count++;
    if (isSuperadmin && filters.orgId) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    return count;
  }, [filters, isSuperadmin]);

  // Pagination handlers
  const handlePageChange = useCallback((newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="w-full space-y-30px">
      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark overflow-hidden">
        <div className="p-20px md:p-30px lg:p-40px">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-20px md:gap-30px items-end">
            <div className="lg:col-span-5">
              <label className="block text-12px font-semibold text-contentColor dark:text-contentColor-dark uppercase tracking-wide mb-10px">
                Search
              </label>
              <div className="relative">
                <FiSearch 
                  className="absolute left-14px top-1/2 transform -translate-y-1/2 text-contentColor dark:text-contentColor-dark pointer-events-none" 
                  size={18} 
                  style={{ zIndex: 10, width: '18px', height: '18px' }} 
                />
                <input
                  type="text"
                  className="w-full pl-48px pr-16px py-12px rounded-5 border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark text-14px text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark focus:outline-none focus:border-primaryColor transition-all duration-200"
                  placeholder="Search by email..."
                  value={filters.q}
                  onChange={(e) => handleFilterChange('q', e.target.value)}
                  style={{ paddingLeft: '48px' }}
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-12px font-semibold text-contentColor dark:text-contentColor-dark uppercase tracking-wide mb-10px">
                Event Type
              </label>
              <select
                className="w-full px-16px py-12px rounded-5 border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark text-14px text-blackColor dark:text-blackColor-dark focus:outline-none focus:border-primaryColor transition-all duration-200"
                value={filters.eventType}
                onChange={(e) => handleFilterChange('eventType', e.target.value)}
              >
                <option value="">All Events</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="session_expired">Session Expired</option>
              </select>
            </div>

            <div className="lg:col-span-4">
              <label className="block text-12px font-semibold text-contentColor dark:text-contentColor-dark uppercase tracking-wide mb-10px invisible">
                Actions
              </label>
              <div className="flex gap-12px">
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-8px px-16px py-12px rounded-5 border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark text-14px font-medium text-blackColor dark:text-blackColor-dark hover:border-primaryColor hover:text-primaryColor transition-all duration-200"
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                >
                  <FiFilter size={16} />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-primaryColor text-whiteColor text-11px font-semibold px-8px py-2px rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center w-44px h-44px rounded-5 border border-primaryColor bg-whiteColor dark:bg-whiteColor-dark text-primaryColor hover:bg-primaryColor hover:text-whiteColor transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  title="Refresh"
                >
                  <FiRefreshCw 
                    size={16} 
                    className={isLoading ? 'animate-spin' : ''}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFiltersPanel && (
            <div className="mt-20px pt-20px border-t border-borderColor dark:border-borderColor-dark">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-15px md:gap-20px lg:gap-30px">
                <div>
                  <label className="block text-12px font-semibold text-contentColor dark:text-contentColor-dark uppercase tracking-wide mb-10px">
                    Role
                  </label>
                  <select
                    className="w-full px-16px py-12px rounded-5 border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark text-14px text-blackColor dark:text-blackColor-dark focus:outline-none focus:border-primaryColor transition-all duration-200"
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                  >
                    <option value="">All Roles</option>
                    <option value="superadmin">Superadmin</option>
                    <option value="admin">Admin</option>
                    <option value="instructor">Instructor</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                {isSuperadmin && (
                  <div>
                    <label className="block text-12px font-semibold text-contentColor dark:text-contentColor-dark uppercase tracking-wide mb-10px">
                      Organization
                    </label>
                    <select
                      className="w-full px-16px py-12px rounded-5 border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark text-14px text-blackColor dark:text-blackColor-dark focus:outline-none focus:border-primaryColor transition-all duration-200"
                      value={filters.orgId}
                      onChange={(e) => handleFilterChange('orgId', e.target.value)}
                    >
                      <option value="">All Organizations</option>
                      <option value="null">Global Users</option>
                      {/* TODO: Fetch and populate organizations */}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-12px font-semibold text-contentColor dark:text-contentColor-dark uppercase tracking-wide mb-10px">
                    Date From
                  </label>
                  <input
                    type="date"
                    className="w-full px-16px py-12px rounded-5 border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark text-14px text-blackColor dark:text-blackColor-dark focus:outline-none focus:border-primaryColor transition-all duration-200"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-12px font-semibold text-contentColor dark:text-contentColor-dark uppercase tracking-wide mb-10px">
                    Date To
                  </label>
                  <input
                    type="date"
                    className="w-full px-16px py-12px rounded-5 border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark text-14px text-blackColor dark:text-blackColor-dark focus:outline-none focus:border-primaryColor transition-all duration-200"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
                  <button
                    type="button"
                    className="flex items-center gap-8px text-14px font-medium text-contentColor dark:text-contentColor-dark hover:text-primaryColor transition-colors duration-200"
                    onClick={handleClearFilters}
                  >
                    <FiX size={16} />
                    Clear all filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-12px p-16px md:p-20px rounded-5 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800" role="alert">
          <FiX size={20} className="flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="text-14px leading-relaxed text-red-800 dark:text-red-200">
            <strong className="font-semibold">Error:</strong> {error.message || 'Failed to load audit logs'}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-15px md:gap-20px lg:gap-30px">
        <div className="bg-white dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-25px hover:shadow-lg dark:hover:shadow-lg-dark transition-all duration-200 hover:-translate-y-2px">
          <div className="flex items-center justify-between gap-12px">
            <div className="flex-1 min-w-0">
              <p className="text-12px font-medium text-contentColor dark:text-contentColor-dark mb-8px">Total Events</p>
              <h3 className="text-20px md:text-24px font-bold text-blackColor dark:text-blackColor-dark leading-tight break-words">
                {pagination.total.toLocaleString()}
              </h3>
            </div>
            <div className="bg-primaryColor/10 rounded-10px p-12px flex items-center justify-center w-48px h-48px flex-shrink-0">
              <FiClock size={20} className="text-primaryColor" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-25px hover:shadow-lg dark:hover:shadow-lg-dark transition-all duration-200 hover:-translate-y-2px">
          <div className="flex items-center justify-between gap-12px">
            <div className="flex-1 min-w-0">
              <p className="text-12px font-medium text-contentColor dark:text-contentColor-dark mb-8px">Login Events</p>
              <h3 className="text-20px md:text-24px font-bold text-blackColor dark:text-blackColor-dark leading-tight break-words">
                {items.filter((item) => item.eventType === 'login').length}
              </h3>
            </div>
            <div className="bg-green-100 dark:bg-green-900/20 rounded-10px p-12px flex items-center justify-center w-48px h-48px flex-shrink-0">
              <FiLogIn size={20} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-25px hover:shadow-lg dark:hover:shadow-lg-dark transition-all duration-200 hover:-translate-y-2px">
          <div className="flex items-center justify-between gap-12px">
            <div className="flex-1 min-w-0">
              <p className="text-12px font-medium text-contentColor dark:text-contentColor-dark mb-8px">Logout Events</p>
              <h3 className="text-20px md:text-24px font-bold text-blackColor dark:text-blackColor-dark leading-tight break-words">
                {items.filter((item) => item.eventType === 'logout').length}
              </h3>
            </div>
            <div className="bg-red-100 dark:bg-red-900/20 rounded-10px p-12px flex items-center justify-center w-48px h-48px flex-shrink-0">
              <FiLogOut size={20} className="text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-25px hover:shadow-lg dark:hover:shadow-lg-dark transition-all duration-200 hover:-translate-y-2px">
          <div className="flex items-center justify-between gap-12px">
            <div className="flex-1 min-w-0">
              <p className="text-12px font-medium text-contentColor dark:text-contentColor-dark mb-8px">Showing</p>
              <h3 className="text-20px md:text-24px font-bold text-blackColor dark:text-blackColor-dark leading-tight break-words">
                {items.length} / {pagination.total}
              </h3>
            </div>
            <div className="bg-cyan-100 dark:bg-cyan-900/20 rounded-10px p-12px flex items-center justify-center w-48px h-48px flex-shrink-0">
              <FiShield size={20} className="text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark overflow-hidden">
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="w-full min-w-[800px]">
            <thead className="bg-lightGrey5 dark:bg-whiteColor-dark border-b-2 border-borderColor dark:border-borderColor-dark">
              <tr>
                <th className="px-16px py-16px text-12px font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark whitespace-nowrap text-left">
                  Event Type
                </th>
                <th className="px-16px py-16px text-12px font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark whitespace-nowrap text-left">
                  User
                </th>
                <th className="px-16px py-16px text-12px font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark whitespace-nowrap text-left">
                  Role
                </th>
                {isSuperadmin && (
                  <th className="px-16px py-16px text-12px font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark whitespace-nowrap text-left">
                    Organization
                  </th>
                )}
                <th className="px-16px py-16px text-12px font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark whitespace-nowrap text-left">
                  Event Time
                </th>
                <th className="px-16px py-16px text-12px font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark whitespace-nowrap text-left">
                  IP Address
                </th>
                <th className="px-16px py-16px text-12px font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark whitespace-nowrap text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonLoader type="table" rows={filters.pageSize} columns={isSuperadmin ? 7 : 6} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={isSuperadmin ? 7 : 6} className="text-center p-40px md:p-60px">
                    <div className="flex flex-col items-center gap-15px">
                      <div className="w-80px h-80px rounded-full bg-lightGrey5 dark:bg-whiteColor-dark flex items-center justify-center">
                        <FiShield size={40} className="text-contentColor dark:text-contentColor-dark" />
                      </div>
                      <div className="text-center">
                        <p className="text-16px font-semibold text-blackColor dark:text-blackColor-dark mb-4px">No audit logs found</p>
                        <p className="text-14px text-contentColor dark:text-contentColor-dark">Try adjusting your filters to see more results</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`border-t border-borderColor dark:border-borderColor-dark hover:bg-lightGrey5 dark:hover:bg-whiteColor-dark transition-colors duration-150 ${index === 0 ? 'border-t-0' : ''}`}
                  >
                    <td className="px-16px py-16px align-middle">
                      <div className="flex items-center gap-8px">
                        {item.eventType === 'login' ? (
                          <FiLogIn size={16} className="flex-shrink-0 text-green-600 dark:text-green-400" />
                        ) : item.eventType === 'logout' ? (
                          <FiLogOut size={16} className="flex-shrink-0 text-red-600 dark:text-red-400" />
                        ) : (
                          <FiClock size={16} className="flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                        )}
                        <Badge
                          variant={
                            item.eventType === 'login'
                              ? 'success'
                              : item.eventType === 'logout'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {item.eventType?.charAt(0).toUpperCase() + item.eventType?.slice(1) || 'Unknown'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-16px py-16px align-middle">
                      <div className="flex flex-col gap-4px">
                        <span className="text-14px font-medium text-blackColor dark:text-blackColor-dark leading-relaxed break-words">
                          {item.userEmail}
                        </span>
                        {item.userId && (
                          <span className="text-12px text-contentColor dark:text-contentColor-dark">{item.userId.substring(0, 8)}...</span>
                        )}
                      </div>
                    </td>
                    <td className="px-16px py-16px align-middle">
                      <Badge variant="info">
                        {item.userRole?.charAt(0).toUpperCase() + item.userRole?.slice(1) || 'Unknown'}
                      </Badge>
                    </td>
                    {isSuperadmin && (
                      <td className="px-16px py-16px align-middle">
                        {item.orgId ? (
                          <div className="flex items-center gap-8px">
                            <FiHome size={14} className="flex-shrink-0 text-contentColor dark:text-contentColor-dark" />
                            <span className="text-14px text-blackColor dark:text-blackColor-dark break-words">{item.orgName || 'Unknown Org'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-8px">
                            <FiGlobe size={14} className="flex-shrink-0 text-contentColor dark:text-contentColor-dark" />
                            <span className="text-14px text-contentColor dark:text-contentColor-dark">Global</span>
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-16px py-16px align-middle">
                      <div className="flex flex-col gap-4px">
                        <span className="text-14px font-medium text-blackColor dark:text-blackColor-dark leading-relaxed" title={formatFullDateTime(item.eventTime)}>
                          {formatDateTime(item.eventTime)}
                        </span>
                        <span className="hidden md:flex items-center gap-4px text-12px text-contentColor dark:text-contentColor-dark">
                          <FiCalendar size={12} />
                          {formatFullDateTime(item.eventTime)}
                        </span>
                      </div>
                    </td>
                    <td className="px-16px py-16px align-middle">
                      <span className="text-13px text-contentColor dark:text-contentColor-dark font-mono break-all">
                        {item.ipAddress || 'N/A'}
                      </span>
                    </td>
                    <td className="px-16px py-16px align-middle text-right">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center px-8px py-4px rounded-5 text-contentColor dark:text-contentColor-dark hover:text-primaryColor hover:bg-primaryColor/10 transition-all duration-200"
                        title="View details"
                        onClick={() => {
                          // TODO: Implement details modal
                          console.log('View details for:', item.id);
                        }}
                      >
                        <FiUser size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark">
          <div className="p-20px md:p-25px">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-15px md:gap-20px">
              <div className="text-13px text-contentColor dark:text-contentColor-dark text-center sm:text-left">
                Showing <strong className="text-blackColor dark:text-blackColor-dark font-semibold">{((pagination.page - 1) * pagination.pageSize) + 1}</strong> to{' '}
                <strong className="text-blackColor dark:text-blackColor-dark font-semibold">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</strong> of{' '}
                <strong className="text-blackColor dark:text-blackColor-dark font-semibold">{pagination.total}</strong> events
              </div>
              <div className="flex gap-8px items-center flex-wrap justify-center">
                <button
                  type="button"
                  className="flex items-center gap-4px px-12px py-8px rounded-5 border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark text-13px font-medium text-contentColor dark:text-contentColor-dark hover:border-primaryColor hover:text-primaryColor transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  disabled={!pagination.hasPrevPage || isLoading}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  <FiChevronLeft size={16} />
                  <span className="hidden sm:inline">Previous</span>
                </button>
                <div className="flex gap-4px">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    const isActive = pagination.page === pageNum;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        className={`px-12px py-8px rounded-5 text-13px font-medium min-w-[36px] transition-all duration-200 ${
                          isActive
                            ? 'bg-primaryColor text-whiteColor border-none'
                            : 'border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark text-contentColor dark:text-contentColor-dark hover:border-primaryColor hover:text-primaryColor hover:bg-primaryColor/5'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={isLoading}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="flex items-center gap-4px px-12px py-8px rounded-5 border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark text-13px font-medium text-contentColor dark:text-contentColor-dark hover:border-primaryColor hover:text-primaryColor transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  disabled={!pagination.hasNextPage || isLoading}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  <span className="hidden sm:inline">Next</span>
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

