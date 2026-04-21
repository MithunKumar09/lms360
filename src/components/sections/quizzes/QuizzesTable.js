"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client.js";
import useCoursesForDropdown from "@/hooks/api/useCoursesForDropdown.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown.js";
import NoData from "@/components/shared/others/NoData";
import { useAuthStore } from "@/store/index.js";

const QuizzesTable = ({ role = "instructor" }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const user = useAuthStore((state) => state.user);

  // Filters
  const [filters, setFilters] = useState({
    courseId: null,
    orgId: null, // Only for superadmin
    status: null,
    page: 1,
    limit: 20,
  });

  // Fetch quizzes
  const { data, isLoading, error } = useQuery({
    queryKey: ["quizzes", role, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
      });
      if (filters.courseId && filters.courseId !== "standalone") {
        params.append("courseId", filters.courseId);
      }
      // Note: For standalone quizzes, we'll filter on frontend (courseId is null)
      if (filters.orgId && role === "superadmin" && filters.orgId !== "global") {
        params.append("orgId", filters.orgId);
      }
      if (filters.status) params.append("status", filters.status);

      const response = await apiClient.get(`/quizzes?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch quizzes");
      }
      return response;
    },
  });

  // Fetch organizations for superadmin filter
  const { data: orgsData } = useQuery({
    queryKey: ["organizations", "list"],
    queryFn: async () => {
      const response = await apiClient.get("/organizations");
      return response.organizations || [];
    },
    enabled: role === "superadmin",
    staleTime: 5 * 60 * 1000,
  });
  const organizations = orgsData || [];

  // Fetch courses for filter
  const { data: coursesData } = useCoursesForDropdown();
  const courses = coursesData?.courses || [];

  const courseOptions = [
    { id: "all", label: "All Courses", value: null },
    { id: "standalone", label: "Standalone Quizzes", value: "standalone" },
    ...courses.map((course) => ({
      id: course.id,
      label: course.title,
      value: course.id,
    })),
  ];

  const orgOptions = [
    { id: "all", label: "All Organizations", value: null },
    { id: "global", label: "Global Quizzes", value: "global" },
    ...organizations.map((org) => ({
      id: org.id,
      label: org.name,
      value: org.id,
    })),
  ];

  // Status options
  const statusOptions = [
    { id: "all", label: "All Status", value: null },
    { id: "draft", label: "Draft", value: "draft" },
    { id: "published", label: "Published", value: "published" },
    { id: "closed", label: "Closed", value: "closed" },
  ];

  let quizzes = data?.quizzes || [];
  // Filter standalone quizzes if filter is set
  if (filters.courseId === "standalone") {
    quizzes = quizzes.filter((q) => q.courseId === null);
  }
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/quizzes/${id}`);
      if (!response.success) {
        throw new Error(response.error || "Failed to delete quiz");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      createAlert({
        icon: "success",
        title: "Success!",
        text: "Quiz deleted successfully",
      });
    },
    onError: (error) => {
      createAlert({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to delete quiz",
      });
    },
  });

  const handleDelete = (id, title) => {
    createAlert({
      icon: "warning",
      title: "Are you sure?",
      text: `Do you want to delete "${title}"? This action cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(id);
      }
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value === "all" || value === null ? null : value === "standalone" ? "standalone" : value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: "bg-gray-500 text-white",
      published: "bg-green-500 text-white",
      closed: "bg-red-500 text-white",
    };
    return badges[status] || "bg-gray-500 text-white";
  };

  const getDashboardPath = () => {
    if (role === "superadmin") return "/dashboards/superadmin-add-quiz";
    if (role === "admin") return "/dashboards/admin-add-quiz";
    return "/dashboards/instructor-add-quiz";
  };

  const getManagePath = () => {
    if (role === "superadmin") return "/dashboards/superadmin-submissions";
    if (role === "admin") return "/dashboards/admin-submissions";
    return "/dashboards/instructor-submissions";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-gray-500">Loading quizzes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className={`grid grid-cols-1 ${role === "superadmin" ? "md:grid-cols-4" : "md:grid-cols-3"} gap-4 mb-6`}>
        {role === "superadmin" && (
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Filter by Organization
            </label>
            <AdvancedDropdown
              options={orgOptions}
              value={filters.orgId || "all"}
              onChange={(value) => handleFilterChange("orgId", value === "global" ? "global" : value)}
              placeholder="All Organizations"
              searchable={true}
            />
          </div>
        )}
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Filter by Course
          </label>
          <AdvancedDropdown
            options={courseOptions}
            value={filters.courseId || "all"}
            onChange={(value) => handleFilterChange("courseId", value)}
            placeholder="All Courses"
            searchable={true}
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Filter by Status
          </label>
          <AdvancedDropdown
            options={statusOptions}
            value={filters.status || "all"}
            onChange={(value) => handleFilterChange("status", value)}
            placeholder="All Status"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => {
              setFilters({ courseId: null, orgId: null, status: null, page: 1, limit: 20 });
            }}
            className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <hr className="my-4 border-contentColor opacity-35" />

      {/* Table */}
      <div className="overflow-auto">
        {quizzes.length === 0 ? (
          <NoData message="No quizzes found" />
        ) : (
          <table className="w-full text-left text-nowrap">
            <thead>
              <tr className="border-b border-borderColor dark:border-borderColor-dark">
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Title
                </th>
                {role === "superadmin" && (
                  <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                    Organization
                  </th>
                )}
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Course
                </th>
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Total Marks
                </th>
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Time Limit
                </th>
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Status
                </th>
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((quiz) => (
                <tr
                  key={quiz.id}
                  className="border-b border-borderColor dark:border-borderColor-dark hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="py-15px px-10px">
                    <div className="font-semibold text-blackColor dark:text-blackColor-dark">
                      {quiz.title}
                    </div>
                    {quiz.description && (
                      <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {quiz.description}
                      </div>
                    )}
                  </td>
                  {role === "superadmin" && (
                    <td className="py-15px px-10px text-sm text-contentColor dark:text-contentColor-dark">
                      {quiz.orgName || "Global"}
                    </td>
                  )}
                  <td className="py-15px px-10px text-sm text-contentColor dark:text-contentColor-dark">
                    {quiz.courseTitle || "Standalone"}
                  </td>
                  <td className="py-15px px-10px text-sm text-contentColor dark:text-contentColor-dark">
                    {quiz.totalMarks}
                  </td>
                  <td className="py-15px px-10px text-sm text-contentColor dark:text-contentColor-dark">
                    {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : "Unlimited"}
                  </td>
                  <td className="py-15px px-10px">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(
                        quiz.status
                      )}`}
                    >
                      {quiz.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-15px px-10px">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          router.push(`${getManagePath()}?quizId=${quiz.id}`)
                        }
                        className="flex items-center gap-1 text-sm font-bold text-primaryColor hover:text-primaryColor/80 px-2 py-1"
                        title="View Submissions"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        Submissions
                      </button>
                      <button
                        onClick={() =>
                          router.push(`${getDashboardPath().replace("-add-quiz", "-edit-quiz")}?id=${quiz.id}`)
                        }
                        className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 px-2 py-1"
                        title="Edit Quiz"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(quiz.id, quiz.title)}
                        className="flex items-center gap-1 text-sm font-bold text-red-600 hover:text-red-800 px-2 py-1"
                        title="Delete Quiz"
                        disabled={deleteMutation.isPending}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{" "}
            quizzes
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizzesTable;

