import React from "react";
import MobileAccordion from "./MobileAccordion";
import accordions from "@/libs/accordions";

const AccordionDashboard = () => {
  const items = [
    {
      name: "Superadmin",
      path: "/dashboards/superadmin-dashboard",
      accordion: true,
      items: [
        {
          name: "Superadmin Dashboard",

          path: "/dashboards/superadmin-dashboard",
        },
        {
          name: "Superadmin Profile",

          path: "/dashboards/superadmin-profile",
        },
        {
          name: "Organizations",

          path: "/dashboards/superadmin-organizations",
        },
        {
          name: "Classes & Subjects",

          path: "/dashboards/superadmin-classes-subjects",
        },
        {
          name: "Users",

          path: "/dashboards/superadmin-users",
        },
        {
          name: "Message",

          path: "/dashboards/superadmin-message",
        },
        {
          name: "Courses",

          path: "/dashboards/superadmin-course",
        },
        {
          name: "Review",

          path: "/dashboards/superadmin-reviews",
        },
        {
          name: "Superadmin Quiz",

          path: "/dashboards/superadmin-quiz-attempts",
        },
        {
          name: "Audit Logs",

          path: "/dashboards/superadmin-audit-logs",
        },
        {
          name: "Feedback",

          path: "/dashboards/superadmin-feedback",
        },
        {
          name: "Setting",

          path: "/dashboards/superadmin-settings",
        },
        {
          name: "Finance",

          path: "/dashboards/superadmin-finance",
        },
      ],
    },
    {
      name: "Admin",
      path: "/dashboards/admin-dashboard",
      accordion: true,
      items: [
        {
          name: "Admin Dashboard",

          path: "/dashboards/admin-dashboard",
        },
        {
          name: "Admin Profile",

          path: "/dashboards/admin-profile",
        },
        {
          name: "Users",

          path: "/dashboards/admin-users",
        },
        {
          name: "Message",

          path: "/dashboards/admin-message",
        },
        {
          name: "Courses",

          path: "/dashboards/admin-course",
        },
        {
          name: "Assign Course",

          path: "/dashboards/admin-assign-course",
        },
        {
          name: "Review",

          path: "/dashboards/admin-reviews",
        },
        {
          name: "Admin Quiz",

          path: "/dashboards/admin-quiz-attempts",
        },
        {
          name: "Audit Logs",

          path: "/dashboards/admin-audit-logs",
        },
        {
          name: "Mentor",

          path: "/dashboards/admin-manage-mentors",
        },
        {
          name: "Parent Access Control",

          path: "/dashboards/admin-parent-access-control",
        },
        {
          name: "Setting",

          path: "/dashboards/admin-settings",
        },
        {
          name: "Finance",

          path: "/dashboards/organization-finance",
        },
      ],
    },
    {
      name: "Vendor",
      path: "/dashboards/vendor-dashboard",
      accordion: true,
      items: [
        {
          name: "Vendor Dashboard",

          path: "/dashboards/vendor-dashboard",
        },
        {
          name: "Finance",

          path: "/dashboards/vendor-finance",
        },
      ],
    },
    {
      name: "Instructor",
      path: "/dashboards/instructor-dashboard",
      accordion: true,
      items: [
        {
          name: "Ins. Dashboard",

          path: "/dashboards/instructor-dashboard",
        },
        {
          name: "Ins. Profile",

          path: "/dashboards/instructor-profile",
        },
        {
          name: "Users",

          path: "/dashboards/instructor-users",
        },
        {
          name: "Message",

          path: "/dashboards/instructor-message",
        },
        {
          name: "Wishlist",

          path: "/dashboards/instructor-wishlist",
        },
        {
          name: "Review",

          path: "/dashboards/instructor-reviews",
        },
        {
          name: "Student Quiz Attempts",
          path: "/dashboards/instructor-my-quiz-attempts",
        },
        {
          name: "My Courses",

          path: "/dashboards/instructor-course",
        },
        {
          name: "Assign Courses",

          path: "/dashboards/instructor-assign-course",
        },
        {
          name: "Announcements",

          path: "/dashboards/instructor-announcments",
        },
        {
          name: "Quiz Attempt",

          path: "/dashboards/instructor-quiz-attempts",
        },

        {
          name: "Setting",

          path: "/dashboards/instructor-settings",
        },
      ],
    },
    {
      name: "Student",
      path: "/dashboards/student-dashboard",
      accordion: true,
      items: [
        {
          name: "Dashboard",

          path: "/dashboards/student-dashboard",
        },
        {
          name: "Profile",

          path: "/dashboards/student-profile",
        },
        {
          name: "Message",

          path: "/dashboards/student-message",
        },
        {
          name: "Enrolled Courses",

          path: "/dashboards/student-enrolled-courses",
        },
        {
          name: "Wishlist",

          path: "/dashboards/student-wishlist",
        },
        {
          name: "My Quiz",

          path: "/dashboards/student-my-quiz",
        },

        {
          name: "Assignment",

          path: "/dashboards/student-assignments",
        },

        {
          name: "Setting",

          path: "/dashboards/student-settings",
        },
      ],
    },
    {
      name: "Mentor",
      path: "/dashboards/mentor-dashboard",
      accordion: true,
      items: [
        {
          name: "Mentor Dashboard",

          path: "/dashboards/mentor-dashboard",
        },
      ],
    },
    {
      name: "Parent",
      path: "/dashboards/parent-dashboard",
      accordion: true,
      items: [
        {
          name: "Parent Dashboard",
          path: "/dashboards/parent-dashboard",
        },
        {
          name: "Profile",
          path: "/dashboards/parent-profile",
        },
        {
          name: "Student Progress",
          path: "/dashboards/parent-student-progress",
        },
        {
          name: "Activity Tracker",
          path: "/dashboards/parent-activity-tracker",
        },
        {
          name: "Achievements",
          path: "/dashboards/parent-achievements",
        },
        {
          name: "Setting",
          path: "/dashboards/parent-settings",
        },
      ],
    },
    {
      name: "Brand",
      path: "/dashboards/brand-dashboard",
      accordion: true,
      items: [
        {
          name: "Brand Dashboard",
          path: "/dashboards/brand-dashboard",
        },
        {
          name: "Brand Profile",
          path: "/dashboards/brand-profile",
        },
        {
          name: "Events",
          path: "/dashboards/brand-events",
        },
        {
          name: "Certificates",
          path: "/dashboards/brand-certificates",
        },
        {
          name: "Settings",
          path: "/dashboards/brand-settings",
        },
      ],
    },
  ];
  return <MobileAccordion items={items} />;
};

export default AccordionDashboard;
