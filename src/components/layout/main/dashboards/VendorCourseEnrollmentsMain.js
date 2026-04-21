"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCourseEnrolledStudents } from "@/hooks/api/useVendorEnrollments";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import AdvancedPagination from "@/components/shared/courses/AdvancedPagination";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";
import Link from "next/link";

const VendorCourseEnrollmentsMain = () => {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId;

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading, error } = useCourseEnrolledStudents(courseId, {
    page,
    limit,
    status: status || null,
    search: search || null,
  });

  const students = data?.students || [];
  const pagination = data?.pagination || {};
  const course = students.length > 0 ? students[0].course : null;

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearch("");
    setPage(1);
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
        <HeadingDashboard>Course Enrollments</HeadingDashboard>
        <SkeletonLoader count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <HeadingDashboard>Course Enrollments</HeadingDashboard>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-5 p-20px mt-30px">
          <p className="text-red-600 dark:text-red-400">
            {error?.message || "Failed to load enrolled students"}
          </p>
          <button
            onClick={() => router.push("/dashboards/vendor-enrolled-courses")}
            className="mt-15px px-20px py-10px bg-primaryColor text-whiteColor rounded-5 text-14px font-semibold hover:bg-primaryColor/90 transition-colors"
          >
            Back to Enrolled Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Course Header */}
      {course && (
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px mb-30px">
          <div className="flex items-center justify-between flex-wrap gap-15px">
            <div>
              <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-5px">
                {course.title}
              </h2>
              <p className="text-14px text-contentColor dark:text-contentColor-dark">
                View all students enrolled in this course
              </p>
            </div>
            <Link
              href={courseId ? `/course-details-3?courseId=${courseId}` : '#'}
              className="px-20px py-10px bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark rounded-5 text-14px font-semibold hover:bg-lightGrey6 dark:hover:bg-darkdeep2 transition-colors"
            >
              View Course
            </Link>
          </div>
        </div>
      )}

      <HeadingDashboard>Enrolled Students</HeadingDashboard>

      {/* Filters */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px mb-30px">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-15px">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name or email..."
                className="w-full px-15px py-12px pr-40px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor"
              />
              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-10px top-1/2 -translate-y-1/2 text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="sm:w-200px">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-15px py-12px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-20px py-12px bg-primaryColor text-whiteColor rounded-5 font-semibold hover:bg-primaryColor/90 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Students Table */}
      {students.length === 0 ? (
        <NoData message="No students enrolled in this course yet." />
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
                      Enrollment Date
                    </th>
                    <th className="px-20px py-12px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark align-middle">
                      Status
                    </th>
                    <th className="px-20px py-12px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark align-middle">
                      Progress
                    </th>
                    <th className="px-20px py-12px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark align-middle">
                      Last Accessed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((item) => (
                    <tr
                      key={item.enrollmentId}
                      className="border-t border-borderColor dark:border-borderColor-dark hover:bg-lightGrey5 dark:hover:bg-darkdeep1 transition-colors"
                    >
                      <td className="px-20px py-12px align-middle">
                        <div className="flex items-center gap-10px min-w-0">
                          {item.user.avatarUrl ? (
                            <div className="relative w-32px h-32px flex-shrink-0 flex items-center justify-center overflow-hidden rounded-full bg-primaryColor/10">
                              <img
                                src={item.user.avatarUrl}
                                alt={item.user.fullName}
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
                              {item.user.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-2px truncate">
                              {item.user.fullName}
                            </div>
                            <div className="text-12px text-contentColor dark:text-contentColor-dark truncate">
                              {item.user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-20px py-12px text-center align-middle">
                        <div className="text-14px font-medium text-blackColor dark:text-blackColor-dark whitespace-nowrap">
                          {formatDate(item.enrollment.enrolledAt)}
                        </div>
                      </td>
                      <td className="px-20px py-12px text-center align-middle">
                        <span
                          className={`inline-block px-10px py-5px rounded-5 text-12px font-semibold whitespace-nowrap ${
                            item.enrollment.status === "active"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : item.enrollment.status === "completed"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                              : item.enrollment.status === "dropped"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                          }`}
                        >
                          {item.enrollment.status.charAt(0).toUpperCase() + item.enrollment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-20px py-12px text-center align-middle">
                        <div className="flex flex-col items-center gap-5px justify-center">
                          <span className="text-14px font-semibold text-blackColor dark:text-blackColor-dark whitespace-nowrap">
                            {Math.round(item.enrollment.progress)}%
                          </span>
                          <div className="w-60px h-4px bg-lightGrey5 dark:bg-darkdeep1 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primaryColor transition-all"
                              style={{ width: `${item.enrollment.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-20px py-12px text-center align-middle">
                        <div className="text-14px font-medium text-contentColor dark:text-contentColor-dark whitespace-nowrap">
                          {formatDate(item.enrollment.lastAccessedAt)}
                        </div>
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

export default VendorCourseEnrollmentsMain;
