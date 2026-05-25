"use client";

import React, { useMemo } from "react";
import DropdownItems from "./DropdownItems";
// import Image from "next/image";
// import megaMenu1 from "@/assets/images/mega/mega_menu_1.png";
import { useAuthStore } from "@/store/index.js";

const DropdownCourses = () => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Roles that can see "Create Course"
  const allowedRoles = ['superadmin', 'admin', 'instructor'];
  const canCreateCourse = allowedRoles.includes(userRole);

  const lists = useMemo(() => {
    const allItems = [
      {
        name: "All Courses",
        status: null,
        path: "/courses",
        icon: "icofont-list",
      },
      {
        name: "Courses",
        status: null,
        path: "/dashboards/unified-courses",
        icon: "icofont-list",
      },
      {
        name: "Course Categories",
        status: null,
        path: "/course-categories",
        icon: "icofont-folder",
      },
      {
        name: "Create Course",
        status: null,
        path: "/dashboards/create-course",
        icon: "icofont-plus-circle",
      },
    ];

    // Filter out "Create Course" for non-allowed roles
    const filteredItems = canCreateCourse
      ? allItems
      : allItems.filter((item) => item.name !== "Create Course");

    return [
      {
        title: "Courses",
        items: filteredItems,
      },
    ];
  }, [canCreateCourse]);
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 translate-y-10 invisible opacity-0 transition-all duration-300 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 z-medium">
      <div className="w-[640px] aspect-video shadow-dropdown px-30px py-30px rounded-standard bg-white dark:bg-whiteColor-dark overflow-hidden" style={{ maxWidth: 'min(640px, calc(100vw - 2rem))' }}>
        <div className="grid grid-cols-1 h-full">
          {lists?.map((list, idx) => (
            <DropdownItems key={idx} list={list} />
          ))}

          {/* dropdown banner */}
          {/* <div className="h-full">
            <Image
              prioriy="false"
              placeholder="blur"
              src={megaMenu1}
              alt="Mega Menu"
              className="w-full h-full object-cover rounded-standard"
            />
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default DropdownCourses;
