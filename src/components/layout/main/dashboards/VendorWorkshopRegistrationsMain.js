"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useVendorWorkshopRegistrations,
  useVendorWorkshopStatistics,
} from "@/hooks/api/useVendorWorkshops";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import AdvancedPagination from "@/components/shared/courses/AdvancedPagination";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown";
import SearchInput from "@/components/shared/filters/SearchInput";
import ExportButton from "@/components/shared/export/ExportButton";
import VendorWorkshopRegistrationStats from "@/components/sections/sub-section/dashboards/VendorWorkshopRegistrationStats";

const VendorWorkshopRegistrationsMain = () => {
  const params = useParams();
  const router = useRouter();
  const workshopId = params.workshopId;

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  const { data, isLoading, error } = useVendorWorkshopRegistrations(workshopId, {
    page,
    limit,
    status: status || null,
    paymentStatus: paymentStatus || null,
    search: search || null,
  });

  const registrations = data?.registrations || [];
  const workshop = data?.workshop;
  const pagination = data?.pagination || {};

  const handleSearchChange = (newSearch) => {
    setSearch(newSearch);
    setPage(1);
  };

  // Build filters object for export
  const exportFilters = {
    search: search || null,
    status: status || null,
    paymentStatus: paymentStatus || null,
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div>
        <HeadingDashboard>Workshop Registrations</HeadingDashboard>
        <SkeletonLoader count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <HeadingDashboard>Workshop Registrations</HeadingDashboard>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-5 p-20px mt-30px">
          <p className="text-red-600 dark:text-red-400">
            {error?.message || "Failed to load registrations"}
          </p>
          <button
            onClick={() => router.push("/dashboards/vendor-manage-workshops")}
            className="mt-15px px-20px py-10px bg-primaryColor text-whiteColor rounded-5 text-14px font-semibold hover:bg-primaryColor/90 transition-colors"
          >
            Back to Workshops
          </button>
        </div>
      </div>
    );
  }

  const statusOptions = [
    { id: "all", label: "All Status", value: "" },
    { id: "registered", label: "Registered", value: "registered" },
    { id: "cancelled", label: "Cancelled", value: "cancelled" },
    { id: "attended", label: "Attended", value: "attended" },
    { id: "no_show", label: "No Show", value: "no_show" },
  ];

  const paymentStatusOptions = [
    { id: "all", label: "All Payment Status", value: "" },
    { id: "pending", label: "Pending", value: "pending" },
    { id: "paid", label: "Paid", value: "paid" },
    { id: "refunded", label: "Refunded", value: "refunded" },
  ];

  return (
    <div>
      {/* Workshop Header */}
      {workshop && (
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px mb-30px">
          <div className="flex items-center justify-between flex-wrap gap-15px">
            <div>
              <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-5px">
                {workshop.title}
              </h2>
              <p className="text-14px text-contentColor dark:text-contentColor-dark">
                View all registrations for this workshop
                {workshop.capacity && ` (Capacity: ${workshop.capacity})`}
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboards/vendor-manage-workshops")}
              className="px-20px py-10px bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark rounded-5 text-14px font-semibold hover:bg-lightGrey6 dark:hover:bg-darkdeep2 transition-colors"
            >
              Back to Workshops
            </button>
          </div>
        </div>
      )}

      <HeadingDashboard>Workshop Registrations</HeadingDashboard>

      {/* Statistics */}
      {workshopId && <VendorWorkshopRegistrationStats workshopId={workshopId} />}

      {/* Filters and Export */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px mb-30px">
        <div className="flex flex-col gap-15px">
          {/* Top Row: Search and Export */}
          <div className="flex flex-col sm:flex-row gap-15px items-start sm:items-center">
            <div className="flex-1 w-full sm:w-auto">
              <SearchInput
                value={search}
                onChange={handleSearchChange}
                placeholder="Search by student name or email..."
                debounceMs={500}
                minLength={0}
                isLoading={isLoading}
              />
            </div>
            <div className="w-full sm:w-auto">
              <ExportButton
                endpoint={`/api/vendor/workshops/${workshopId}/registrations/export`}
                filters={exportFilters}
                filenamePrefix="workshop-registrations"
                defaultFormat="csv"
              />
            </div>
          </div>

          {/* Bottom Row: Status Filters */}
          <div className="flex flex-col sm:flex-row gap-15px">
            <div className="sm:w-200px">
              <AdvancedDropdown
                options={statusOptions}
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                placeholder="All Status"
              />
            </div>

            <div className="sm:w-200px">
              <AdvancedDropdown
                options={paymentStatusOptions}
                value={paymentStatus}
                onChange={(value) => {
                  setPaymentStatus(value);
                  setPage(1);
                }}
                placeholder="All Payment Status"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Registrations Table */}
      {!Array.isArray(registrations) || registrations.length === 0 ? (
        <NoData message="No registrations found for this workshop." />
      ) : (
        <>
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-lightGrey5 dark:bg-darkdeep1">
                  <tr>
                    <th className="px-20px py-12px text-left text-14px font-semibold text-blackColor dark:text-blackColor-dark align-middle">
                      Student
                    </th>
                    <th className="px-20px py-12px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark align-middle">
                      Slot #
                    </th>
                    <th className="px-20px py-12px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark align-middle">
                      Registered At
                    </th>
                    <th className="px-20px py-12px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark align-middle">
                      Status
                    </th>
                    <th className="px-20px py-12px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark align-middle">
                      Payment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {registrations
                    .filter(registration => registration && typeof registration === 'object' && registration.id && registration.user && typeof registration.user === 'object')
                    .map((registration) => (
                    <tr
                      key={registration.id}
                      className="border-t border-borderColor dark:border-borderColor-dark hover:bg-lightGrey5 dark:hover:bg-darkdeep1 transition-colors"
                    >
                      <td className="px-20px py-12px align-middle">
                        <div className="flex items-center gap-10px min-w-0">
                          {registration.user?.avatarUrl ? (
                            <div className="relative w-32px h-32px flex-shrink-0 flex items-center justify-center overflow-hidden rounded-full bg-primaryColor/10">
                              <img
                                src={registration.user.avatarUrl}
                                alt={registration.user?.fullName || 'Student'}
                                className="w-32px h-32px rounded-full object-cover"
                                style={{ 
                                  maxWidth: '32px', 
                                  maxHeight: '32px',
                                  width: '32px',
                                  height: '32px',
                                  objectFit: 'cover'
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-32px h-32px rounded-full bg-primaryColor/20 flex items-center justify-center text-primaryColor font-semibold text-12px flex-shrink-0">
                              {registration.user?.fullName ? registration.user.fullName.charAt(0).toUpperCase() : '?'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-2px truncate">
                              {registration.user?.fullName || 'Unknown Student'}
                            </div>
                            <div className="text-12px text-contentColor dark:text-contentColor-dark truncate">
                              {registration.user?.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-20px py-12px text-center align-middle">
                        {typeof registration.slotNumber === 'number' ? (
                          <span className="text-14px font-semibold text-blackColor dark:text-blackColor-dark whitespace-nowrap">
                            #{registration.slotNumber}
                          </span>
                        ) : typeof registration.waitlistPosition === 'number' ? (
                          <span className="text-14px text-contentColor dark:text-contentColor-dark whitespace-nowrap">
                            Waitlist #{registration.waitlistPosition}
                          </span>
                        ) : (
                          <span className="text-14px text-contentColor dark:text-contentColor-dark">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-20px py-12px text-center align-middle">
                        <div className="text-14px font-medium text-blackColor dark:text-blackColor-dark whitespace-nowrap">
                          {formatDate(registration.registeredAt)}
                        </div>
                      </td>
                      <td className="px-20px py-12px text-center align-middle">
                        <span
                          className={`inline-block px-10px py-5px rounded-5 text-12px font-semibold whitespace-nowrap ${
                            registration.registrationStatus === "registered"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                              : registration.registrationStatus === "attended"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : registration.registrationStatus === "cancelled"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                          }`}
                        >
                          {registration.registrationStatus ? (
                            registration.registrationStatus.charAt(0).toUpperCase() + registration.registrationStatus.slice(1)
                          ) : 'Unknown'}
                        </span>
                      </td>
                      <td className="px-20px py-12px text-center align-middle">
                        <span
                          className={`inline-block px-10px py-5px rounded-5 text-12px font-semibold whitespace-nowrap ${
                            registration.paymentStatus === "paid"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : registration.paymentStatus === "refunded"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                          }`}
                        >
                          {registration.paymentStatus ? (
                            registration.paymentStatus.charAt(0).toUpperCase() + registration.paymentStatus.slice(1)
                          ) : 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {typeof pagination?.totalPages === 'number' && pagination.totalPages > 1 && (
            <div className="mt-30px">
              <AdvancedPagination
                currentPage={page - 1}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                limit={limit}
                onPageChange={(newPage) => setPage(newPage + 1)}
                showPageSizeSelector={false}
                updateUrlParams={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VendorWorkshopRegistrationsMain;
