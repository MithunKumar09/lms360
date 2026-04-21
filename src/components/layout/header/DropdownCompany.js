"use client";

import React, { useMemo } from "react";
import DropdownItems from "./DropdownItems";
import { useAuthStore } from "@/store/index.js";

const DropdownCompany = () => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Roles that should NOT see "Become An Instructor"
  const hideForRoles = ['admin', 'superadmin', 'orgparent', 'orginstructor', 'instructor', 'brand', 'parent'];
  const shouldShowBecomeInstructor = !hideForRoles.includes(userRole);

  // Roles that should NOT see "Instructor" link
  const hideInstructorLink = ['mentor', 'vendor', 'brand'].includes(userRole);
  
  // Brand role should NOT see "Brands" nested dropdown
  const isBrand = userRole === 'brand';

  const lists = useMemo(() => {
    const allItems = [
      {
        name: "About Us",
        status: null,
        path: "/about",
        icon: "icofont-info-circle",
      },
      {
        name: "Contact Us",
        status: null,
        path: "#",
        icon: "icofont-envelope",
      },
      {
        name: "Instructor",
        status: null,
        path: "/instructors",
        icon: "icofont-teacher",
      },
      {
        name: "Become An Instructor",
        status: null,
        path: "/dashboards/become-an-instructor",
        icon: "icofont-graduate",
      },
      {
        name: "Brands",
        status: null,
        path: "#",
        icon: "icofont-building",
        dropdown: [
          {
            name: "Brand Events",
            status: null,
            path: "/brands/events",
            icon: "icofont-calendar",
          },
          {
            name: "Brand Workshops",
            status: null,
            path: "/brands/workshops",
            icon: "icofont-book",
          },
        ],
      },
    ];

    // Filter out items for brand role: "Instructor", "Become An Instructor", and "Brands"
    // Filter out "Become An Instructor" for restricted roles
    // Filter out "Instructor" link for mentor, vendor, and brand roles
    let filteredItems = shouldShowBecomeInstructor
      ? allItems.filter((item) => !(hideInstructorLink && item.name === "Instructor"))
      : allItems.filter((item) => 
          item.name !== "Become An Instructor" && 
          !(hideInstructorLink && item.name === "Instructor")
        );
    
    // Remove "Brands" nested dropdown for brand role
    if (isBrand) {
      filteredItems = filteredItems.filter((item) => item.name !== "Brands");
    }

    return [
      {
        title: "Company",
        items: filteredItems,
      },
    ];
  }, [shouldShowBecomeInstructor, hideInstructorLink, isBrand]);
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 translate-y-10 invisible opacity-0 transition-all duration-300 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 z-medium">
      <div className="w-[640px] aspect-video shadow-dropdown px-30px py-30px rounded-standard bg-white dark:bg-whiteColor-dark overflow-visible" style={{ maxWidth: 'min(640px, calc(100vw - 2rem))' }}>
        <div className="grid grid-cols-1 gap-x-30px h-full">
          {lists?.map((list, idx) => (
            <DropdownItems key={idx} list={list} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DropdownCompany;

