import React from "react";
import DropdownPrimary from "./DropdownPrimary";

const DropdownDashboard = () => {
  const items = [
    {
      name: "Superadmin",
      status: null,
      path: "/dashboards/superadmin-dashboard",
      type: "secondary",
      dropdown: [
        {
          name: "Superadmin Dashboard",
          status: null,
          path: "/dashboards/superadmin-dashboard",
          type: "secondary",
        },
        {
          name: "Superadmin Profile",
          status: null,
          path: "/dashboards/superadmin-profile",
          type: "secondary",
        },
        {
          name: "Organizations",
          status: null,
          path: "/dashboards/superadmin-organizations",
          type: "secondary",
        },
        {
          name: "Classes & Subjects",
          status: null,
          path: "/dashboards/superadmin-classes-subjects",
          type: "secondary",
        },
        {
          name: "Users",
          status: null,
          path: "/dashboards/superadmin-users",
          type: "secondary",
        },
        {
          name: "Message",
          status: null,
          path: "/dashboards/superadmin-message",
          type: "secondary",
        },
        {
          name: "Courses",
          status: null,
          path: "/dashboards/superadmin-course",
          type: "secondary",
        },
        {
          name: "Review",
          status: null,
          path: "/dashboards/superadmin-reviews",
          type: "secondary",
        },
        {
          name: "Superadmin Quiz",
          status: null,
          path: "/dashboards/superadmin-quiz-attempts",
          type: "secondary",
        },
        {
          name: "Audit Logs",
          status: null,
          path: "/dashboards/superadmin-audit-logs",
          type: "secondary",
        },
        {
          name: "Feedback",
          status: null,
          path: "/dashboards/superadmin-feedback",
          type: "secondary",
        },
        {
          name: "Setting",
          status: null,
          path: "/dashboards/superadmin-settings",
          type: "secondary",
        },
        {
          name: "Finance",
          status: null,
          path: "/dashboards/superadmin-finance",
          type: "secondary",
        },
      ],
    },
    {
      name: "Admin",
      status: null,
      path: "/dashboards/admin-dashboard",
      type: "secondary",
      dropdown: [
        {
          name: "Admin Dashboard",
          status: null,
          path: "/dashboards/admin-dashboard",
          type: "secondary",
        },
        {
          name: "Admin Profile",
          status: null,
          path: "/dashboards/admin-profile",
          type: "secondary",
        },
        {
          name: "Users",
          status: null,
          path: "/dashboards/admin-users",
          type: "secondary",
        },
        {
          name: "Message",
          status: null,
          path: "/dashboards/admin-message",
          type: "secondary",
        },
        {
          name: "Courses",
          status: null,
          path: "/dashboards/admin-course",
          type: "secondary",
        },
        {
          name: "Assign Course",
          status: null,
          path: "/dashboards/admin-assign-course",
          type: "secondary",
        },
        {
          name: "Review",
          status: null,
          path: "/dashboards/admin-reviews",
          type: "secondary",
        },
        {
          name: "Admin Quiz",
          status: null,
          path: "/dashboards/admin-quiz-attempts",
          type: "secondary",
        },
        {
          name: "Audit Logs",
          status: null,
          path: "/dashboards/admin-audit-logs",
          type: "secondary",
        },
        {
          name: "Parent Access Control",
          status: null,
          path: "/dashboards/admin-parent-access-control",
          type: "secondary",
        },
        {
          name: "Setting",
          status: null,
          path: "/dashboards/admin-settings",
          type: "secondary",
        },
        {
          name: "Finance",
          status: null,
          path: "/dashboards/organization-finance",
          type: "secondary",
        },
      ],
    },
    {
      name: "Vendor",
      status: null,
      path: "/dashboards/vendor-dashboard",
      type: "secondary",
      dropdown: [
        {
          name: "Vendor Dashboard",
          status: null,
          path: "/dashboards/vendor-dashboard",
          type: "secondary",
        },
      ],
    },
    {
      name: "Instructor",
      status: null,
      path: "/dashboards/instructor-dashboard",
      type: "secondary",
      dropdown: [
        {
          name: "Ins. Dashboard",
          status: null,
          path: "/dashboards/instructor-dashboard",
          type: "secondary",
        },
        {
          name: "Ins. Profile",
          status: null,
          path: "/dashboards/instructor-profile",
          type: "secondary",
        },
        {
          name: "Users",
          status: null,
          path: "/dashboards/instructor-users",
          type: "secondary",
        },
        {
          name: "Message",
          status: null,
          path: "/dashboards/instructor-message",
          type: "secondary",
        },
        {
          name: "Wishlist",
          status: null,
          path: "/dashboards/instructor-wishlist",
          type: "secondary",
        },
        {
          name: "Review",
          status: null,
          path: "/dashboards/instructor-reviews",
          type: "secondary",
        },
        {
          name: "Student Quiz Attempts",
          status: null,
          path: "/dashboards/instructor-my-quiz-attempts",
          type: "secondary",
        },
        {
          name: "My Courses",
          status: null,
          path: "/dashboards/instructor-course",
          type: "secondary",
        },
        {
          name: "Assign Courses",
          status: null,
          path: "/dashboards/instructor-assign-course",
          type: "secondary",
        },
        {
          name: "Announcements",
          status: null,
          path: "/dashboards/instructor-announcments",
          type: "secondary",
        },
        {
          name: "Quiz Attempt",
          status: null,
          path: "/dashboards/instructor-quiz-attempts",
          type: "secondary",
        },

        {
          name: "Setting",
          status: null,
          path: "/dashboards/instructor-settings",
          type: "secondary",
        },
      ],
    },
    {
      name: "Student",
      status: null,
      path: "/dashboards/student-dashboard",
      type: "secondary",
      dropdown: [
        {
          name: "Dashboard",
          status: null,
          path: "/dashboards/student-dashboard",
          type: "secondary",
        },
        {
          name: "Profile",
          status: null,
          path: "/dashboards/student-profile",
          type: "secondary",
        },
        {
          name: "Message",
          status: null,
          path: "/dashboards/student-message",
          type: "secondary",
        },
        {
          name: "Enrolled Courses",
          status: null,
          path: "/dashboards/student-enrolled-courses",
          type: "secondary",
        },
        {
          name: "Wishlist",
          status: null,
          path: "/dashboards/student-wishlist",
          type: "secondary",
        },
        {
          name: "My Quiz",
          status: null,
          path: "/dashboards/student-my-quiz",
          type: "secondary",
        },

        {
          name: "Assignment",
          status: null,
          path: "/dashboards/student-assignments",
          type: "secondary",
        },

        {
          name: "Setting",
          status: null,
          path: "/dashboards/student-settings",
          type: "secondary",
        },
      ],
    },
    {
      name: "Mentor",
      status: null,
      path: "/dashboards/mentor-dashboard",
      type: "secondary",
      dropdown: [
        {
          name: "Mentor Dashboard",
          status: null,
          path: "/dashboards/mentor-dashboard",
          type: "secondary",
        },
      ],
    },
    {
      name: "Parent",
      status: null,
      path: "/dashboards/parent-dashboard",
      type: "secondary",
      dropdown: [
        {
          name: "Parent Dashboard",
          status: null,
          path: "/dashboards/parent-dashboard",
          type: "secondary",
        },
        {
          name: "Profile",
          status: null,
          path: "/dashboards/parent-profile",
          type: "secondary",
        },
        {
          name: "Student Progress",
          status: null,
          path: "/dashboards/parent-student-progress",
          type: "secondary",
        },
        {
          name: "Activity Tracker",
          status: null,
          path: "/dashboards/parent-activity-tracker",
          type: "secondary",
        },
        {
          name: "Achievements",
          status: null,
          path: "/dashboards/parent-achievements",
          type: "secondary",
        },
        {
          name: "Setting",
          status: null,
          path: "/dashboards/parent-settings",
          type: "secondary",
        },
      ],
    },
    {
      name: "Brand",
      status: null,
      path: "/dashboards/brand-dashboard",
      type: "secondary",
      dropdown: [
        {
          name: "Brand Dashboard",
          status: null,
          path: "/dashboards/brand-dashboard",
          type: "secondary",
        },
        {
          name: "Brand Profile",
          status: null,
          path: "/dashboards/brand-profile",
          type: "secondary",
        },
        {
          name: "Events",
          status: null,
          path: "/dashboards/brand-events",
          type: "secondary",
        },
        {
          name: "Certificates",
          status: null,
          path: "/dashboards/brand-certificates",
          type: "secondary",
        },
        {
          name: "Settings",
          status: null,
          path: "/dashboards/brand-settings",
          type: "secondary",
        },
      ],
    },
  ];
  return <DropdownPrimary items={items} />;
};

export default DropdownDashboard;
