"use client";

import accordions from "@/libs/accordions";
import React, { useMemo } from "react";
import MobileAccordion from "./MobileAccordion";
import Image from "next/image";
import megamenu2 from "@/assets/images/mega/mega_menu_1.png";
import { useAuthStore } from "@/store/index.js";

const AccordionCourses = () => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Roles that can see "Create Course"
  const allowedRoles = ['superadmin', 'admin', 'instructor'];
  const canCreateCourse = allowedRoles.includes(userRole);

  const items = useMemo(() => {
    const allItems = [
      {
        name: "All Courses",
        status: null,
        path: "/courses",
      },
            {
        name: "Courses",
        status: null,
        path: "/dashboards/unified-courses",
      },
      {
        name: "Course Categories",
        status: null,
        path: "/course-categories",
      },
      {
        name: "Create Course",
        status: null,
        path: "/dashboards/create-course",
      },
    ];

    // Filter out "Create Course" for non-allowed roles
    const filteredItems = canCreateCourse
      ? allItems
      : allItems.filter((item) => item.name !== "Create Course");

    return [
      {
        name: "Courses",
        path: "#",
        accordion: true,
        items: filteredItems,
      },
    ];
  }, [canCreateCourse]);
  return (
    <MobileAccordion items={items}>
      <a href="#" className="pl-15px pt-3 pb-7px">
        <Image className="w-full" src={megamenu2} alt="" placeholder="blur" />
      </a>
    </MobileAccordion>
  );
};

export default AccordionCourses;
