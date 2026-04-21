"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export default function AdminParentAccessControlMain() {
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  
  // UI state
  const [filters, setFilters] = useState({
    search: "",
    parent_id: "",
    student_id: "",
  });
  
  const [selectedParent, setSelectedParent] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    org_id: user?.orgId || "",
    parent_user_id: "",
    student_user_id: "",
    can_view_progress: true,
    can_view_attendance: true,
    can_view_achievements: true,
    can_view_certificates: true,
    can_view_activity_log: true,
    can_view_engagement_stats: true,
  });

  // Fetch parent access settings
  const { data: settingsData, isLoading, refetch } = useQuery({
    queryKey: ['parentAccessSettings', filters, user?.orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.parent_id) params.append('parent_id', filters.parent_id);
      if (filters.student_id) params.append('student_id', filters.student_id);
      
      const response = await apiClient.get(`/admin/parent-access-control?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch parent access settings');
      }
      return response;
    },
    enabled: isAuthenticated && !!user?.orgId,
    staleTime: 30 * 1000,
  });

  const settings = settingsData?.settings || [];

  // Fetch parents list
  const { data: parentsData } = useQuery({
    queryKey: ['parents', 'admin', user?.orgId],
    queryFn: async () => {
      const params = new URLSearchParams({
        role: 'parent',
        pageSize: '1000',
        page: '1',
      });
      if (user?.orgId) params.append('orgId', user.orgId);
      if (filters.search) params.append('q', filters.search);

      const response = await apiClient.get(`/users?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch parents');
      }
      return response.items || [];
    },
    enabled: isAuthenticated && !!user?.orgId,
    staleTime: 5 * 60 * 1000,
  });

  const parents = parentsData || [];

  // Fetch students list
  const { data: studentsData } = useQuery({
    queryKey: ['students', 'for-parent-link', user?.orgId],
    queryFn: async () => {
      const params = new URLSearchParams({
        role: 'student',
        pageSize: '1000',
        page: '1',
      });
      if (user?.orgId) params.append('orgId', user.orgId);

      const response = await apiClient.get(`/users?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch students');
      }
      return response.items || [];
    },
    enabled: isAuthenticated && showLinkModal && !!user?.orgId,
    staleTime: 30 * 1000,
  });

  const students = studentsData || [];

  // Note: We don't fetch linked students here since the link-parent API handles duplicates
  // The API will skip already-linked students automatically
  const linkedStudentIds = new Set();

  // Mutation: Update access settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await apiClient.put('/admin/parent-access-control', formData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update access settings');
      }
      return response;
    },
    onSuccess: () => {
      createAlert("success", "Access settings updated successfully");
      setShowSettingsModal(false);
      setSettingsForm({
        org_id: user?.orgId || "",
        parent_user_id: "",
        student_user_id: "",
        can_view_progress: true,
        can_view_attendance: true,
        can_view_achievements: true,
        can_view_certificates: true,
        can_view_activity_log: true,
        can_view_engagement_stats: true,
      });
      refetch();
      queryClient.invalidateQueries(['parentAccessSettings']);
    },
    onError: (error) => {
      createAlert("error", error.message || "Failed to update access settings");
    },
  });

  // Mutation: Link parent to students
  const linkParentMutation = useMutation({
    mutationFn: async ({ parentId, studentIds, permissions }) => {
      const promises = studentIds.map(studentId => 
        apiClient.post(`/users/${parentId}/link-parent`, {
          student_ids: [studentId],
          relationship_type: 'parent',
          is_primary_contact: false,
          can_view_grades: permissions.can_view_grades,
          can_view_attendance: permissions.can_view_attendance,
        })
      );
      await Promise.all(promises);
      return { success: true };
    },
    onSuccess: () => {
      createAlert("success", "Parent linked to students successfully");
      setShowLinkModal(false);
      setSelectedParent(null);
      refetch();
    },
    onError: (error) => {
      createAlert("error", error.message || "Failed to link parent to students");
    },
  });

  const handleLinkParent = (parent) => {
    setSelectedParent(parent);
    setShowLinkModal(true);
  };

  const handleManageSettings = (setting) => {
    setSettingsForm({
      org_id: setting.orgId || user?.orgId || "",
      parent_user_id: setting.parentUserId || "",
      student_user_id: setting.studentUserId || "",
      can_view_progress: setting.canViewProgress !== false,
      can_view_attendance: setting.canViewAttendance !== false,
      can_view_achievements: setting.canViewAchievements !== false,
      can_view_certificates: setting.canViewCertificates !== false,
      can_view_activity_log: setting.canViewActivityLog !== false,
      can_view_engagement_stats: setting.canViewEngagementStats !== false,
    });
    setShowSettingsModal(true);
  };

  const handleLinkSubmit = async () => {
    const selectedStudentIds = Array.from(document.querySelectorAll('input[name="student"]:checked')).map(el => el.value);
    
    if (selectedStudentIds.length === 0) {
      createAlert("error", "Please select at least one student");
      return;
    }

    await linkParentMutation.mutateAsync({
      parentId: selectedParent.id,
      studentIds: selectedStudentIds,
      permissions: {
        can_view_grades: true,
        can_view_attendance: true,
      },
    });
  };

  const handleSettingsSubmit = async () => {
    await updateSettingsMutation.mutateAsync(settingsForm);
  };

  const filteredSettings = useMemo(() => {
    let filtered = settings;
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter((setting) => {
        return (
          setting.parentEmail?.toLowerCase().includes(search) ||
          setting.parentName?.toLowerCase().includes(search) ||
          setting.studentEmail?.toLowerCase().includes(search) ||
          setting.studentName?.toLowerCase().includes(search)
        );
      });
    }
    
    return filtered;
  }, [settings, filters.search]);

  // Group settings by scope (org-wide, parent-specific, student-specific)
  const groupedSettings = useMemo(() => {
    const groups = {
      orgWide: [],
      parentSpecific: [],
      studentSpecific: [],
    };
    
    filteredSettings.forEach(setting => {
      if (!setting.parentUserId && !setting.studentUserId) {
        groups.orgWide.push(setting);
      } else if (setting.parentUserId && !setting.studentUserId) {
        groups.parentSpecific.push(setting);
      } else {
        groups.studentSpecific.push(setting);
      }
    });
    
    return groups;
  }, [filteredSettings]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Parent Access Control</h1>
              <p className="text-muted mb-0 small">
                Manage parent permissions and link parents to students
              </p>
            </div>
            <button
              onClick={() => {
                setSettingsForm({
                  org_id: user?.orgId || "",
                  parent_user_id: "",
                  student_user_id: "",
                  can_view_progress: true,
                  can_view_attendance: true,
                  can_view_achievements: true,
                  can_view_certificates: true,
                  can_view_activity_log: true,
                  can_view_engagement_stats: true,
                });
                setShowSettingsModal(true);
              }}
              className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors"
            >
              Create Access Setting
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by parent or student name/email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Filter by Parent
            </label>
            <select
              value={filters.parent_id}
              onChange={(e) => setFilters({ ...filters, parent_id: e.target.value })}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="">All Parents</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {`${parent.first_name || ""} ${parent.last_name || ""}`.trim() || parent.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Parents List - Quick Link Actions */}
      <div className="mb-6 p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
        <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-4">Parents</h2>
        {parents.length === 0 ? (
          <p className="text-sm text-contentColor dark:text-contentColor-dark">No parents found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parents.map((parent) => (
              <div
                key={parent.id}
                className="p-4 border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-darkdeep4 flex-shrink-0 flex items-center justify-center">
                    {parent.avatar_url ? (
                      <img
                        src={parent.avatar_url}
                        alt={`${parent.first_name} ${parent.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primaryColor/20 text-primaryColor text-lg font-bold">
                        {(parent.first_name?.[0] || parent.email?.[0] || "P").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark truncate">
                      {`${parent.first_name || ""} ${parent.last_name || ""}`.trim() || parent.email || "Unknown"}
                    </h3>
                    <p className="text-xs text-contentColor dark:text-contentColor-dark truncate">{parent.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleLinkParent(parent)}
                  className="w-full px-3 py-2 text-xs font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors"
                >
                  Link Students
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Access Settings List */}
      <div className="space-y-4">
        {/* Org-Wide Settings */}
        {groupedSettings.orgWide.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-3">Organization-Wide Settings</h2>
            <div className="space-y-3">
              {groupedSettings.orgWide.map((setting) => (
                <div
                  key={setting.id}
                  className="bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                        Default Settings for All Parents
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        <span className={setting.canViewProgress ? "text-green-600" : "text-red-600"}>
                          Progress: {setting.canViewProgress ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewAttendance ? "text-green-600" : "text-red-600"}>
                          Attendance: {setting.canViewAttendance ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewAchievements ? "text-green-600" : "text-red-600"}>
                          Achievements: {setting.canViewAchievements ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewCertificates ? "text-green-600" : "text-red-600"}>
                          Certificates: {setting.canViewCertificates ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewActivityLog ? "text-green-600" : "text-red-600"}>
                          Activity: {setting.canViewActivityLog ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewEngagementStats ? "text-green-600" : "text-red-600"}>
                          Engagement: {setting.canViewEngagementStats ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleManageSettings(setting)}
                      className="px-3 py-1 text-xs font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parent-Specific Settings */}
        {groupedSettings.parentSpecific.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-3">Parent-Specific Settings</h2>
            <div className="space-y-3">
              {groupedSettings.parentSpecific.map((setting) => (
                <div
                  key={setting.id}
                  className="bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-1">
                        {setting.parentName || setting.parentEmail}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        <span className={setting.canViewProgress ? "text-green-600" : "text-red-600"}>
                          Progress: {setting.canViewProgress ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewAttendance ? "text-green-600" : "text-red-600"}>
                          Attendance: {setting.canViewAttendance ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewAchievements ? "text-green-600" : "text-red-600"}>
                          Achievements: {setting.canViewAchievements ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewCertificates ? "text-green-600" : "text-red-600"}>
                          Certificates: {setting.canViewCertificates ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewActivityLog ? "text-green-600" : "text-red-600"}>
                          Activity: {setting.canViewActivityLog ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewEngagementStats ? "text-green-600" : "text-red-600"}>
                          Engagement: {setting.canViewEngagementStats ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleManageSettings(setting)}
                      className="px-3 py-1 text-xs font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student-Specific Settings */}
        {groupedSettings.studentSpecific.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-3">Student-Specific Overrides</h2>
            <div className="space-y-3">
              {groupedSettings.studentSpecific.map((setting) => (
                <div
                  key={setting.id}
                  className="bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-1">
                        {setting.parentName || setting.parentEmail} → {setting.studentName || setting.studentEmail}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        <span className={setting.canViewProgress ? "text-green-600" : "text-red-600"}>
                          Progress: {setting.canViewProgress ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewAttendance ? "text-green-600" : "text-red-600"}>
                          Attendance: {setting.canViewAttendance ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewAchievements ? "text-green-600" : "text-red-600"}>
                          Achievements: {setting.canViewAchievements ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewCertificates ? "text-green-600" : "text-red-600"}>
                          Certificates: {setting.canViewCertificates ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewActivityLog ? "text-green-600" : "text-red-600"}>
                          Activity: {setting.canViewActivityLog ? "✓" : "✗"}
                        </span>
                        <span className={setting.canViewEngagementStats ? "text-green-600" : "text-red-600"}>
                          Engagement: {setting.canViewEngagementStats ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleManageSettings(setting)}
                      className="px-3 py-1 text-xs font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredSettings.length === 0 && (
          <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
            <p className="text-contentColor dark:text-contentColor-dark">
              No access settings found. Create one to get started.
            </p>
          </div>
        )}
      </div>

      {/* Link Parent Modal */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setSelectedParent(null);
        }}
        title={`Link Students to ${selectedParent ? `${selectedParent.first_name} ${selectedParent.last_name}`.trim() : 'Parent'}`}
      >
        {selectedParent && (
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Select Students
              </label>
              <div className="max-h-96 overflow-y-auto border-2 border-borderColor dark:border-borderColor-dark rounded-md p-4">
                {students.length === 0 ? (
                  <p className="text-sm text-contentColor dark:text-contentColor-dark">No students found</p>
                ) : (
                  students.map((student) => (
                    <label
                      key={student.id}
                      className="flex items-center gap-2 py-2 px-2 rounded cursor-pointer hover:bg-darkdeep3 dark:hover:bg-darkdeep3-dark"
                    >
                      <input
                        type="checkbox"
                        name="student"
                        value={student.id}
                        className="w-4 h-4 text-primaryColor border-borderColor rounded focus:ring-primaryColor"
                      />
                      <span className="text-sm text-blackColor dark:text-blackColor-dark">
                        {student.email} [{`${student.first_name || ""} ${student.last_name || ""}`.trim() || 'No Name'}]
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setSelectedParent(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep3 dark:hover:bg-darkdeep3-dark"
              >
                Cancel
              </button>
              <button
                onClick={handleLinkSubmit}
                disabled={linkParentMutation.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 disabled:opacity-50"
              >
                {linkParentMutation.isPending ? "Linking..." : "Link Students"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false);
          setSettingsForm({
            org_id: user?.orgId || "",
            parent_user_id: "",
            student_user_id: "",
            can_view_progress: true,
            can_view_attendance: true,
            can_view_achievements: true,
            can_view_certificates: true,
            can_view_activity_log: true,
            can_view_engagement_stats: true,
          });
        }}
        title="Manage Access Settings"
      >
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Parent (Optional - leave empty for org-wide)
            </label>
            <select
              value={settingsForm.parent_user_id}
              onChange={(e) => setSettingsForm({ ...settingsForm, parent_user_id: e.target.value })}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="">Organization-Wide Default</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {`${parent.first_name || ""} ${parent.last_name || ""}`.trim() || parent.email}
                </option>
              ))}
            </select>
          </div>

          {settingsForm.parent_user_id && (
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Student (Optional - leave empty for parent default)
              </label>
              <select
                value={settingsForm.student_user_id}
                onChange={(e) => setSettingsForm({ ...settingsForm, student_user_id: e.target.value })}
                className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              >
                <option value="">Parent Default</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {`${student.first_name || ""} ${student.last_name || ""}`.trim() || student.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">Permissions</h3>
            {[
              { key: 'can_view_progress', label: 'View Progress' },
              { key: 'can_view_attendance', label: 'View Attendance' },
              { key: 'can_view_achievements', label: 'View Achievements' },
              { key: 'can_view_certificates', label: 'View Certificates' },
              { key: 'can_view_activity_log', label: 'View Activity Log' },
              { key: 'can_view_engagement_stats', label: 'View Engagement Stats' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settingsForm[key]}
                  onChange={(e) => setSettingsForm({ ...settingsForm, [key]: e.target.checked })}
                  className="w-4 h-4 text-primaryColor border-borderColor rounded focus:ring-primaryColor"
                />
                <span className="text-sm text-blackColor dark:text-blackColor-dark">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowSettingsModal(false);
                setSettingsForm({
                  org_id: user?.orgId || "",
                  parent_user_id: "",
                  student_user_id: "",
                  can_view_progress: true,
                  can_view_attendance: true,
                  can_view_achievements: true,
                  can_view_certificates: true,
                  can_view_activity_log: true,
                  can_view_engagement_stats: true,
                });
              }}
              className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep3 dark:hover:bg-darkdeep3-dark"
            >
              Cancel
            </button>
            <button
              onClick={handleSettingsSubmit}
              disabled={updateSettingsMutation.isPending}
              className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 disabled:opacity-50"
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
