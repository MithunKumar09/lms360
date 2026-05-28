"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useUsers, useUserAction, useVerifiedUsersCount, useUnverifiedUsersCount, useDeleteUser } from "@/hooks/api/useUsers.js";
import { useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue.js";
import { useInvitiesCount } from "@/hooks/api/useInvities.js";
import CreateInviteUserForm from "./CreateInviteUserForm.js";
import BulkImportUsersForm from "./BulkImportUsersForm.js";
import InvitiesManagement from "./InvitiesManagement.js";
import UserFiltersPanel from "./UserFiltersPanel.js";
import BulkActionsToolbar from "./BulkActionsToolbar.js";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader.js";
import useInvitiesStore from "@/store/invitiesStore.js";
import { useBulkAction } from "@/hooks/api/useBulkOperations.js";
import apiClient from "@/lib/api/client.js";
import EditUserModal from "./EditUserModal.js";
import {
  FiUserPlus,
  FiUpload,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiMail,
  FiKey,
  FiShield,
  FiUserX,
  FiUserCheck,
  FiLogOut,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiUsers,
  FiCalendar,
  FiBriefcase,
  FiTag,
  FiSend,
  FiEdit3
} from "react-icons/fi";
import {
  HiOutlineBadgeCheck,
  HiOutlineXCircle,
  HiOutlineClock
} from "react-icons/hi";

function Badge({ children, variant = "primary", className = "" }) {
  const variants = {
    primary: "bg-primary bg-opacity-10 text-primary fw-semibold border border-primary border-opacity-20",
    success: "bg-success bg-opacity-10 text-success fw-semibold border border-success border-opacity-20",
    danger: "bg-danger bg-opacity-10 text-danger fw-semibold border border-danger border-opacity-20",
    warning: "bg-warning bg-opacity-10 text-warning fw-semibold border border-warning border-opacity-20",
    info: "bg-info bg-opacity-10 text-info fw-semibold border border-info border-opacity-20",
  };
  return (
    <span className={`badge rounded-pill d-inline-flex align-items-center gap-1 ${variants[variant] || variants.primary} ${className}`}>
      {children}
    </span>
  );
}

function ActionButton({ onClick, children, disabled, variant = "outline-secondary", icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-sm btn-${variant} d-inline-flex align-items-center gap-1 ${disabled ? 'disabled' : ''}`}
      style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="users-modal modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1055 }} onClick={(e) => {
      // Only close if clicking directly on the backdrop, not on bubbled events
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content shadow-lg">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-semibold">{title}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UsersListMain({ actorRole = "superadmin" }) {
  const isSuperadmin = actorRole === "superadmin";
  const isAdmin = actorRole === "admin";
  const isInstructor = actorRole === "instructor";
  const queryClient = useQueryClient();

  // View state from Zustand store
  const currentView = useInvitiesStore((state) => state.currentView);
  const setView = useInvitiesStore((state) => state.setView);

  // Fetch counts
  const { count: pendingInvitesCount } = useInvitiesCount({ enabled: true });
  const { count: verifiedUsersCount } = useVerifiedUsersCount({ enabled: true });
  const { count: unverifiedUsersCount } = useUnverifiedUsersCount({ enabled: true });

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // UI state (local only)
  const [filters, setFilters] = useState({
    q: "",
    role: "",
    status: "",
    verified: "all",
    orgId: "",
    cohortId: "",
    vendor_category: "",
    dateFrom: "",
    dateTo: "",
    page: 1,
    pageSize: 20,
    sort: "created_at:desc",
  });

  // Row selection state
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Track which user is being deleted (to show loading state per user)
  const [deletingUserId, setDeletingUserId] = useState(null);

  // Bulk operations
  const bulkAction = useBulkAction();

  const qDebounced = useDebouncedValue(filters.q, 300);

  // Build query filters for React Query
  const queryFilters = useMemo(() => {
    const params = {
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    };

    if (qDebounced) params.q = qDebounced;
    if (filters.role) params.role = filters.role;
    if (filters.status) params.status = filters.status;
    if (filters.verified !== "all") params.verified = filters.verified;
    if (isSuperadmin && filters.orgId) params.orgId = filters.orgId;
    if ((isAdmin || isInstructor) && filters.cohortId) params.cohortId = filters.cohortId;
    if (filters.vendor_category) params.vendor_category = filters.vendor_category;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.sort) params.sort = filters.sort;

    return params;
  }, [filters, qDebounced, isSuperadmin, isAdmin, isInstructor]);

  // Fetch users using React Query
  const { data, isLoading, error } = useUsers({
    filters: queryFilters,
    enabled: true,
  });

  const items = useMemo(() => data?.items || [], [data?.items]);
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  // Debug logging
  // useEffect(() => {
  //   if (data?.items) {
  //     console.log('🔍 [USERS DEBUG] ===== USERS DATA RETRIEVED =====');
  //     console.log('🔍 [USERS DEBUG] Total users:', total);
  //     console.log('🔍 [USERS DEBUG] Items count:', items.length);
  //     if (items.length > 0) {
  //       console.log('🔍 [USERS DEBUG] First user data:', JSON.stringify(items[0], null, 2));
  //             console.log('🔍 [USERS DEBUG] First user role:', items[0].role);
  //             console.log('🔍 [USERS DEBUG] First user roles (array):', items[0].roles, 'Type:', typeof items[0].roles);
  //             console.log('🔍 [USERS DEBUG] First user org_label:', items[0].org_label);
  //             console.log('🔍 [USERS DEBUG] First user last_login_at:', items[0].last_login_at);
  //       console.log('🔍 [USERS DEBUG] First user active_sessions:', items[0].active_sessions);
  //     }
  //     console.log('🔍 [USERS DEBUG] ===== END DEBUG =====');
  //   }
  // }, [data, items, total]);

  // User actions mutation
  const userAction = useUserAction();
  const deleteUser = useDeleteUser();

  const setFilter = useCallback((k, v) => {
    setFilters((f) => ({ ...f, [k]: v, page: k === "page" ? v : 1 }));
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback((clearedFilters) => {
    setFilters(clearedFilters);
  }, []);

  // Row selection handlers
  const handleSelectUser = useCallback((userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedUsers(items.map(u => u.id));
  }, [items]);

  const handleDeselectAll = useCallback(() => {
    setSelectedUsers([]);
  }, []);

  // Bulk action handler
  const handleBulkAction = useCallback(async (action, userIds, options = {}) => {
    try {
      await bulkAction.mutateAsync({
        user_ids: userIds,
        action,
        options,
      });
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    } catch (error) {
      console.error('Bulk action error:', error);
    }
  }, [bulkAction, queryClient]);

  const doAction = useCallback(async (id, action, body = {}) => {
    try {
      await userAction.mutateAsync({ id, action, ...body });
    } catch (e) {
      // Error is handled by the mutation hook
      console.error('User action error:', e);
    }
  }, [userAction]);

  const handleCreateSuccess = useCallback(() => {
    setShowCreateModal(false);
    // Invalidate and refetch users list using React Query
    queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    // Invalidate invites count
    queryClient.invalidateQueries({ queryKey: ['invities', 'count'] });
    // Invalidate user counts
    queryClient.invalidateQueries({ queryKey: ['users', 'count'] });
    // Optionally trigger a refetch immediately
    queryClient.refetchQueries({ queryKey: ['users', 'list'] });
  }, [queryClient]);

  const handleBulkImportSuccess = useCallback(() => {
    setShowBulkImportModal(false);
    // Invalidate and refetch users list using React Query
    queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    // Invalidate invites count
    queryClient.invalidateQueries({ queryKey: ['invities', 'count'] });
    // Invalidate user counts
    queryClient.invalidateQueries({ queryKey: ['users', 'count'] });
    // Optionally trigger a refetch immediately
    queryClient.refetchQueries({ queryKey: ['users', 'list'] });
  }, [queryClient]);

  // Export handler
  const handleExport = useCallback(async (format = 'csv') => {
    try {
      const params = new URLSearchParams();
      params.set('format', format);

      // Add current filters
      if (filters.q) params.set('q', filters.q);
      if (filters.role) params.set('role', filters.role);
      if (filters.status) params.set('status', filters.status);
      if (filters.verified !== 'all') params.set('verified', filters.verified);
      if (filters.orgId) params.set('orgId', filters.orgId);
      if (filters.cohortId) params.set('cohortId', filters.cohortId);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.sort) params.set('sort', filters.sort);

      const url = `/api/users/export?${params.toString()}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [filters]);

  // Show Invities Management if current view is 'invities'
  if (currentView === 'invities') {
    return (
      <div className="w-100 d-flex flex-column gap-4">
        {/* Navigation Tabs */}
        <div className="card mb-4 border-0 shadow-sm">
          <div className="card-body p-3">
            <div className="d-flex gap-2 flex-wrap" role="group">
              <button
                type="button"
                className="btn btn-outline-primary d-inline-flex align-items-center"
                onClick={() => setView('users')}
              >
                <FiUsers size={16} className="me-1" />
                Users List
              </button>
              <button
                type="button"
                className="btn btn-primary d-inline-flex align-items-center position-relative"
                onClick={() => setView('invities')}
                style={{ paddingRight: pendingInvitesCount > 0 ? '2.5rem' : undefined }}
              >
                <FiSend size={16} className="me-1" />
                Invities
                {pendingInvitesCount > 0 && (
                  <span
                    className="position-absolute badge rounded-pill bg-danger text-white d-flex align-items-center justify-content-center"
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      padding: pendingInvitesCount > 9 ? '0.2em 0.5em' : '0.2em 0.4em',
                      minWidth: '1.4rem',
                      height: '1.4rem',
                      lineHeight: '1',
                      top: '-0.4rem',
                      right: '-0.4rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      border: '2px solid white'
                    }}
                  >
                    {pendingInvitesCount > 99 ? '99+' : pendingInvitesCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Invities Management Component */}
        <InvitiesManagement actorRole={actorRole} />
      </div>
    );
  }

  return (
    <div className="w-100 d-flex flex-column gap-4">
{/* Header */}
<div className="rounded-4 border bg-gradient-to-r from-primaryColor/[0.04] via-whiteColor to-whiteColor p-4 p-lg-5 shadow-sm dark:from-primaryColor/[0.08] dark:via-whiteColor-dark dark:to-whiteColor-dark">
  
  <div className="row g-4 align-items-stretch">

    {/* Left Content */}
    <div className="col-12">
      <div className="mb-2">
        <h1
          className="fw-bold text-dark mb-3"
          style={{
            fontSize: "2rem",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          Users Management
        </h1>

        <p
          className="mb-0 text-muted"
          style={{
            lineHeight: 1.8,
            fontSize: "0.98rem",
            maxWidth: "900px",
          }}
        >
          Manage platform users, invitations, permissions,
          verification states, sessions, and access controls.
        </p>
      </div>
    </div>

{/* Metrics */}
<div className="col-12">
  <div className="d-flex flex-column flex-md-row gap-4 w-100">

    {/* Total Users */}
    <div className="flex-fill">
      <div className="h-100 rounded-4 border bg-whiteColor px-4 py-4 shadow-sm dark:bg-whiteColor-dark">

        <div
          className="text-uppercase text-muted fw-semibold mb-2"
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.14em",
          }}
        >
          Total Users
        </div>

        <div
          className="fw-bold text-dark"
          style={{
            fontSize: "2.4rem",
            lineHeight: 1,
          }}
        >
          {total}
        </div>

      </div>
    </div>

    {/* Verified */}
    <div className="flex-fill">
      <div className="h-100 rounded-4 border bg-whiteColor px-4 py-4 shadow-sm dark:bg-whiteColor-dark">

        <div
          className="text-uppercase text-muted fw-semibold mb-2"
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.14em",
          }}
        >
          Verified
        </div>

        <div
          className="fw-bold text-success"
          style={{
            fontSize: "2.4rem",
            lineHeight: 1,
          }}
        >
          {verifiedUsersCount}
        </div>

      </div>
    </div>

    {/* Pending */}
    <div className="flex-fill">
      <div className="h-100 rounded-4 border bg-whiteColor px-4 py-4 shadow-sm dark:bg-whiteColor-dark">

        <div
          className="text-uppercase text-muted fw-semibold mb-2"
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.14em",
          }}
        >
          Pending
        </div>

        <div
          className="fw-bold text-danger"
          style={{
            fontSize: "2.4rem",
            lineHeight: 1,
          }}
        >
          {unverifiedUsersCount}
        </div>

      </div>
    </div>

  </div>
