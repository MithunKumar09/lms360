"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVendorQuizzes, useDeleteVendorQuiz } from "@/hooks/api/useVendorQuizzes";
import { useVendorCoursesForQuiz } from "@/hooks/api/useVendorQuizzes";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import AdvancedPagination from "@/components/shared/courses/AdvancedPagination";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown";
import SearchInput from "@/components/shared/filters/SearchInput";
import ExportButton from "@/components/shared/export/ExportButton";
import Link from "next/link";
import useSweetAlert from "@/hooks/useSweetAlert";

const VendorManageQuizMain = () => {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const deleteMutation = useDeleteVendorQuiz();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [courseId, setCourseId] = useState("");

  const { data, isLoading, error } = useVendorQuizzes({
    page,
    limit,
    courseId: courseId || null,
    status: status || null,
    search: search || null,
  });

  const { data: coursesData } = useVendorCoursesForQuiz();
  const courses = coursesData?.courses || [];

  const quizzes = data?.quizzes || [];
  const pagination = data?.pagination || {};

  const handleSearchChange = (newSearch) => {
    setSearch(newSearch);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleCourseChange = (value) => {
    setCourseId(value);
    setPage(1);
  };

  // Build filters object for export
  const exportFilters = {
    search: search || null,
    status: status || null,
    courseId: courseId || null,
  };

  const handleDelete = async (quizId) => {
    const result = await createAlert({
      icon: "warning",
      title: "Are you sure?",
      text: "This will delete the quiz and all its attempts. This action cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await deleteMutation.mutateAsync(quizId);
      } catch (error) {
        // Error handled by mutation
      }
    }
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
        <HeadingDashboard path="/dashboards/vendor-add-quiz">
          Manage Quiz
        </HeadingDashboard>
        <SkeletonLoader count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <HeadingDashboard path="/dashboards/vendor-add-quiz">
          Manage Quiz
        </HeadingDashboard>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-5 p-20px mt-30px">
          <p className="text-red-600 dark:text-red-400">
            {error?.message || "Failed to load quizzes"}
          </p>
        </div>
      </div>
    );
  }

  const courseOptions = [
    { id: "all", label: "All Courses", value: "" },
    ...(Array.isArray(courses) ? courses
      .filter(course => course && typeof course === 'object' && course.id)
      .map((course) => ({
        id: course.id,
        label: course.title || 'Untitled Course',
        value: course.id,
      })) : []),
  ];

  const statusOptions = [
    { id: "all", label: "All Status", value: "" },
    { id: "draft", label: "Draft", value: "draft" },
    { id: "published", label: "Published", value: "published" },
    { id: "closed", label: "Closed", value: "closed" },
  ];

  return (
    <div>
      <HeadingDashboard path="/dashboards/vendor-add-quiz">
        Manage Quiz
      </HeadingDashboard>

      {/* Add Quiz Button */}
      <div className="mb-30px">
        <Link
          href="/dashboards/vendor-add-quiz"
          className="inline-flex items-center px-20px py-12px bg-primaryColor text-whiteColor rounded-5 text-14px font-semibold hover:bg-primaryColor/90 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-10px"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          Add New Quiz
        </Link>
      </div>

      {/* Filters and Export */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px mb-30px">
        <div className="flex flex-col gap-15px">
          {/* Top Row: Search and Export */}
          <div className="flex flex-col sm:flex-row gap-15px items-start sm:items-center">
            <div className="flex-1 w-full sm:w-auto">
              <SearchInput
                value={search}
                onChange={handleSearchChange}
                placeholder="Search quizzes by title..."
                debounceMs={500}
                minLength={0}
                isLoading={isLoading}
              />
            </div>
            <div className="w-full sm:w-auto">
              <ExportButton
                endpoint="/api/vendor/quizzes/export"
                filters={exportFilters}
                filenamePrefix="quizzes"
                defaultFormat="csv"
              />
            </div>
          </div>

          {/* Bottom Row: Course and Status Filters */}
          <div className="flex flex-col sm:flex-row gap-15px">
            <div className="sm:w-200px">
              <AdvancedDropdown
                options={courseOptions}
                value={courseId}
                onChange={handleCourseChange}
                placeholder="All Courses"
              />
            </div>

            <div className="sm:w-200px">
              <AdvancedDropdown
                options={statusOptions}
                value={status}
                onChange={handleStatusChange}
                placeholder="All Status"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quizzes Table */}
      {!Array.isArray(quizzes) || quizzes.length === 0 ? (
        <NoData message="No quizzes found. Create your first quiz to get started." />
      ) : (
        <>
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-lightGrey5 dark:bg-darkdeep1">
                  <tr>
                    <th className="px-20px py-15px text-left text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Title
                    </th>
                    <th className="px-20px py-15px text-left text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Course
                    </th>
                    <th className="px-20px py-15px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Total Marks
                    </th>
                    <th className="px-20px py-15px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Attempts
                    </th>
                    <th className="px-20px py-15px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Status
                    </th>
                    <th className="px-20px py-15px text-center text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes
                    .filter(quiz => quiz && typeof quiz === 'object' && quiz.id)
                    .map((quiz) => (
                    <tr
                      key={quiz.id}
                      className="border-t border-borderColor dark:border-borderColor-dark hover:bg-lightGrey5 dark:hover:bg-darkdeep1 transition-colors"
                    >
                      <td className="px-20px py-15px">
                        <div className="text-14px font-medium text-blackColor dark:text-blackColor-dark">
                          {quiz.title || 'Untitled Quiz'}
                        </div>
                      </td>
                      <td className="px-20px py-15px">
                        {quiz.courseTitle ? (
                          <Link
                            href={`/courses/${quiz.courseSlug || '#'}`}
                            className="text-14px text-primaryColor hover:text-primaryColor/80 transition-colors"
                          >
                            {quiz.courseTitle}
                          </Link>
                        ) : (
                          <span className="text-14px text-contentColor dark:text-contentColor-dark">
                            Standalone
                          </span>
                        )}
                      </td>
                      <td className="px-20px py-15px text-center text-14px text-blackColor dark:text-blackColor-dark">
                        {typeof quiz.totalMarks === 'number' ? quiz.totalMarks : 0}
                      </td>
                      <td className="px-20px py-15px text-center text-14px text-blackColor dark:text-blackColor-dark">
                        {typeof quiz.attemptCount === 'number' ? quiz.attemptCount : 0}
                      </td>
                      <td className="px-20px py-15px text-center">
                        <span
                          className={`inline-block px-10px py-5px rounded-5 text-12px font-semibold ${
                            quiz.status === "published"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : quiz.status === "draft"
                              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {quiz.status ? (quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)) : 'Unknown'}
                        </span>
                      </td>
                      <td className="px-20px py-15px text-center">
                        <div className="flex items-center justify-center gap-10px">
                          <button
                            onClick={() => router.push(`/dashboards/vendor-edit-quiz/${quiz.id}`)}
                            className="text-primaryColor hover:text-primaryColor/80 text-14px font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(quiz.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-14px font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
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

export default VendorManageQuizMain;
