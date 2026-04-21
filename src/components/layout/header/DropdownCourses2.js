"use client";

import React, { useMemo } from "react";
import DropdownPrimary from "./DropdownPrimary";
import { useAuthStore } from "@/store/index.js";

const DropdownCourses2 = () => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Roles that should NOT see "Become An Instructor"
  const hideForRoles = ['admin', 'superadmin', 'orgparent', 'orginstructor', 'instructor', 'parent'];
  const shouldShowBecomeInstructor = !hideForRoles.includes(userRole);

  // Roles that can see "Create Course"
  const allowedRoles = ['superadmin', 'admin', 'instructor'];
  const canCreateCourse = allowedRoles.includes(userRole);

  const items = useMemo(() => {
    const allItems = [
      {
        name: "All Courses",
        status: null,
        path: "/courses",
        type: "secondary",
      },
     {
        name: "Courses",
        status: null,
        path: "/dashboards/unified-courses",
        type: "secondary",
      },
      {
        name: "Course Categories",
        status: null,
        path: "/course-categories",
        type: "secondary",
      },
      {
        name: "Create Course",
        status: null,
        path: "/dashboards/create-course",
        type: "secondary",
      },
      {
        name: "Become An Instructor",
        status: null,
        path: "/dashboards/become-an-instructor",
        type: "secondary",
      },
      {
        name: "Instructor",
        status: null,
        path: "/instructors",
        type: "secondary",
      },
    ];

    // Filter items based on role permissions
    let filteredItems = allItems;
    
    // Filter out "Become An Instructor" for restricted roles
    if (!shouldShowBecomeInstructor) {
      filteredItems = filteredItems.filter((item) => item.name !== "Become An Instructor");
    }
    
    // Filter out "Create Course" for non-allowed roles
    if (!canCreateCourse) {
      filteredItems = filteredItems.filter((item) => item.name !== "Create Course");
    }

    return filteredItems;
  }, [shouldShowBecomeInstructor, canCreateCourse]);

  return <DropdownPrimary items={items} />;
};

export default DropdownCourses2;
