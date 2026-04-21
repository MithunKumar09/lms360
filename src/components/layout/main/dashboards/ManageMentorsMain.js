"use client";

import { useState, useMemo, useCallback } from "react";
import { useMentorsList, useAssignStudentsToMentor, useUnassignStudentsFromMentor } from "@/hooks/api/useMentors";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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

export default function ManageMentorsMain() {
  const createAlert = useSweetAlert();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  
  // UI state
  const [filters, setFilters] = useState({
    search: "",
    page: 1,
    limit: 20,
  });
  
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  
  // Student selection state
  const [studentFilters, setStudentFilters] = useState({
    cohortId: "",
    programNodeId: "",
    year: "",
    sectionId: "",
    subjectId: "",
    search: "",
  });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedCohortId, setSelectedCohortId] = useState("");

  // Fetch mentors
  const { data: mentorsData, isLoading, refetch } = useMentorsList(filters, {
    enabled: true,
  });

  const mentors = mentorsData?.mentors || [];
  const pagination = mentorsData?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  };

  // Fetch cohorts for filtering
  const { data: cohortsData } = useQuery({
    queryKey: ['cohorts', 'admin', user?.orgId],
    queryFn: async () => {
      const response = await apiClient.get('/instructor-requests/cohorts');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch cohorts');
      }
      return response.data || [];
    },
    enabled: isAuthenticated && !!user?.orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const cohorts = cohortsData || [];

  // Fetch students with filters
  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students', 'for-assignment', studentFilters, user?.orgId],
    queryFn: async () => {
      const params = new URLSearchParams({
        role: 'student',
        pageSize: '1000', // Get all students for selection
        page: '1',
      });
      
      if (user?.orgId) params.append('orgId', user.orgId);
      if (studentFilters.cohortId) params.append('cohortId', studentFilters.cohortId);
      if (studentFilters.search) params.append('q', studentFilters.search);

      const response = await apiClient.get(`/users?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch students');
      }

      // Client-side filtering for program, year, section, subject
      let filtered = response.items || [];
      
      // Filter by program node (if cohort has program_node)
      if (studentFilters.programNodeId) {
        const cohortIdsWithProgram = cohorts
          .filter(c => c.program_node?.id === studentFilters.programNodeId)
          .map(c => c.id);
        if (cohortIdsWithProgram.length > 0) {
          // This would require checking student's cohort assignments
          // For now, we'll filter by selected cohort
        }
      }

      return filtered;
    },
    enabled: isAuthenticated && showAssignModal && !!user?.orgId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const students = studentsData || [];

  // Fetch assigned students for the selected mentor and cohort
  const { data: assignedStudentsData } = useQuery({
    queryKey: ['assigned-students', selectedMentor?.id, selectedCohortId],
    queryFn: async () => {
      if (!selectedMentor?.id) return [];
      
      // Get assigned students from the mentor data
      const assignedStudents = selectedMentor.assigned_students || [];
      
      // Filter by cohort if selected
      if (selectedCohortId) {
        return assignedStudents.filter(s => s.cohort_id === selectedCohortId);
      }
      
      return assignedStudents;
    },
    enabled: showAssignModal && !!selectedMentor?.id,
    staleTime: 0, // Always fetch fresh data when modal opens
  });

  const assignedStudentIds = new Set(
    (assignedStudentsData || []).map(s => s.id)
  );

  // Filter out already assigned students from the list (for the selected cohort)
  const availableStudents = useMemo(() => {
    if (!selectedCohortId) {
      // If no cohort selected, show all students (they can be assigned to different cohorts)
      return students;
    }
    // If cohort selected, filter out students already assigned to this mentor in this cohort
    return students.filter(s => !assignedStudentIds.has(s.id));
  }, [students, assignedStudentIds, selectedCohortId]);

  // Mutations
  const assignStudents = useAssignStudentsToMentor({
    onSuccess: (response) => {
      const message = response?.data?.message || 'Students assigned successfully';
      if (response?.data?.skipped_count > 0) {
        createAlert("warning", message);
      } else {
        createAlert("success", message);
      }
      setShowAssignModal(false);
      setSelectedMentor(null);
      setSelectedStudents([]);
      setSelectedCohortId("");
      setStudentFilters({
        cohortId: "",
        programNodeId: "",
        year: "",
        sectionId: "",
        subjectId: "",
        search: "",
      });
      refetch();
    },
  });

  const unassignStudents = useUnassignStudentsFromMentor({
    onSuccess: () => {
      setShowUnassignModal(false);
      setSelectedMentor(null);
      setSelectedStudents([]);
      refetch();
    },
  });

  const handleAssign = (mentor) => {
    setSelectedMentor(mentor);
    setSelectedStudents([]);
    setSelectedCohortId("");
    setStudentFilters({
      cohortId: "",
      programNodeId: "",
      year: "",
      sectionId: "",
      subjectId: "",
      search: "",
    });
    setShowAssignModal(true);
    // Refetch mentors to get latest assigned students data
    refetch();
  };

  const handleUnassign = (mentor) => {
    setSelectedMentor(mentor);
    setSelectedStudents([]);
    setShowUnassignModal(true);
  };

  const handleAssignSubmit = async () => {
    if (selectedStudents.length === 0) {
      createAlert("error", "Please select at least one student");
      return;
    }

    await assignStudents.mutateAsync({
      mentorId: selectedMentor.id,
      studentIds: selectedStudents,
      cohortId: selectedCohortId || null,
    });
  };

  const handleUnassignSubmit = async () => {
    if (selectedStudents.length === 0) {
      createAlert("error", "Please select at least one student to unassign");
      return;
    }

    await unassignStudents.mutateAsync({
      mentorId: selectedMentor.id,
      studentIds: selectedStudents,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  // Get unique program nodes from cohorts
  const programNodes = useMemo(() => {
    const nodes = new Map();
    cohorts.forEach(cohort => {
      if (cohort.program_node?.id) {
        nodes.set(cohort.program_node.id, cohort.program_node);
      }
    });
    return Array.from(nodes.values());
  }, [cohorts]);

  // Get unique sections from cohorts
  const sections = useMemo(() => {
    const secs = new Map();
    cohorts.forEach(cohort => {
      if (cohort.section?.id) {
        secs.set(cohort.section.id, cohort.section);
      }
    });
    return Array.from(secs.values());
  }, [cohorts]);

  const filteredMentors = useMemo(() => {
    if (!filters.search) return mentors;
    const search = filters.search.toLowerCase();
    return mentors.filter((mentor) => {
      return (
        mentor.email?.toLowerCase().includes(search) ||
        mentor.first_name?.toLowerCase().includes(search) ||
        mentor.last_name?.toLowerCase().includes(search) ||
        `${mentor.first_name} ${mentor.last_name}`.toLowerCase().includes(search)
      );
    });
  }, [mentors, filters.search]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Manage Mentors</h1>
              <p className="text-muted mb-0 small">
                View and manage mentor-student assignments
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
              Search Mentors
            </label>
            <input
              type="text"
              placeholder="Search by name or email..."
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
          <p className="text-contentColor dark:text-contentColor-dark">Loading mentors...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredMentors.length === 0 && (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            No mentors found
          </p>
        </div>
      )}

      {/* Mentors List */}
      {!isLoading && filteredMentors.length > 0 && (
        <div className="space-y-4">
          {filteredMentors.map((mentor) => (
            <div
              key={mentor.id}
              className="bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Mentor Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-darkdeep4 flex-shrink-0 flex items-center justify-center">
                    {mentor.avatar_url ? (
                      <img
                        src={mentor.avatar_url}
                        alt={`${mentor.first_name} ${mentor.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primaryColor/20 text-primaryColor text-xl font-bold">
                        {(mentor.first_name?.[0] || mentor.email?.[0] || "M").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                        {`${mentor.first_name || ""} ${mentor.last_name || ""}`.trim() || mentor.email || "Unknown"}
                      </h3>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        {mentor.assigned_students_count || 0} Students
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-contentColor dark:text-contentColor-dark">
                      <p>
                        <span className="font-semibold">Email:</span> {mentor.email}
                      </p>
                      <p>
                        <span className="font-semibold">Assigned Students:</span> {mentor.assigned_students_count || 0}
                      </p>
                      {mentor.assigned_students && mentor.assigned_students.length > 0 && (
                        <div className="mt-2">
                          <p className="font-semibold mb-1">Students:</p>
                          <div className="flex flex-wrap gap-2">
                            {mentor.assigned_students.slice(0, 5).map((student) => (
                              <span
                                key={student.id}
                                className="px-2 py-1 text-xs bg-darkdeep3 dark:bg-darkdeep3-dark rounded"
                              >
                                {`${student.first_name || ""} ${student.last_name || ""}`.trim() || student.email}
                              </span>
                            ))}
                            {mentor.assigned_students.length > 5 && (
                              <span className="px-2 py-1 text-xs bg-darkdeep3 dark:bg-darkdeep3-dark rounded">
                                +{mentor.assigned_students.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAssign(mentor)}
                    className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors"
                  >
                    Assign Students
                  </button>
                  {mentor.assigned_students_count > 0 && (
                    <button
                      onClick={() => handleUnassign(mentor)}
                      className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                    >
                      Unassign Students
                    </button>
                  )}
                </div>
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
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} mentors
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

      {/* Assign Students Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedMentor(null);
          setSelectedStudents([]);
          setSelectedCohortId("");
        }}
        title={`Assign Students to ${selectedMentor ? `${selectedMentor.first_name} ${selectedMentor.last_name}`.trim() : 'Mentor'}`}
      >
        {selectedMentor && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Cohort (Optional)
                </label>
                <select
                  value={studentFilters.cohortId}
                  onChange={(e) => {
                    setStudentFilters({ ...studentFilters, cohortId: e.target.value });
                    setSelectedCohortId(e.target.value);
                  }}
                  className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
                >
                  <option value="">All Cohorts</option>
                  {cohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.label || cohort.code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Search Students
                </label>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={studentFilters.search}
                  onChange={(e) => setStudentFilters({ ...studentFilters, search: e.target.value })}
                  className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
                />
              </div>
            </div>

            {/* Students List */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Select Students
              </label>
              <div className="max-h-96 overflow-y-auto border-2 border-borderColor dark:border-borderColor-dark rounded-md p-4">
                {isLoadingStudents ? (
                  <p className="text-sm text-contentColor dark:text-contentColor-dark">Loading students...</p>
                ) : availableStudents.length === 0 ? (
                  <p className="text-sm text-contentColor dark:text-contentColor-dark">
                    {selectedCohortId 
                      ? 'No available students found. All students may already be assigned to this mentor in the selected cohort.' 
                      : 'No students found'}
                  </p>
                ) : (
                  <>
                    {availableStudents.map((student) => {
                      const isAlreadyAssigned = assignedStudentIds.has(student.id) && selectedCohortId;
                      return (
                        <label 
                          key={student.id} 
                          className={`flex items-center gap-2 py-2 px-2 rounded ${
                            isAlreadyAssigned 
                              ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' 
                              : 'cursor-pointer hover:bg-darkdeep3 dark:hover:bg-darkdeep3-dark'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            disabled={isAlreadyAssigned}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudents([...selectedStudents, student.id]);
                              } else {
                                setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                              }
                            }}
                            className="w-4 h-4 text-primaryColor border-borderColor rounded focus:ring-primaryColor disabled:opacity-50"
                          />
                          <span className="text-sm text-blackColor dark:text-blackColor-dark">
                            {student.email} [{`${student.first_name || ""} ${student.last_name || ""}`.trim() || 'No Name'}]
                            {isAlreadyAssigned && (
                              <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                                (Already assigned to this cohort)
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                    {selectedCohortId && assignedStudentIds.size > 0 && (
                      <div className="mt-2 pt-2 border-t border-borderColor dark:border-borderColor-dark">
                        <p className="text-xs text-contentColor dark:text-contentColor-dark">
                          Note: Students already assigned to this mentor in the selected cohort are hidden. 
                          You can assign the same student from a different cohort.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
              {selectedStudents.length > 0 && (
                <p className="text-xs text-contentColor dark:text-contentColor-dark mt-2">
                  {selectedStudents.length} student(s) selected
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedMentor(null);
                  setSelectedStudents([]);
                  setSelectedCohortId("");
                }}
                className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep3 dark:hover:bg-darkdeep3-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSubmit}
                disabled={selectedStudents.length === 0 || assignStudents.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assignStudents.isPending ? "Assigning..." : `Assign ${selectedStudents.length} Student(s)`}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Unassign Students Modal */}
      <Modal
        isOpen={showUnassignModal}
        onClose={() => {
          setShowUnassignModal(false);
          setSelectedMentor(null);
          setSelectedStudents([]);
        }}
        title={`Unassign Students from ${selectedMentor ? `${selectedMentor.first_name} ${selectedMentor.last_name}`.trim() : 'Mentor'}`}
      >
        {selectedMentor && (
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Select Students to Unassign
              </label>
              <div className="max-h-96 overflow-y-auto border-2 border-borderColor dark:border-borderColor-dark rounded-md p-4">
                {selectedMentor.assigned_students && selectedMentor.assigned_students.length > 0 ? (
                  selectedMentor.assigned_students.map((student) => (
                    <label key={student.id} className="flex items-center gap-2 py-2 cursor-pointer hover:bg-darkdeep3 dark:hover:bg-darkdeep3-dark px-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                          }
                        }}
                        className="w-4 h-4 text-primaryColor border-borderColor rounded focus:ring-primaryColor"
                      />
                      <span className="text-sm text-blackColor dark:text-blackColor-dark">
                        {student.email} [{`${student.first_name || ""} ${student.last_name || ""}`.trim() || 'No Name'}]
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-contentColor dark:text-contentColor-dark">No assigned students</p>
                )}
              </div>
              {selectedStudents.length > 0 && (
                <p className="text-xs text-contentColor dark:text-contentColor-dark mt-2">
                  {selectedStudents.length} student(s) selected for unassignment
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowUnassignModal(false);
                  setSelectedMentor(null);
                  setSelectedStudents([]);
                }}
                className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep3 dark:hover:bg-darkdeep3-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnassignSubmit}
                disabled={selectedStudents.length === 0 || unassignStudents.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {unassignStudents.isPending ? "Unassigning..." : `Unassign ${selectedStudents.length} Student(s)`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

