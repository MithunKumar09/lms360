/**
 * Sidebar Items Configuration
 * 
 * Centralized configuration of all sidebar menu items for each role.
 * Used for sidebar access control management.
 */

export const SIDEBAR_ITEMS_BY_ROLE = {
  superadmin: [
    { name: "Dashboard", path: "/dashboards/superadmin-dashboard" },
    { name: "Organizations", path: "/dashboards/superadmin-organizations" },
    { name: "Classes & Subjects", path: "/dashboards/superadmin-classes-subjects" },
    { name: "Users", path: "/dashboards/superadmin-users" },
    { name: "Vendor Requests", path: "/dashboards/superadmin-vendor-requests" },
    { name: "Manage Vendors", path: "/dashboards/superadmin-manage-vendors" },
    { name: "My Profile", path: "/dashboards/superadmin-profile" },
    { name: "Courses", path: "/dashboards/superadmin-course" },
    { name: "Course Settings", path: "/dashboards/superadmin-course-settings" },
    { name: "Course Management", path: "/dashboards/superadmin-course-management" },
    { name: "Course Access Control", path: "/dashboards/superadmin-course-access-control" },
    { name: "Create Course", path: "/dashboards/create-course" },
    { name: "Reviews", path: "/dashboards/superadmin-reviews" },
    { name: "Blogs", path: "/dashboards/superadmin-blogs" },
    { name: "Assignments & Quiz", path: "/dashboards/superadmin-assignments-quiz" },
    { name: "Add Quiz", path: "/dashboards/superadmin-add-quiz" },
    { name: "Manage Quiz", path: "/dashboards/superadmin-manage-quiz" },
    { name: "Submissions", path: "/dashboards/superadmin-submissions" },
    { name: "Quiz Attempts", path: "/dashboards/superadmin-quiz-attempts" },
    { name: "Announcements", path: "/dashboards/superadmin-announcements" },
    { name: "Feedback", path: "/dashboards/superadmin-feedback" },
    { name: "Wishlist", path: "/dashboards/superadmin-wishlist" },
    { name: "Audit Logs", path: "/dashboards/superadmin-audit-logs" },
    { name: "Finance", path: "/dashboards/superadmin-finance-overview" },
    { name: "Settings", path: "/dashboards/superadmin-settings" },
    { name: "Access Control", path: "/dashboards/superadmin-sidebar-access-control" },
  ],
  admin: [
    { name: "Dashboard", path: "/dashboards/admin-dashboard" },
    { name: "Organizations", path: "/dashboards/admin-organizations" },
    { name: "Users", path: "/dashboards/admin-users" },
    { name: "My Profile", path: "/dashboards/admin-profile" },
    { name: "Courses", path: "/dashboards/admin-course" },
    { name: "Course Settings", path: "/dashboards/admin-course-settings" },
    { name: "Course Management", path: "/dashboards/admin-course-management" },
    { name: "Create Course", path: "/dashboards/create-course" },
    { name: "Reviews", path: "/dashboards/admin-reviews" },
    { name: "Blogs", path: "/dashboards/admin-blogs" },
    { name: "Assignments & Quiz", path: "/dashboards/admin-assignments-quiz" },
    { name: "Add Quiz", path: "/dashboards/admin-add-quiz" },
    { name: "Manage Quiz", path: "/dashboards/admin-manage-quiz" },
    { name: "Submissions", path: "/dashboards/admin-submissions" },
    { name: "Quiz Attempts", path: "/dashboards/admin-quiz-attempts" },
    { name: "Announcements", path: "/dashboards/announcements" },
    { name: "Feedback", path: "/dashboards/admin-feedback" },
    { name: "Wishlist", path: "/dashboards/admin-wishlist" },
    { name: "Finance", path: "/dashboards/organization-finance" },
    { name: "Settings", path: "/dashboards/admin-settings" },
  ],
  instructor: [
    { name: "Dashboard", path: "/dashboards/instructor-dashboard" },
    { name: "My Profile", path: "/dashboards/instructor-profile" },
    { name: "Courses", path: "/dashboards/instructor-course" },
    { name: "Create Course", path: "/dashboards/create-course" },
    { name: "Reviews", path: "/dashboards/instructor-reviews" },
    { name: "Assignments & Quiz", path: "/dashboards/instructor-assignments-quiz" },
    { name: "Add Quiz", path: "/dashboards/instructor-add-quiz" },
    { name: "Manage Quiz", path: "/dashboards/instructor-manage-quiz" },
    { name: "Submissions", path: "/dashboards/instructor-submissions" },
    { name: "Quiz Attempts", path: "/dashboards/instructor-quiz-attempts" },
    { name: "Announcements", path: "/dashboards/instructor-announcements" },
    { name: "Feedback", path: "/dashboards/instructor-feedback" },
    { name: "Wishlist", path: "/dashboards/instructor-wishlist" },
    { name: "Settings", path: "/dashboards/instructor-settings" },
  ],
  vendor: [
    { name: "Dashboard", path: "/dashboards/vendor-dashboard" },
    { name: "My Profile", path: "/dashboards/vendor-profile" },
    { name: "Courses", path: "/dashboards/vendor-course" },
    { name: "Create Course", path: "/dashboards/create-course" },
    { name: "Reviews", path: "/dashboards/vendor-reviews" },
    { name: "Wishlist", path: "/dashboards/vendor-wishlist" },
    { name: "Settings", path: "/dashboards/vendor-settings" },
  ],
  mentor: [
    { name: "Dashboard", path: "/dashboards/mentor-dashboard" },
    { name: "My Profile", path: "/dashboards/mentor-profile" },
    { name: "Courses", path: "/dashboards/mentor-course" },
    { name: "Reviews", path: "/dashboards/mentor-reviews" },
    { name: "Wishlist", path: "/dashboards/mentor-wishlist" },
    { name: "Settings", path: "/dashboards/mentor-settings" },
  ],
  student: [
    { name: "Dashboard", path: "/dashboards/student-dashboard" },
    { name: "Psychometric Test", path: "#" },
    { name: "My Profile", path: "/dashboards/student-profile" },
    { name: "Courses", path: "/dashboards/student-course" },
    { name: "My Courses", path: "/dashboards/student-my-courses" },
    { name: "Wishlist", path: "/dashboards/student-wishlist" },
    { name: "Reviews", path: "/dashboards/student-reviews" },
    { name: "Assignments & Quiz", path: "/dashboards/student-assignments-quiz" },
    { name: "My Assignments", path: "/dashboards/student-my-assignments" },
    { name: "Quiz Attempts", path: "/dashboards/student-quiz-attempts" },
    { name: "Announcements", path: "/dashboards/student-announcements" },
    { name: "Feedback", path: "/dashboards/student-feedback" },
    { name: "Settings", path: "/dashboards/student-settings" },
  ],
};

/**
 * Get all sidebar items for a specific role
 * @param {string} role - Role name (superadmin, admin, instructor, etc.)
 * @returns {Array} Array of sidebar items
 */
export function getSidebarItemsForRole(role) {
  return SIDEBAR_ITEMS_BY_ROLE[role] || [];
}

/**
 * Get all available roles
 * @returns {Array} Array of role names
 */
export function getAvailableRoles() {
  return Object.keys(SIDEBAR_ITEMS_BY_ROLE);
}

/**
 * Get sidebar item by name and role
 * @param {string} role - Role name
 * @param {string} itemName - Item name
 * @returns {Object|null} Sidebar item or null
 */
export function getSidebarItemByName(role, itemName) {
  const items = getSidebarItemsForRole(role);
  return items.find(item => item.name === itemName) || null;
}
