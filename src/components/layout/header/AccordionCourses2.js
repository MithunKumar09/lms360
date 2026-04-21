"use client";

import React, { useMemo } from "react";
import MobileAccordion from "./MobileAccordion";
import { useAuthStore } from "@/store/index.js";

const AccordionCourses2 = () => {
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
        path: "/courses",
      },
                  {
        name: "Courses",
        path: "/dashboards/unified-courses",
      },
      {
        name: "Course Categories",
        path: "/course-categories",
      },
      {
        name: "Create Course",
        path: "/dashboards/create-course",
      },
      {
        name: "Become An Instructor",
        path: "/dashboards/become-an-instructor",
      },
      {
        name: "Instructor",
        path: "/instructors",
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

  return <MobileAccordion items={items} />;
};

export default AccordionCourses2;
