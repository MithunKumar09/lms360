"use client";

import { useState } from "react";
import { useVendorEnrolledStudents } from "@/hooks/api/useVendorEnrollments";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import AdvancedPagination from "@/components/shared/courses/AdvancedPagination";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";
import SearchInput from "@/components/shared/filters/SearchInput";
import ExportButton from "@/components/shared/export/ExportButton";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown";
import Link from "next/link";

const VendorEnrolledStudentsMain = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [minProgress, setMinProgress] = useState("");
  const [maxProgress, setMaxProgress] = useState("");

  const { data, isLoading, error } = useVendorEnrolledStudents({
    page,
    limit,
    status: status || null,
    search: search || null,
    minProgress: minProgress ? parseFloat(minProgress) : null,
    maxProgress: maxProgress ? parseFloat(maxProgress) : null,
  });

  const students = data?.students || [];
  const pagination = data?.pagination || {};

  const handleSearchChange = (newSearch) => {
    setSearch(newSearch);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const statusOptions = [
    { id: "all", label: "All Status", value: "" },
    { id: "active", label: "Active", value: "active" },
    { id: "completed", label: "Completed", value: "completed" },
    { id: "dropped", label: "Dropped", value: "dropped" },
    { id: "suspended", label: "Suspended", value: "suspended" },
  ];

  // Build filters object for export
  const exportFilters = {
    search: search || null,
    status: status || null,
    minProgress: minProgress ? parseFloat(minProgress) : null,
    maxProgress: maxProgress ? parseFloat(maxProgress) : null,
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div>
        <HeadingDashboard>Enrolled Students</HeadingDashboard>
        <SkeletonLoader count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <HeadingDashboard>Enrolled Students</HeadingDashboard>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-5 p-20px mt-30px">
          <p className="text-red-600 dark:text-red-400">
            {error?.message || "Failed to load enrolled students"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <HeadingDashboard>Enrolled Students</HeadingDashboard>

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
                endpoint="/api/vendor/enrollments/students/export"
                filters={exportFilters}
                filenamePrefix="enrolled-students"
                defaultFormat="csv"
              />
            </div>
          </div>

          {/* Bottom Row: Status and Progress Range */}
          <div className="flex flex-col sm:flex-row gap-15px">
            <div className="sm:w-200px">
              <AdvancedDropdown
                options={statusOptions}
                value={status}
                onChange={handleStatusChange}
                placeholder="All Status"
              />
            </div>
            <div className="sm:w-150px">
              <input
                type="number"
                value={minProgress}
                onChange={(e) => {
                  setMinProgress(e.target.value);
                  setPage(1);
                }}
                placeholder="Min Progress %"
                min="0"
                max="100"
                className="w-full px-15px py-12px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor"
              />
            </div>
            <div className="sm:w-150px">
              <input
                type="number"
                value={maxProgress}
                onChange={(e) => {
                  setMaxProgress(e.target.value);
                  setPage(1);
                }}
                placeholder="Max Progress %"
                min="0"
                max="100"
                className="w-full px-15px py-12px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      {students.length === 0 ? (
        <NoData message="No enrolled students found." />
      ) : (
        <>
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-lightGrey5 dark:bg-darkdeep1">
                  <tr>
                    <th className="px-20px py-15px text-left text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Student
                    </th>
                    <th className="px-20px py-15px text-left text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Course
                    </th>
                    <th className="px-20px py-15px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Enrollment Date
                    </th>
                    <th className="px-20px py-15px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Status
                    </th>
                    <th className="px-20px py-15px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Progress
                    </th>
                    <th className="px-20px py-15px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Last Accessed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(students) && students
                    .filter(item => item && typeof item === 'object' && item.enrollmentId && item.user && typeof item.user === 'object' && item.course && typeof item.course === 'object' && item.enrollment && typeof item.enrollment === 'object')
                    .map((item) => (
                    <tr
                      key={item.enrollmentId}
                      className="border-t border-borderColor dark:border-borderColor-dark hover:bg-lightGrey5 dark:hover:bg-darkdeep1 transition-colors"
                    >
                      <td className="px-20px py-15px">
                        <div className="flex items-center gap-10px">
                          {item.user?.avatarUrl ? (
                            <img
                              src={item.user.avatarUrl}
                              alt={item.user?.fullName || 'Student'}
                              className="w-32px h-32px rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-32px h-32px rounded-full bg-primaryColor/20 flex items-center justify-center text-primaryColor font-semibold text-12px">
                              {item.user?.fullName ? item.user.fullName.charAt(0).toUpperCase() : '?'}
                            </div>
                          )}
                          <div>
                            <div className="text-14px font-medium text-blackColor dark:text-blackColor-dark">
                              {item.user?.fullName || 'Unknown Student'}
                            </div>
                            <div className="text-12px text-contentColor dark:text-contentColor-dark">
                              {item.user?.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-20px py-15px">
                        <Link
                          href={`/courses/${item.course?.slug || '#'}`}
                          className="text-14px font-medium text-blackColor dark:text-blackColor-dark hover:text-primaryColor transition-colors"
                        >
                          {item.course?.title || 'Untitled Course'}
                        </Link>
                      </td>
                      <td className="px-20px py-15px text-center text-14px text-blackColor dark:text-blackColor-dark">
                        {formatDate(item.enrollment?.enrolledAt)}
                      </td>
                      <td className="px-20px py-15px text-center">
                        <span
                          className={`inline-block px-10px py-5px rounded-5 text-12px font-semibold ${
                            item.enrollment?.status === "active"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : item.enrollment?.status === "completed"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                              : item.enrollment?.status === "dropped"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                          }`}
                        >
                          {item.enrollment?.status ? (item.enrollment.status.charAt(0).toUpperCase() + item.enrollment.status.slice(1)) : 'Unknown'}
                        </span>
                      </td>
                      <td className="px-20px py-15px text-center">
                        <div className="flex flex-col items-center gap-5px">
                          <span className="text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                            {typeof item.enrollment?.progress === 'number' ? Math.round(item.enrollment.progress) : 0}%
                          </span>
                          <div className="w-60px h-4px bg-lightGrey5 dark:bg-darkdeep1 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primaryColor transition-all"
                              style={{ width: `${typeof item.enrollment?.progress === 'number' ? item.enrollment.progress : 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-20px py-15px text-center text-14px text-contentColor dark:text-contentColor-dark">
                        {formatDate(item.enrollment?.lastAccessedAt)}
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

export default VendorEnrolledStudentsMain;
