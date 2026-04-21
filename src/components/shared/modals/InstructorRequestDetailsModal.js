"use client";

import Image from "next/image";

const InstructorRequestDetailsModal = ({
  isOpen,
  onClose,
  request,
  onAccept,
  onReject,
}) => {
  if (!isOpen || !request) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return "icofont-clock-time";
      case "accepted":
        return "icofont-check-circled";
      case "rejected":
        return "icofont-close-circled";
      default:
        return "icofont-info-circle";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 dark:text-yellow-400";
      case "accepted":
        return "text-green-600 dark:text-green-400";
      case "rejected":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-contentColor dark:text-contentColor-dark";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4">
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-whiteColor dark:bg-whiteColor-dark border-b border-borderColor dark:border-borderColor-dark p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Request Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark"
          >
            <i className="icofont-close"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Profile Section */}
          <div className="bg-gradient-to-br from-darkdeep3 to-darkdeep4 dark:from-darkdeep3-dark dark:to-darkdeep4-dark rounded-lg p-6 border-2 border-borderColor dark:border-borderColor-dark shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <i className="icofont-user text-2xl text-primaryColor"></i>
              <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                User Information
              </h3>
            </div>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="relative">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-darkdeep4 flex-shrink-0 ring-4 ring-primaryColor/20">
                  {request.user?.profile_image ? (
                    <Image
                      src={request.user.profile_image}
                      alt={request.user.display_name || "User"}
                      width={112}
                      height={112}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primaryColor/20 to-primaryColor/10 text-primaryColor text-4xl font-bold">
                      {(request.user?.first_name?.[0] || request.user?.email?.[0] || "U").toUpperCase()}
                    </div>
                  )}
                </div>
                {request.status === "pending" && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full border-2 border-whiteColor dark:border-whiteColor-dark flex items-center justify-center">
                    <i className="icofont-clock-time text-whiteColor text-xs"></i>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-3">
                  {request.user?.display_name ||
                    `${request.user?.first_name || ""} ${request.user?.last_name || ""}`.trim() ||
                    request.user?.email ||
                    "Unknown User"}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <i className="icofont-envelope text-contentColor dark:text-contentColor-dark"></i>
                    <span className="text-contentColor dark:text-contentColor-dark">
                      <span className="font-semibold">Email:</span> {request.user?.email || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="icofont-badge text-contentColor dark:text-contentColor-dark"></i>
                    <span className="text-contentColor dark:text-contentColor-dark">
                      <span className="font-semibold">Current Role:</span>{" "}
                      <span className="px-3 py-1 bg-primaryColor/10 text-primaryColor rounded-full font-semibold">
                        {request.user?.role || "N/A"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="icofont-building text-contentColor dark:text-contentColor-dark"></i>
                    <span className="text-contentColor dark:text-contentColor-dark">
                      <span className="font-semibold">Organization:</span> {request.organization?.name || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="bg-darkdeep3 dark:bg-darkdeep3-dark rounded-lg p-6 border-2 border-borderColor dark:border-borderColor-dark shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <i className="icofont-file-alt text-2xl text-primaryColor"></i>
              <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Request Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-contentColor dark:text-contentColor-dark mb-1">
                  <i className="icofont-calendar"></i>
                  <span className="font-semibold">Request Date & Time</span>
                </div>
                <p className="text-base font-medium text-blackColor dark:text-blackColor-dark">
                  {formatDate(request.created_at)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-contentColor dark:text-contentColor-dark mb-1">
                  <i className={`${getStatusIcon(request.status)} ${getStatusColor(request.status)}`}></i>
                  <span className="font-semibold">Status</span>
                </div>
                <p className="text-base">
                  <span className={`px-3 py-1.5 rounded-full font-semibold text-sm capitalize ${
                    request.status === "pending" 
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" 
                      : request.status === "accepted" 
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {request.status}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Cohorts */}
          <div className="bg-darkdeep3 dark:bg-darkdeep3-dark rounded-lg p-6 border-2 border-borderColor dark:border-borderColor-dark shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <i className="icofont-users text-2xl text-primaryColor"></i>
                <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                  Selected Cohorts
                </h3>
              </div>
              <span className="px-3 py-1 bg-primaryColor/10 text-primaryColor rounded-full text-sm font-semibold">
                {request.cohorts?.length || 0} {request.cohorts?.length === 1 ? "Cohort" : "Cohorts"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {request.cohorts && request.cohorts.length > 0 ? (
                request.cohorts.map((cohort, index) => (
                  <div
                    key={index}
                    className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border-2 border-borderColor dark:border-borderColor-dark hover:border-primaryColor dark:hover:border-primaryColor transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primaryColor/10 flex items-center justify-center flex-shrink-0">
                        <i className="icofont-users text-primaryColor"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-blackColor dark:text-blackColor-dark mb-1">
                          {cohort.name || cohort.cohort_code || cohort.code || `Cohort ${index + 1}`}
                        </p>
                        {cohort.program_node && (
                          <div className="flex items-center gap-2 text-sm text-contentColor dark:text-contentColor-dark mb-1">
                            <i className="icofont-book"></i>
                            <span>
                              {cohort.program_node.name || cohort.program_node.code || "N/A"}
                            </span>
                          </div>
                        )}
                        {(cohort.section_name || cohort.term_name || cohort.session_code) && (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-contentColor dark:text-contentColor-dark">
                            {cohort.section_name && (
                              <span className="px-2 py-0.5 bg-primaryColor/10 text-primaryColor rounded">
                                Section: {cohort.section_name}
                              </span>
                            )}
                            {cohort.term_name && (
                              <span className="px-2 py-0.5 bg-primaryColor/10 text-primaryColor rounded">
                                Term: {cohort.term_name}
                              </span>
                            )}
                            {cohort.session_code && (
                              <span className="px-2 py-0.5 bg-primaryColor/10 text-primaryColor rounded">
                                Session: {cohort.session_code}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-4 text-contentColor dark:text-contentColor-dark">
                  <i className="icofont-info-circle text-2xl mb-2 block"></i>
                  <p>No cohorts selected</p>
                </div>
              )}
            </div>
          </div>

          {/* Subjects */}
          <div className="bg-darkdeep3 dark:bg-darkdeep3-dark rounded-lg p-6 border-2 border-borderColor dark:border-borderColor-dark shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <i className="icofont-book text-2xl text-primaryColor"></i>
                <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                  Selected Subjects
                </h3>
              </div>
              <span className="px-3 py-1 bg-primaryColor/10 text-primaryColor rounded-full text-sm font-semibold">
                {request.subjects?.length || 0} {request.subjects?.length === 1 ? "Subject" : "Subjects"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {request.subjects && request.subjects.length > 0 ? (
                request.subjects.map((subject, index) => (
                  <div
                    key={index}
                    className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border-2 border-borderColor dark:border-borderColor-dark hover:border-primaryColor dark:hover:border-primaryColor transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primaryColor/10 flex items-center justify-center flex-shrink-0">
                        <i className="icofont-book text-primaryColor"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-blackColor dark:text-blackColor-dark mb-1 truncate">
                          {subject.name || subject.title || `Subject ${index + 1}`}
                        </p>
                        {subject.code && (
                          <div className="flex items-center gap-2 text-xs text-contentColor dark:text-contentColor-dark">
                            <i className="icofont-hash"></i>
                            <span className="font-mono">{subject.code}</span>
                          </div>
                        )}
                        {subject.title && subject.code && subject.title !== subject.code && (
                          <div className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
                            Code: {subject.code}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-4 text-contentColor dark:text-contentColor-dark">
                  <i className="icofont-info-circle text-2xl mb-2 block"></i>
                  <p>No subjects selected</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          {(request.phone_number || request.bio) && (
            <div className="bg-darkdeep3 dark:bg-darkdeep3-dark rounded-lg p-6 border-2 border-borderColor dark:border-borderColor-dark shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <i className="icofont-info-circle text-2xl text-primaryColor"></i>
                <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                  Additional Information
                </h3>
              </div>
              <div className="space-y-4">
                {request.phone_number && (
                  <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark">
                    <div className="flex items-center gap-2 text-sm text-contentColor dark:text-contentColor-dark mb-2">
                      <i className="icofont-phone"></i>
                      <span className="font-semibold">Phone Number</span>
                    </div>
                    <p className="text-base font-medium text-blackColor dark:text-blackColor-dark">
                      {request.phone_number}
                    </p>
                  </div>
                )}
                {request.bio && (
                  <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark">
                    <div className="flex items-center gap-2 text-sm text-contentColor dark:text-contentColor-dark mb-2">
                      <i className="icofont-file-text"></i>
                      <span className="font-semibold">Bio</span>
                    </div>
                    <p className="text-sm text-blackColor dark:text-blackColor-dark whitespace-pre-wrap leading-relaxed">
                      {request.bio}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Review Information */}
          {request.reviewed_by && (
            <div className="bg-darkdeep3 dark:bg-darkdeep3-dark rounded-lg p-6 border-2 border-borderColor dark:border-borderColor-dark shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <i className="icofont-check-circled text-2xl text-primaryColor"></i>
                <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                  Review Information
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark">
                  <div className="flex items-center gap-2 text-sm text-contentColor dark:text-contentColor-dark mb-2">
                    <i className="icofont-user"></i>
                    <span className="font-semibold">Reviewed By</span>
                  </div>
                  <p className="text-base font-medium text-blackColor dark:text-blackColor-dark">
                    {request.reviewed_by?.display_name ||
                      `${request.reviewed_by?.first_name || ""} ${request.reviewed_by?.last_name || ""}`.trim() ||
                      request.reviewed_by?.email ||
                      "N/A"}
                  </p>
                </div>
                <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark">
                  <div className="flex items-center gap-2 text-sm text-contentColor dark:text-contentColor-dark mb-2">
                    <i className="icofont-calendar"></i>
                    <span className="font-semibold">Reviewed At</span>
                  </div>
                  <p className="text-base font-medium text-blackColor dark:text-blackColor-dark">
                    {request.reviewed_at ? formatDate(request.reviewed_at) : "N/A"}
                  </p>
                </div>
                {request.rejection_reason && (
                  <div className="md:col-span-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-300 mb-2">
                      <i className="icofont-close-circled"></i>
                      <span className="font-semibold">Rejection Reason</span>
                    </div>
                    <p className="text-sm text-red-900 dark:text-red-200 leading-relaxed">
                      {request.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {request.status === "pending" && (
          <div className="sticky bottom-0 bg-whiteColor dark:bg-whiteColor-dark border-t-2 border-borderColor dark:border-borderColor-dark p-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 shadow-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-semibold border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep4 dark:hover:bg-darkdeep4 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onReject}
              className="px-6 py-3 text-sm font-semibold bg-red-500 text-whiteColor rounded-md hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              <i className="icofont-close-circled"></i>
              Reject Request
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="px-6 py-3 text-sm font-semibold bg-green-500 text-whiteColor rounded-md hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <i className="icofont-check-circled"></i>
              Accept Request
            </button>
          </div>
        )}
        {request.status !== "pending" && (
          <div className="sticky bottom-0 bg-whiteColor dark:bg-whiteColor-dark border-t-2 border-borderColor dark:border-borderColor-dark p-6 flex items-center justify-end shadow-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 text-sm font-semibold bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90 transition-colors flex items-center gap-2"
            >
              <i className="icofont-check"></i>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorRequestDetailsModal;