</div>

  </div>
</div>

      {/* Action Buttons */}
      <div className="d-flex flex-column flex-xl-row justify-content-between align-items-start align-items-xl-center gap-4 mb-4 p-4 rounded-4 border bg-whiteColor dark:bg-whiteColor-dark shadow-sm">
        <div className="dropdown">
          <button
            type="button"
            className="btn d-inline-flex align-items-center gap-2 rounded-4 border-0 px-4 py-3 shadow-sm"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <FiUpload size={18} />
            Export
          </button>
          <ul className="dropdown-menu">
            <li>
              <button
                className="dropdown-item"
                onClick={() => handleExport('csv')}
              >
                Export as CSV
              </button>
            </li>
            <li>
              <button
                className="dropdown-item"
                onClick={() => handleExport('json')}
              >
                Export as JSON
              </button>
            </li>
            <li>
              <button
                className="dropdown-item"
                onClick={() => handleExport('xlsx')}
              >
                Export as Excel
              </button>
            </li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setShowBulkImportModal(true)}
          className="btn btn-outline-primary d-inline-flex align-items-center gap-2 rounded-4 px-4 py-3 fw-semibold"
        >
          <FiUpload size={18} />
          Bulk Import
        </button>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary d-inline-flex align-items-center gap-2 rounded-4 px-4 py-3 fw-semibold shadow-lg"
        >
          <FiUserPlus size={18} />
          Create New User
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
          <HiOutlineXCircle size={20} />
          <div>
            <strong>Error:</strong> {error.message || 'Failed to load users'}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-0 rounded-4 shadow-sm overflow-hidden bg-whiteColor dark:bg-whiteColor-dark">
        <div className="p-4">
          <div className="d-flex gap-3 flex-wrap" role="group">
            <button
              type="button"
              className={`btn d-inline-flex align-items-center rounded-4 px-4 py-3 fw-semibold shadow-sm position-relative ${filters.verified === "true" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setFilter("verified", "true")}
              style={{ paddingRight: verifiedUsersCount > 0 ? '2.5rem' : undefined }}
            >
              <HiOutlineBadgeCheck size={16} className="me-1" />
              Verified
              {verifiedUsersCount > 0 && (
                <span
                  className="position-absolute badge rounded-pill bg-danger text-white d-flex align-items-center justify-content-center"
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    padding: verifiedUsersCount > 9 ? '0.2em 0.5em' : '0.2em 0.4em',
                    minWidth: '1.4rem',
                    height: '1.4rem',
                    lineHeight: '1',
                    top: '-0.4rem',
                    right: '-0.4rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    border: '2px solid white'
                  }}
                >
                  {verifiedUsersCount > 99 ? '99+' : verifiedUsersCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`btn d-inline-flex align-items-center position-relative ${filters.verified === "false" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setFilter("verified", "false")}
              style={{ paddingRight: unverifiedUsersCount > 0 ? '2.5rem' : undefined }}
            >
              <HiOutlineXCircle size={16} className="me-1" />
              Unverified
              {unverifiedUsersCount > 0 && (
                <span
                  className="position-absolute badge rounded-pill bg-danger text-white d-flex align-items-center justify-content-center"
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    padding: unverifiedUsersCount > 9 ? '0.2em 0.5em' : '0.2em 0.4em',
                    minWidth: '1.4rem',
                    height: '1.4rem',
                    lineHeight: '1',
                    top: '-0.4rem',
                    right: '-0.4rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    border: '2px solid white'
                  }}
                >
                  {unverifiedUsersCount > 99 ? '99+' : unverifiedUsersCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`btn d-inline-flex align-items-center ${filters.verified === "all" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setFilter("verified", "all")}
            >
              <FiUsers size={16} className="me-1" />
              All
            </button>
            <button
              type="button"
              className="btn btn-outline-primary d-inline-flex align-items-center position-relative"
              onClick={() => setView('invities')}
              style={{ paddingRight: pendingInvitesCount > 0 ? '2.5rem' : undefined }}
            >
              <FiSend size={16} className="me-1" />
              Invities
              {pendingInvitesCount > 0 && (
                <span
                  className="position-absolute badge rounded-pill bg-danger text-white d-flex align-items-center justify-content-center"
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    padding: pendingInvitesCount > 9 ? '0.2em 0.5em' : '0.2em 0.4em',
                    minWidth: '1.4rem',
                    height: '1.4rem',
                    lineHeight: '1',
                    top: '-0.4rem',
                    right: '-0.4rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    border: '2px solid white'
                  }}
                >
                  {pendingInvitesCount > 99 ? '99+' : pendingInvitesCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-4 border bg-whiteColor dark:bg-whiteColor-dark shadow-sm p-3">
        {/* Advanced Filters Panel */}
        <UserFiltersPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          actorRole={actorRole}
          organizations={[]} // TODO: Fetch organizations if needed
          cohorts={[]} // TODO: Fetch cohorts if needed
          isOpen={showFiltersPanel}
          onToggle={() => setShowFiltersPanel(!showFiltersPanel)}
        />

      </div>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedUsers={selectedUsers}
        totalUsers={total}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onBulkAction={handleBulkAction}
        isLoading={bulkAction.isPending}
        actorRole={actorRole}
      />

      {/* Table */}
      <div className="border rounded-4 overflow-hidden bg-whiteColor dark:bg-whiteColor-dark shadow-sm mb-4">
        <div className="p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th className="ps-4 py-3 fw-semibold text-uppercase small" style={{ fontSize: '0.75rem', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedUsers.length > 0 && selectedUsers.length === items.length}
                      onChange={selectedUsers.length === items.length ? handleDeselectAll : handleSelectAll}
                      className="form-check-input"
                    />
                  </th>
                  <th className="py-4 fw-bold text-uppercase text-muted" style={{ fontSize: '0.75rem' }}>Name/Email</th>
                  <th className="py-4 fw-bold text-uppercase text-muted" style={{ fontSize: '0.75rem' }}>Role</th>
                  <th className="py-4 fw-bold text-uppercase text-muted" style={{ fontSize: '0.75rem' }}>Organization</th>
                  <th className="py-4 fw-bold text-uppercase text-muted" style={{ fontSize: '0.75rem' }}>Verified</th>
                  <th className="py-4 fw-bold text-uppercase text-muted" style={{ fontSize: '0.75rem' }}>Last Login</th>
                  <th className="py-4 fw-bold text-uppercase text-muted" style={{ fontSize: '0.75rem' }}>Active Sessions</th>
                  <th className="py-4 fw-bold text-uppercase text-muted" style={{ fontSize: '0.75rem' }}>Status</th>
                  <th className="pe-4 py-3 fw-semibold text-uppercase small text-end" style={{ fontSize: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <SkeletonLoader type="table" rows={filters.pageSize} columns={9} />
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5">
                      <div className="d-flex flex-column align-items-center gap-2">
                        <FiUsers size={48} className="text-muted opacity-50" />
                        <span className="text-muted">No users found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((u) => (
                    <tr key={u.id} className="border-top" style={{ transition: "all 0.25s ease" }}>
                      <td className="ps-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={() => handleSelectUser(u.id)}
                          className="form-check-input"
                        />
                      </td>
                      <td className="py-3">
                        <div className="d-flex flex-column">
                          <span className="fw-bold text-dark">
                            {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}
                          </span>
                          <span className="small text-muted mt-1">{u.email}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        {u.role ? (
                          <Badge variant="info" className="text-dark fw-semibold">{u.role}</Badge>
                        ) : (
                          <span className="small text-muted">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="small text-muted">{u.org_label || "-"}</span>
                      </td>
                      <td className="py-3">
                        {u.email_verified_at ? (
                          <Badge variant="success">
                            <FiCheckCircle size={12} className="me-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="danger">
                            <FiXCircle size={12} className="me-1" />
                            No
                          </Badge>
                        )}
                      </td>
                      <td className="py-3">
                        {u.last_login_at ? (
                          <div className="d-flex align-items-center gap-1">
                            <HiOutlineClock size={14} className="text-muted" />
                            <span className="small text-muted">
                              {new Date(u.last_login_at).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="small text-muted">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="badge rounded-pill bg-dark px-3 py-2 fw-semibold">{u.active_sessions ?? 0}</span>
                      </td>
                      <td className="py-3">
                        {u.status === "active" ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="danger">Suspended</Badge>
                        )}
                      </td>
                      <td className="pe-4 py-3">
                        <div className="d-flex gap-1 flex-wrap justify-content-end">
                          <ActionButton
                            onClick={() => window.location.assign(`/dashboards/${actorRole}-users/${u.id}`)}
                            variant="outline-primary"
                            icon={FiEye}
                          >
                            View
                          </ActionButton>
                          {(actorRole === "admin" || actorRole === "superadmin") && (
                            <ActionButton
                              onClick={() => {
                                setEditingUser(u);
                                setShowEditModal(true);
                              }}
                              variant="outline-info"
                              icon={FiEdit3}
                            >
                              Edit
                            </ActionButton>
                          )}
                          <ActionButton
                            onClick={() => doAction(u.id, "force_reset_password")}
                            variant="outline-warning"
                            icon={FiKey}
                          >
                            Reset
                          </ActionButton>
                          <ActionButton
                            onClick={() => doAction(u.id, "toggle_mfa", { enable: !(u.mfa_required ?? false) })}
                            disabled={userAction.isPending}
                            variant="outline-info"
                            icon={FiShield}
                          >
                            MFA
                          </ActionButton>
                          {u.status === "active" ? (
                            <ActionButton
                              onClick={() => doAction(u.id, "suspend")}
                              disabled={userAction.isPending}
                              variant="outline-danger"
                              icon={FiUserX}
                            >
                              Suspend
                            </ActionButton>
                          ) : (
                            <ActionButton
                              onClick={() => doAction(u.id, "activate")}
                              disabled={userAction.isPending}
                              variant="outline-success"
                              icon={FiUserCheck}
                            >
                              Activate
                            </ActionButton>
                          )}
                          <ActionButton
                            onClick={() => doAction(u.id, "revoke_sessions")}
                            disabled={userAction.isPending}
                            variant="outline-secondary"
                            icon={FiLogOut}
                          >
                            Revoke
                          </ActionButton>
                          <ActionButton
                            onClick={async () => {
                              console.log('🗑️ [DELETE] ===== DELETE BUTTON CLICKED =====');
                              console.log('🗑️ [DELETE] User ID:', u.id);
                              console.log('🗑️ [DELETE] User Email:', u.email);
                              console.log('🗑️ [DELETE] User Name:', [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email);

                              if (window.confirm(`Are you sure you want to delete ${u.email}? This action cannot be undone.`)) {
                                console.log('🗑️ [DELETE] ✅ User confirmed deletion');
                                setDeletingUserId(u.id);

                                try {
                                  console.log('🗑️ [DELETE] 🚀 Starting delete mutation...');
                                  console.log('🗑️ [DELETE] Mutation state - isPending:', deleteUser.isPending);

                                  const result = await deleteUser.mutateAsync(u.id);

                                  console.log('🗑️ [DELETE] ✅ Delete mutation completed successfully');
                                  console.log('🗑️ [DELETE] Result:', result);
                                  console.log('🗑️ [DELETE] User should now be removed from database');

                                  // Success is handled by the mutation hook
                                } catch (error) {
                                  console.error('🗑️ [DELETE] ❌ Delete mutation failed');
                                  console.error('🗑️ [DELETE] Error:', error);
                                  console.error('🗑️ [DELETE] Error message:', error.message);
                                  console.error('🗑️ [DELETE] Error stack:', error.stack);
                                  // Error is handled by the mutation hook
                                } finally {
                                  console.log('🗑️ [DELETE] 🧹 Cleaning up - resetting deletingUserId state');
                                  setDeletingUserId(null);
                                  console.log('🗑️ [DELETE] ===== DELETE PROCESS COMPLETE =====');
                                }
                              } else {
                                console.log('🗑️ [DELETE] ❌ User cancelled deletion');
                              }
                            }}
                            disabled={deletingUserId === u.id || deleteUser.isPending || userAction.isPending}
                            variant="outline-danger"
                            icon={FiTrash2}
                          >
                            {deletingUserId === u.id ? 'Deleting...' : 'Delete'}
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small">
                <strong className="text-dark">{total}</strong> total users
              </span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <label className="small text-muted mb-0 me-2">Items per page:</label>
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={filters.pageSize}
                onChange={(e) => setFilter("pageSize", Number(e.target.value))}
              >
                {[10, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <nav aria-label="Page navigation">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${filters.page <= 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      disabled={filters.page <= 1}
                      onClick={() => setFilter("page", filters.page - 1)}
                      aria-label="Previous"
                    >
                      <FiChevronLeft size={16} />
                    </button>
                  </li>
                  <li className="page-item">
                    <span className="page-link">
                      Page {filters.page} of {totalPages}
                    </span>
                  </li>
                  <li className={`page-item ${filters.page >= totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      disabled={filters.page >= totalPages}
                      onClick={() => setFilter("page", filters.page + 1)}
                      aria-label="Next"
                    >
                      <FiChevronRight size={16} />
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create or Invite User"
      >
        <CreateInviteUserForm actorRole={actorRole} onSuccess={handleCreateSuccess} />
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        title="Bulk Import Users"
      >
        <BulkImportUsersForm actorRole={actorRole} onSuccess={handleBulkImportSuccess} />
      </Modal>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
            // Invalidate and refetch users list
            queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
          }}
          actorRole={actorRole}
        />
      )}
    </div>
  );
}
