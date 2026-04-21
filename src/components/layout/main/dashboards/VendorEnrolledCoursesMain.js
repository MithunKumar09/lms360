"use client";

import { useState } from "react";
import { useVendorCourseEnrollments } from "@/hooks/api/useVendorEnrollments";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import AdvancedPagination from "@/components/shared/courses/AdvancedPagination";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";
import SearchInput from "@/components/shared/filters/SearchInput";
import DateRangeFilter from "@/components/shared/filters/DateRangeFilter";
import ExportButton from "@/components/shared/export/ExportButton";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown";
import Link from "next/link";

const VendorEnrolledCoursesMain = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const { data, isLoading, error } = useVendorCourseEnrollments({
    page,
    limit,
    status: status || null,
    search: search || null,
  });

  const courses = data?.courses || [];
  const pagination = data?.pagination || {};

  const handleSearchChange = (newSearch) => {
    setSearch(newSearch);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleDateRangeChange = ({ fromDate: newFromDate, toDate: newToDate }) => {
    setFromDate(newFromDate);
    setToDate(newToDate);
    setPage(1);
  };

  const statusOptions = [
    { id: "all", label: "All Status", value: "" },
    { id: "published", label: "Published", value: "published" },
    { id: "draft", label: "Draft", value: "draft" },
    { id: "archived", label: "Archived", value: "archived" },
    { id: "suspended", label: "Suspended", value: "suspended" },
  ];

  // Build filters object for export
  const exportFilters = {
    search: search || null,
    status: status || null,
    fromDate: fromDate ? fromDate.toISOString() : null,
    toDate: toDate ? toDate.toISOString() : null,
  };

  if (isLoading) {
    return (
      <div>
        <HeadingDashboard>Enrolled Courses</HeadingDashboard>
        <SkeletonLoader count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <HeadingDashboard>Enrolled Courses</HeadingDashboard>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-5 p-20px mt-30px">
          <p className="text-red-600 dark:text-red-400">
            {error?.message || "Failed to load enrolled courses"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <HeadingDashboard>Enrolled Courses</HeadingDashboard>

      {/* Filters and Export */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px mb-30px">
        <div className="flex flex-col gap-15px">
          {/* Top Row: Search and Export */}
          <div className="flex flex-col sm:flex-row gap-15px items-start sm:items-center">
            <div className="flex-1 w-full sm:w-auto">
              <SearchInput
                value={search}
                onChange={handleSearchChange}
                placeholder="Search courses by title..."
                debounceMs={500}
                minLength={0}
                isLoading={isLoading}
              />
            </div>
            <div className="w-full sm:w-auto">
              <ExportButton
                endpoint="/api/vendor/courses/enrollments/export"
                filters={exportFilters}
                filenamePrefix="course-enrollments"
                defaultFormat="csv"
              />
            </div>
          </div>

          {/* Bottom Row: Status and Date Range */}
          <div className="flex flex-col sm:flex-row gap-15px">
            <div className="sm:w-200px">
              <AdvancedDropdown
                options={statusOptions}
                value={status}
                onChange={handleStatusChange}
                placeholder="All Status"
              />
            </div>
            <div className="flex-1">
              <DateRangeFilter
                fromDate={fromDate}
                toDate={toDate}
                onChange={handleDateRangeChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Courses Table */}
      {!Array.isArray(courses) || courses.length === 0 ? (
        <NoData message="No courses found. Create your first course to see enrollments." />
      ) : (
        <>
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-lightGrey5 dark:bg-darkdeep1">
                  <tr>
                    <th className="px-20px py-15px text-left text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Course Title
                    </th>
                    <th className="px-20px py-15px text-left text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Status
                    </th>
                    <th className="px-20px py-15px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Total Enrollments
                    </th>
                    <th className="px-20px py-15px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Active
                    </th>
                    <th className="px-20px py-15px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Completed
                    </th>
                    <th className="px-20px py-15px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Avg. Progress
                    </th>
                    <th className="px-20px py-15px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(courses) && courses
                    .filter(course => course && typeof course === 'object' && course.id)
                    .map((course) => (
                    <tr
                      key={course.id}
                      className="border-t border-borderColor dark:border-borderColor-dark hover:bg-lightGrey5 dark:hover:bg-darkdeep1 transition-colors"
                    >
                      <td className="px-20px py-15px">
                        <Link
                          href={`/courses/${course.slug || '#'}`}
                          className="text-14px font-medium text-blackColor dark:text-blackColor-dark hover:text-primaryColor transition-colors"
                        >
                          {course.title || 'Untitled Course'}
                        </Link>
                      </td>
                      <td className="px-20px py-15px">
                        <span
                          className={`inline-block px-10px py-5px rounded-5 text-12px font-semibold ${
                            course.status === "published"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : course.status === "draft"
                              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                              : course.status === "archived"
                              ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                          }`}
                        >
                          {course.status ? (course.status.charAt(0).toUpperCase() + course.status.slice(1)) : 'Unknown'}
                        </span>
                      </td>
                      <td className="px-20px py-15px text-center text-14px text-blackColor dark:text-blackColor-dark">
                        {typeof course.enrollmentStats?.total === 'number' ? course.enrollmentStats.total : 0}
                      </td>
                      <td className="px-20px py-15px text-center text-14px text-blackColor dark:text-blackColor-dark">
                        {typeof course.enrollmentStats?.active === 'number' ? course.enrollmentStats.active : 0}
                      </td>
                      <td className="px-20px py-15px text-center text-14px text-blackColor dark:text-blackColor-dark">
                        {typeof course.enrollmentStats?.completed === 'number' ? course.enrollmentStats.completed : 0}
                      </td>
                      <td className="px-20px py-15px text-center text-14px text-blackColor dark:text-blackColor-dark">
                        {typeof course.enrollmentStats?.averageProgress === 'number' ? Math.round(course.enrollmentStats.averageProgress) : 0}%
                      </td>
                      <td className="px-20px py-15px text-center">
                        <Link
                          href={`/dashboards/vendor-course-enrollments/${course.id}`}
                          className="text-primaryColor hover:text-primaryColor/80 text-14px font-medium transition-colors"
                        >
                          View Students
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
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

export default VendorEnrolledCoursesMain;
