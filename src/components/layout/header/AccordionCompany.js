"use client";

import React, { useMemo } from "react";
import MobileAccordion from "./MobileAccordion";
import { useAuthStore } from "@/store/index.js";

const AccordionCompany = () => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Roles that should NOT see "Become An Instructor"
  const hideForRoles = ['admin', 'superadmin', 'orgparent', 'orginstructor', 'instructor', 'brand', 'parent'];
  const shouldShowBecomeInstructor = !hideForRoles.includes(userRole);

  // Roles that should NOT see "Instructor" link
  const hideInstructorLink = ['mentor', 'vendor', 'brand'].includes(userRole);
  
  // Brand role should NOT see "Brands" nested accordion
  const isBrand = userRole === 'brand';

  const items = useMemo(() => {
    const allSubItems = [
      {
        name: "About Us",
        status: null,
        path: "/about",
      },
      {
        name: "Contact Us",
        status: null,
        path: "#",
      },
      {
        name: "Instructor",
        status: null,
        path: "/instructors",
      },
      {
        name: "Become An Instructor",
        status: null,
        path: "/dashboards/become-an-instructor",
      },
      {
        name: "Brands",
        status: null,
        path: "#",
        accordion: true,
        items: [
          {
            name: "Brand Events",
            status: null,
            path: "/brands/events",
          },
          {
            name: "Brand Workshops",
            status: null,
            path: "/brands/workshops",
          },
        ],
      },
    ];

    // Filter out items for brand role: "Instructor", "Become An Instructor", and "Brands"
    // Filter out "Become An Instructor" for restricted roles
    // Filter out "Instructor" link for mentor, vendor, and brand roles
    let filteredSubItems = shouldShowBecomeInstructor
      ? allSubItems.filter((item) => !(hideInstructorLink && item.name === "Instructor"))
      : allSubItems.filter((item) => 
          item.name !== "Become An Instructor" && 
          !(hideInstructorLink && item.name === "Instructor")
        );
    
    // Remove "Brands" nested accordion for brand role
    if (isBrand) {
      filteredSubItems = filteredSubItems.filter((item) => item.name !== "Brands");
    }

    return [
      {
        name: "Company",
        path: "#",
        accordion: true,
        items: filteredSubItems,
      },
    ];
  }, [shouldShowBecomeInstructor, hideInstructorLink, isBrand]);

  return <MobileAccordion items={items} />;
};

export default AccordionCompany;

