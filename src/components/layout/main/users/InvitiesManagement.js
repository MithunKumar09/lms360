"use client";

import { useCallback, useMemo, useState } from "react";
import { useInvities, useDeleteInvite } from "@/hooks/api/useInvities.js";
import { useUserAction } from "@/hooks/api/useUsers.js";
import { useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { getEndpoint } from "@/lib/api/endpoints.js";
import { useDebouncedValue } from "@/hooks/useDebouncedValue.js";
import { 
  FiSearch, 
  FiXCircle, 
  FiMail, 
  FiUser,
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiClock,
  FiSend,
  FiCheckCircle,
  FiTrash2,
  FiEye
} from "react-icons/fi";
import { 
  HiOutlineXCircle
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

function ActionButton({ onClick, children, disabled, variant = "outline-secondary", icon: Icon, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-sm btn-${variant} d-inline-flex align-items-center gap-1 ${disabled ? 'disabled' : ''} ${className}`}
      style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function ConfirmDeleteModal({ isOpen, onClose, onConfirm, inviteEmail, isLoading }) {
  if (!isOpen) return null;
  
  return (
    <div 
      className="modal fade show" 
      style={{ 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 1055,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }} 
      onClick={onClose}
    >
      <div 
        style={{ 
          maxWidth: '420px',
          width: '100%',
          margin: '0',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content shadow-lg border-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <div className="modal-header border-0 pb-0 pt-4 px-4">
            <div className="w-100 d-flex flex-column align-items-center text-center">
              <div 
                className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mb-3" 
                style={{ width: '64px', height: '64px' }}
              >
                <FiTrash2 size={28} className="text-danger" />
              </div>
              <h5 className="modal-title fw-bold mb-2" style={{ fontSize: '1.25rem' }}>
                Delete Invitation?
              </h5>
              <p className="text-muted mb-0 small" style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
                This action cannot be undone. The invitation for
              </p>
              <p className="text-dark fw-semibold mb-3 mt-1" style={{ fontSize: '0.9rem', wordBreak: 'break-word' }}>
                {inviteEmail}
              </p>
              <p className="text-muted mb-0 small" style={{ fontSize: '0.875rem' }}>
                will be permanently deleted.
              </p>
            </div>
            <button
              type="button"
              className="btn-close position-absolute"
              style={{ top: '1rem', right: '1rem' }}
              onClick={onClose}
              aria-label="Close"
              disabled={isLoading}
            ></button>
          </div>
          <div className="modal-body px-4 pb-3 pt-2">
            <div className="alert alert-warning border-0 mb-0 d-flex align-items-start gap-2" 
                 style={{ 
                   backgroundColor: '#fff3cd', 
                   borderRadius: '8px',
                   padding: '0.75rem',
                   fontSize: '0.8125rem'
                 }}
                 role="alert">
              <HiOutlineXCircle size={18} className="mt-0 flex-shrink-0 text-warning" style={{ marginTop: '2px' }} />
              <div>
                <strong className="text-dark">Note:</strong> You can send a new invitation to this email address later if needed.
              </div>
            </div>
          </div>
          <div className="modal-footer border-0 pt-0 pb-4 px-4 d-flex gap-2 justify-content-center">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
              disabled={isLoading}
              style={{ 
                minWidth: '100px',
                borderRadius: '8px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger d-inline-flex align-items-center gap-2"
              onClick={onConfirm}
              disabled={isLoading}
              style={{ 
                minWidth: '140px',
                borderRadius: '8px',
                fontWeight: '500'
              }}
            >
              {isLoading ? (
                <>
                  <div className="spinner-border spinner-border-sm" role="status" style={{ width: '14px', height: '14px' }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  Deleting...
                </>
              ) : (
                <>
                  <FiTrash2 size={16} />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvitiesManagement({ actorRole = "superadmin" }) {
  const queryClient = useQueryClient();
  const deleteInviteMutation = useDeleteInvite();
  const userAction = useUserAction();

  // UI state (local only)
  const [filters, setFilters] = useState({
    q: "",
    page: 1,
    pageSize: 15, // Max 15 per page as requested
  });

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    inviteId: null,
    inviteEmail: null,
  });

  const qDebounced = useDebouncedValue(filters.q, 300);

  // Build query filters for React Query
  const queryFilters = useMemo(() => {
    const params = {
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    };
    
    if (qDebounced) params.q = qDebounced;
    
    return params;
  }, [filters, qDebounced]);

  // Fetch invited users using React Query
  const { data, isLoading, error } = useInvities({
    filters: queryFilters,
    enabled: true,
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const setFilter = useCallback((k, v) => {
    setFilters((f) => ({ ...f, [k]: v, page: k === "page" ? v : 1 }));
  }, []);

  const handleDeleteClick = useCallback((inviteId, inviteEmail) => {
    setDeleteModal({
      isOpen: true,
      inviteId,
      inviteEmail,
    });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteModal.inviteId) return;

    try {
      await deleteInviteMutation.mutateAsync(deleteModal.inviteId);
      setDeleteModal({ isOpen: false, inviteId: null, inviteEmail: null });
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Delete invite error:', error);
    }
  }, [deleteModal.inviteId, deleteInviteMutation]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModal({ isOpen: false, inviteId: null, inviteEmail: null });
  }, []);

  return (
    <div className="w-100">
      {/* Error State */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
          <HiOutlineXCircle size={20} />
          <div>
            <strong>Error:</strong> {error.message || 'Failed to load invited users'}
          </div>
        </div>
      )}


      {/* Filters */}
      <div className="card mb-4 border-0 shadow-sm">
        <div className="card-header bg-white border-bottom">
          <div className="d-flex align-items-center gap-2">
            <FiSearch size={18} className="text-primary" />
            <h6 className="mb-0 fw-semibold">Search & Filter</h6>
          </div>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label small text-muted mb-1 d-inline-flex align-items-center">
                <FiSearch size={14} className="me-1" />
                Search
              </label>
              <input 
                className="form-control form-control-sm" 
                placeholder="Search email/name..." 
                value={filters.q} 
                onChange={(e) => setFilter("q", e.target.value)} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4 py-3 fw-semibold text-uppercase small text-start" style={{ fontSize: '0.75rem' }}>
                    <span className="d-inline-flex align-items-center">
                      <FiUser size={14} className="me-1" />
                      Email/Name
                    </span>
                  </th>
                  <th className="py-3 fw-semibold text-uppercase small text-center" style={{ fontSize: '0.75rem' }}>
                    <span className="d-inline-flex align-items-center justify-content-center">
                      <FiSend size={14} className="me-1" />
                      Invited At
                    </span>
                  </th>
                  <th className="py-3 fw-semibold text-uppercase small text-center" style={{ fontSize: '0.75rem' }}>
                    <span className="d-inline-flex align-items-center justify-content-center">
                      <FiCheckCircle size={14} className="me-1" />
                      Status
                    </span>
                  </th>
                  <th className="py-3 pe-4 fw-semibold text-uppercase small text-end" style={{ fontSize: '0.75rem' }}>
                    <span className="d-inline-flex align-items-center justify-content-end">
                      Actions
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-5">
                      <div className="d-flex justify-content-center align-items-center gap-2">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <span className="text-muted">Loading pending invites...</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-5">
                      <div className="d-flex flex-column align-items-center gap-2">
                        <FiMail size={48} className="text-muted opacity-50" />
                        <span className="text-muted">No pending invites found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((invite) => (
                    <tr key={invite.id} className="border-top">
                      <td className="ps-4 py-3">
                        <div className="d-flex flex-column">
                          <span className="fw-medium text-dark d-inline-flex align-items-center gap-1">
                            <FiMail size={14} className="text-muted" />
                            {invite.email}
                          </span>
                          {invite.first_name || invite.last_name ? (
                            <span className="small text-muted">
                              {[invite.first_name, invite.last_name].filter(Boolean).join(" ") || "-"}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        {invite.created_at ? (
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <FiCalendar size={14} className="text-muted" />
                            <span className="small text-muted">
                              {new Date(invite.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="small text-muted">-</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {invite.used_at ? (
                          <Badge 
                            variant="success"
                            className="text-white"
                          >
                            <FiCheckCircle size={12} className="me-1" />
                            Accepted
                          </Badge>
                        ) : (
                          <Badge 
                            variant="warning"
                            className="text-primary"
                          >
                            <FiClock size={12} className="me-1" />
                            Pending
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 pe-4">
                        <div className="d-flex gap-1 flex-wrap justify-content-end">
                          <ActionButton 
                            onClick={() => {}}
                            variant="outline-primary"
                            icon={FiEye}
                            disabled={true}
                            title="View details (coming soon)"
                          >
                            View
                          </ActionButton>
                          <ActionButton 
                            onClick={async () => {
                              try {
                                // Find user by email to get user ID
                                const userResponse = await apiClient.get(
                                  getEndpoint('users.list'),
                                  { q: invite.email, pageSize: '1' }
                                );
                                
                                if (userResponse.success && userResponse.items?.length > 0) {
                                  const user = userResponse.items[0];
                                  await userAction.mutateAsync({ id: user.id, action: "resend_invite" });
                                  // Invalidate invites list to refresh
                                  queryClient.invalidateQueries({ queryKey: ['invities', 'list'] });
                                } else {
                                  // If user doesn't exist yet, we can't resend invite
                                  alert("User not found. Cannot resend invite.");
                                }
                              } catch (error) {
                                console.error('Resend invite error:', error);
                                alert("Failed to resend invite: " + (error.message || "Unknown error"));
                              }
                            }}
                            variant="outline-info"
                            icon={FiMail}
                            disabled={userAction.isPending}
                          >
                            Resend
                          </ActionButton>
                          <ActionButton 
                            onClick={() => handleDeleteClick(invite.id, invite.email)}
                            variant="outline-danger"
                            icon={FiTrash2}
                            disabled={deleteInviteMutation.isPending}
                          >
                            Delete
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
                <strong className="text-dark">{total}</strong> pending invites
              </span>
            </div>
            <div className="d-flex align-items-center gap-2">
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

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        inviteEmail={deleteModal.inviteEmail}
        isLoading={deleteInviteMutation.isPending}
      />
    </div>
  );
}

