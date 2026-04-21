"use client";

import { useState, useCallback } from "react";
import { 
  FiCheckSquare, 
  FiSquare, 
  FiUserCheck, 
  FiUserX, 
  FiTrash2,
  FiTag,
  FiMoreVertical,
  FiX
} from "react-icons/fi";
import useSweetAlert from "@/hooks/useSweetAlert";

/**
 * BulkActionsToolbar Component
 * 
 * Toolbar for bulk actions on selected users:
 * - Row selection (select all/none)
 * - Bulk action buttons (activate, suspend, delete, assign role)
 * - Confirmation modals
 * - Progress indicator
 */
export default function BulkActionsToolbar({
  selectedUsers = [],
  totalUsers = 0,
  onSelectAll,
  onDeselectAll,
  onBulkAction,
  isLoading = false,
  actorRole = "superadmin"
}) {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const createAlert = useSweetAlert();

  const isSuperadmin = actorRole === "superadmin";
  const isAdmin = actorRole === "admin";
  const canDelete = isSuperadmin; // Only superadmin can delete

  const allSelected = selectedUsers.length > 0 && selectedUsers.length === totalUsers;
  const someSelected = selectedUsers.length > 0 && selectedUsers.length < totalUsers;

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  }, [allSelected, onSelectAll, onDeselectAll]);

  const handleBulkActionClick = useCallback((action, options = {}) => {
    if (selectedUsers.length === 0) {
      createAlert('warning', 'Please select at least one user');
      return;
    }

    // Confirmations for destructive actions
    if (action === 'delete') {
      setPendingAction({ action, options });
      setShowConfirmModal(true);
      return;
    }

    if (action === 'suspend') {
      setPendingAction({ action, options });
      setShowConfirmModal(true);
      return;
    }

    // Direct execution for non-destructive actions
    onBulkAction(action, selectedUsers, options);
  }, [selectedUsers, onBulkAction, createAlert]);

  const handleConfirmAction = useCallback(() => {
    if (pendingAction) {
      onBulkAction(pendingAction.action, selectedUsers, pendingAction.options);
      setShowConfirmModal(false);
      setPendingAction(null);
    }
  }, [pendingAction, selectedUsers, onBulkAction]);

  if (selectedUsers.length === 0 && !showActionMenu) {
    return null;
  }

  const actionLabels = {
    activate: 'Activate',
    suspend: 'Suspend',
    delete: 'Delete',
    assign_role: 'Assign Role',
    remove_role: 'Remove Role',
  };

  const confirmMessages = {
    activate: `Are you sure you want to activate ${selectedUsers.length} user(s)?`,
    suspend: `Are you sure you want to suspend ${selectedUsers.length} user(s)?`,
    delete: `Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`,
  };

  return (
    <>
      <div className="card mb-3 border-0 shadow-sm bg-primary bg-opacity-10">
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-3">
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-dark"
                onClick={handleSelectAll}
                disabled={isLoading}
              >
                {allSelected ? (
                  <FiCheckSquare size={20} className="text-primary" />
                ) : (
                  <FiSquare size={20} />
                )}
              </button>
              <span className="small fw-medium">
                {selectedUsers.length} of {totalUsers} selected
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              {selectedUsers.length > 0 && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-success d-inline-flex align-items-center gap-1"
                    onClick={() => handleBulkActionClick('activate')}
                    disabled={isLoading}
                  >
                    <FiUserCheck size={14} />
                    Activate
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-warning d-inline-flex align-items-center gap-1"
                    onClick={() => handleBulkActionClick('suspend')}
                    disabled={isLoading}
                  >
                    <FiUserX size={14} />
                    Suspend
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger d-inline-flex align-items-center gap-1"
                      onClick={() => handleBulkActionClick('delete')}
                      disabled={isLoading}
                    >
                      <FiTrash2 size={14} />
                      Delete
                    </button>
                  )}
                  <div className="dropdown">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                      onClick={() => setShowActionMenu(!showActionMenu)}
                      disabled={isLoading}
                    >
                      <FiMoreVertical size={14} />
                      More
                    </button>
                    {showActionMenu && (
                      <div className="dropdown-menu show" style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.25rem' }}>
                        <button
                          className="dropdown-item small d-flex align-items-center gap-2"
                          onClick={() => {
                            const roleCode = prompt('Enter role code (admin, instructor, student, etc.):');
                            if (roleCode) {
                              handleBulkActionClick('assign_role', { role_code: roleCode });
                            }
                            setShowActionMenu(false);
                          }}
                        >
                          <FiTag size={14} />
                          Assign Role
                        </button>
                        <button
                          className="dropdown-item small d-flex align-items-center gap-2"
                          onClick={() => {
                            const roleCode = prompt('Enter role code to remove:');
                            if (roleCode) {
                              handleBulkActionClick('remove_role', { role_code: roleCode });
                            }
                            setShowActionMenu(false);
                          }}
                        >
                          <FiTag size={14} />
                          Remove Role
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-dark p-0"
                    onClick={onDeselectAll}
                    disabled={isLoading}
                  >
                    <FiX size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingAction && (
        <div 
          className="modal fade show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
          onClick={() => setShowConfirmModal(false)}
        >
          <div 
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Action</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConfirmModal(false)}
                />
              </div>
              <div className="modal-body">
                <p>{confirmMessages[pendingAction.action] || 'Are you sure?'}</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn ${
                    pendingAction.action === 'delete' ? 'btn-danger' : 
                    pendingAction.action === 'suspend' ? 'btn-warning' : 
                    'btn-primary'
                  }`}
                  onClick={handleConfirmAction}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

