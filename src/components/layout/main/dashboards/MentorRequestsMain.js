"use client";

import { useState, useMemo } from "react";
import { useMentorRequestsList, useAcceptRegistrationRequest, useRejectRegistrationRequest } from "@/hooks/api/useVendorMentorRequests";
import useSweetAlert from "@/hooks/useSweetAlert";

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-whiteColor dark:bg-whiteColor-dark border-b border-borderColor dark:border-borderColor-dark px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-blackColor dark:text-blackColor-dark">{title}</h2>
          <button
            onClick={onClose}
            className="text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function MentorRequestsMain() {
  const createAlert = useSweetAlert();
  
  // UI state
  const [filters, setFilters] = useState({
    status: "pending",
    search: "",
    page: 1,
    limit: 20,
  });
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch requests
  const { data: requestsData, isLoading, refetch } = useMentorRequestsList(filters, {
    enabled: true,
  });

  const requests = requestsData?.requests || [];
  const pagination = requestsData?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  };

  // Mutations
  const acceptRequest = useAcceptRegistrationRequest({
    onSuccess: () => {
      setShowAcceptModal(false);
      setSelectedRequest(null);
      refetch();
    },
  });

  const rejectRequest = useRejectRegistrationRequest({
    onSuccess: () => {
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason("");
      refetch();
    },
  });

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleAccept = (request) => {
    if (!request.organization?.id) {
      createAlert("error", "This mentor request does not have an organization assigned");
      return;
    }
    setSelectedRequest(request);
    setShowAcceptModal(true);
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleAcceptSubmit = async () => {
    // For mentors, organization is already in the request
    await acceptRequest.mutateAsync({
      requestId: selectedRequest.id,
    });
  };

  const handleRejectSubmit = async () => {
    await rejectRequest.mutateAsync({
      requestId: selectedRequest.id,
      rejectionReason: rejectionReason || null,
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return badges[status] || badges.pending;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const filteredRequests = useMemo(() => {
    if (!filters.search) return requests;
    const search = filters.search.toLowerCase();
    return requests.filter((request) => {
      return (
        request.email?.toLowerCase().includes(search) ||
        request.first_name?.toLowerCase().includes(search) ||
        request.last_name?.toLowerCase().includes(search) ||
        `${request.first_name} ${request.last_name}`.toLowerCase().includes(search) ||
        request.organization?.name?.toLowerCase().includes(search)
      );
    });
  }, [requests, filters.search]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Mentor Registration Requests</h1>
              <p className="text-muted mb-0 small">
                Review and manage mentor registration requests
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name, email, or organization..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-contentColor dark:text-contentColor-dark">Loading requests...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRequests.length === 0 && (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            No {filters.status} requests found
          </p>
        </div>
      )}

      {/* Requests List */}
      {!isLoading && filteredRequests.length > 0 && (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Request Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-darkdeep4 flex-shrink-0 flex items-center justify-center">
                    <div className="w-full h-full flex items-center justify-center bg-primaryColor/20 text-primaryColor text-xl font-bold">
                      {(request.first_name?.[0] || request.email?.[0] || "M").toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                        {`${request.first_name || ""} ${request.last_name || ""}`.trim() || request.email || "Unknown"}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-contentColor dark:text-contentColor-dark">
                      <p>
                        <span className="font-semibold">Email:</span> {request.email}
                      </p>
                      <p>
                        <span className="font-semibold">Phone:</span> {request.phone || "N/A"}
                      </p>
                      {request.organization && (
                        <p>
                          <span className="font-semibold">Organization:</span> {request.organization.name || request.organization.display_name || "N/A"}
                        </p>
                      )}
                      <p>
                        <span className="font-semibold">Submitted:</span> {formatDate(request.created_at)}
                      </p>
                      {request.event_interest && (
                        <p>
                          <span className="font-semibold">Event Interest:</span> {request.event_interest}
                        </p>
                      )}
                      {request.workshop_interest && (
                        <p>
                          <span className="font-semibold">Workshop Interest:</span> {request.workshop_interest}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {request.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(request)}
                      className="px-4 py-2 text-sm font-semibold text-primaryColor bg-primaryColor/10 rounded-md hover:bg-primaryColor/20 transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleAccept(request)}
                      className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                      disabled={acceptRequest.isPending || !request.organization?.id}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request)}
                      className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                      disabled={rejectRequest.isPending}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-contentColor dark:text-contentColor-dark">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} requests
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              disabled={pagination.page === 1}
              className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={pagination.page >= pagination.totalPages}
              className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedRequest(null);
        }}
        title="Request Details"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-blackColor dark:text-blackColor-dark mb-2">Personal Information</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-semibold">Name:</span> {`${selectedRequest.first_name} ${selectedRequest.last_name}`.trim()}
                </p>
                <p>
                  <span className="font-semibold">Email:</span> {selectedRequest.email}
                </p>
                <p>
                  <span className="font-semibold">Phone:</span> {selectedRequest.phone || "N/A"}
                </p>
                {selectedRequest.organization && (
                  <p>
                    <span className="font-semibold">Organization:</span> {selectedRequest.organization.name || selectedRequest.organization.display_name || "N/A"}
                  </p>
                )}
              </div>
            </div>
            {(selectedRequest.event_interest || selectedRequest.workshop_interest) && (
              <div>
                <h3 className="font-semibold text-blackColor dark:text-blackColor-dark mb-2">Interests</h3>
                <div className="space-y-2 text-sm">
                  {selectedRequest.event_interest && (
                    <p>
                      <span className="font-semibold">Event Interest:</span> {selectedRequest.event_interest}
                    </p>
                  )}
                  {selectedRequest.workshop_interest && (
                    <p>
                      <span className="font-semibold">Workshop Interest:</span> {selectedRequest.workshop_interest}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-blackColor dark:text-blackColor-dark mb-2">Request Information</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-semibold">Status:</span>{" "}
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Submitted:</span> {formatDate(selectedRequest.created_at)}
                </p>
                {selectedRequest.reviewed_at && (
                  <p>
                    <span className="font-semibold">Reviewed:</span> {formatDate(selectedRequest.reviewed_at)}
                  </p>
                )}
                {selectedRequest.reviewed_by && (
                  <p>
                    <span className="font-semibold">Reviewed By:</span>{" "}
                    {`${selectedRequest.reviewed_by.first_name} ${selectedRequest.reviewed_by.last_name}`.trim() || selectedRequest.reviewed_by.email}
                  </p>
                )}
                {selectedRequest.rejection_reason && (
                  <p>
                    <span className="font-semibold">Rejection Reason:</span> {selectedRequest.rejection_reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Accept Modal */}
      <Modal
        isOpen={showAcceptModal}
        onClose={() => {
          setShowAcceptModal(false);
          setSelectedRequest(null);
        }}
        title="Approve Mentor Request"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-4">
                Approve registration for <strong>{`${selectedRequest.first_name} ${selectedRequest.last_name}`.trim()}</strong> ({selectedRequest.email})
              </p>
              {selectedRequest.organization && (
                <div className="mb-4 p-4 bg-darkdeep3 dark:bg-darkdeep3-dark rounded-md">
                  <p className="text-sm">
                    <span className="font-semibold">Organization:</span> {selectedRequest.organization.name || selectedRequest.organization.display_name}
                  </p>
                </div>
              )}
              {!selectedRequest.organization && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    ⚠️ This request does not have an organization assigned. Please reject this request or contact the applicant.
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAcceptModal(false);
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep3 dark:hover:bg-darkdeep3-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptSubmit}
                disabled={!selectedRequest.organization?.id || acceptRequest.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {acceptRequest.isPending ? "Processing..." : "Approve & Send Invite"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedRequest(null);
          setRejectionReason("");
        }}
        title="Reject Mentor Request"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-4">
                Reject registration for <strong>{`${selectedRequest.first_name} ${selectedRequest.last_name}`.trim()}</strong> ({selectedRequest.email})
              </p>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
                className="w-full px-4 py-2 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setRejectionReason("");
                }}
                className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep3 dark:hover:bg-darkdeep3-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectRequest.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectRequest.isPending ? "Processing..." : "Reject Request"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

