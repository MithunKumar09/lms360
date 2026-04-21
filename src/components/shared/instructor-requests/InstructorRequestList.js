"use client";

import { useState } from "react";
import { useAcceptInstructorRequest, useRejectInstructorRequest, useDeleteInstructorRequest } from "@/hooks/api/useInstructorRequests";
import InstructorRequestDetailsModal from "@/components/shared/modals/InstructorRequestDetailsModal";
import AcceptInstructorRequestModal from "@/components/shared/modals/AcceptInstructorRequestModal";
import RejectInstructorRequestModal from "@/components/shared/modals/RejectInstructorRequestModal";
import Image from "next/image";

const InstructorRequestList = ({
  requests,
  isLoading,
  pagination,
  page,
  setPage,
  filters,
  setFilters,
}) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const acceptRequest = useAcceptInstructorRequest({
    onSuccess: () => {
      setShowAcceptModal(false);
      setSelectedRequest(null);
    },
  });

  const rejectRequest = useRejectInstructorRequest({
    onSuccess: () => {
      setShowRejectModal(false);
      setSelectedRequest(null);
    },
  });

  const deleteRequest = useDeleteInstructorRequest();

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleAccept = (request) => {
    setSelectedRequest(request);
    setShowAcceptModal(true);
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const handleDelete = async (requestId) => {
    if (confirm("Are you sure you want to delete this request? This action cannot be undone.")) {
      await deleteRequest.mutateAsync(requestId);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return badges[status] || badges.pending;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 bg-darkdeep3 dark:bg-darkdeep3-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
        <p className="text-contentColor dark:text-contentColor-dark">
          No pending requests found
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-6 p-4 bg-darkdeep3 dark:bg-darkdeep3-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setPage(1);
              }}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests
          .filter((request) => {
            if (!filters.search) return true;
            const search = filters.search.toLowerCase();
            return (
              request.user?.email?.toLowerCase().includes(search) ||
              request.user?.first_name?.toLowerCase().includes(search) ||
              request.user?.last_name?.toLowerCase().includes(search) ||
              request.user?.display_name?.toLowerCase().includes(search)
            );
          })
          .map((request) => (
            <div
              key={request.id}
              className="bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* User Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-darkdeep4 flex-shrink-0">
                    {request.user?.profile_image ? (
                      <Image
                        src={request.user.profile_image}
                        alt={request.user.display_name || "User"}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primaryColor/20 text-primaryColor text-xl font-bold">
                        {(request.user?.first_name?.[0] || request.user?.email?.[0] || "U").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                        {request.user?.display_name ||
                          `${request.user?.first_name || ""} ${request.user?.last_name || ""}`.trim() ||
                          request.user?.email ||
                          "Unknown User"}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">
                      {request.user?.email}
                    </p>
                    <p className="text-xs text-contentColor dark:text-contentColor-dark">
                      Current Role: <span className="font-semibold">{request.user?.role || "N/A"}</span>
                    </p>
                    <p className="text-xs text-contentColor dark:text-contentColor-dark">
                      Requested: {formatDate(request.created_at)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs text-contentColor dark:text-contentColor-dark">
                        Cohorts: {request.cohorts?.length || 0}
                      </span>
                      <span className="text-xs text-contentColor dark:text-contentColor-dark">
                        Subjects: {request.subjects?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewDetails(request)}
                    className="px-4 py-2 text-sm bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90 transition-colors"
                  >
                    View Details
                  </button>
                  {request.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAccept(request)}
                        disabled={acceptRequest.isPending}
                        className="px-4 py-2 text-sm bg-green-500 text-whiteColor rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(request)}
                        disabled={rejectRequest.isPending}
                        className="px-4 py-2 text-sm bg-red-500 text-whiteColor rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {(request.status === "accepted" || request.status === "rejected") && (
                    <button
                      type="button"
                      onClick={() => handleDelete(request.id)}
                      disabled={deleteRequest.isPending}
                      className="px-4 py-2 text-sm bg-red-500 text-whiteColor rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-contentColor dark:text-contentColor-dark">
            Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} requests
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 text-sm border border-borderColor dark:border-borderColor-dark rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-darkdeep4 dark:hover:bg-darkdeep4 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-contentColor dark:text-contentColor-dark">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page >= pagination.totalPages}
              className="px-4 py-2 text-sm border border-borderColor dark:border-borderColor-dark rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-darkdeep4 dark:hover:bg-darkdeep4 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showDetailsModal && selectedRequest && (
        <InstructorRequestDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          onAccept={() => {
            setShowDetailsModal(false);
            handleAccept(selectedRequest);
          }}
          onReject={() => {
            setShowDetailsModal(false);
            handleReject(selectedRequest);
          }}
        />
      )}

      {showAcceptModal && selectedRequest && (
        <AcceptInstructorRequestModal
          isOpen={showAcceptModal}
          onClose={() => {
            setShowAcceptModal(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          onAccept={(mfaMethod) => {
            acceptRequest.mutate({
              requestId: selectedRequest.id,
              mfaMethod,
            });
          }}
          isLoading={acceptRequest.isPending}
        />
      )}

      {showRejectModal && selectedRequest && (
        <RejectInstructorRequestModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          onReject={(rejectionReason) => {
            rejectRequest.mutate({
              requestId: selectedRequest.id,
              rejectionReason,
            });
          }}
          isLoading={rejectRequest.isPending}
        />
      )}
    </>
  );
};

export default InstructorRequestList;

