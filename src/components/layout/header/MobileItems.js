"use client";

import React from "react";
import AccordionContainer from "@/components/shared/containers/AccordionContainer";
import MobileMenuItem from "./MobileItem";
import AccordionPages from "./AccordionPages";
import AccordionCompany from "./AccordionCompany";
import AccordionCourses from "./AccordionCourses";
import AccordionDashboard from "./AccordionDashboard";
import { useAuthStore } from "@/store/index.js";

const MobileMenuItems = () => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;
  
  // Brand and parent roles should NOT see "Courses" navbar item
  const hideCourses = userRole === 'brand' || userRole === 'parent';

  const items = [
    {
      id: 1,
      name: "Home",
      path: "/",
      accordion: null,
      children: null,
      icon: "icofont-home",
    },
    {
      id: 2,
      name: "Resources",
      path: "/about",
      accordion: "accordion",
      children: <AccordionPages />,
      icon: "icofont-briefcase",
    },
    {
      id: 3,
      name: "Company",
      path: "/about",
      accordion: "accordion",
      children: <AccordionCompany />,
      icon: "icofont-building",
    },
    // Hide Courses for brand and parent roles
    ...(hideCourses ? [] : [{
      id: 4,
      name: "Courses",
      path: "/courses",
      accordion: "accordion",
      children: <AccordionCourses />,
      icon: "icofont-book-alt",
    }]),
    {
      id: 5,
      name: "Dashboard",
      path: "/dashboards/instructor-dashboard",
      accordion: "accordion",
      children: <AccordionDashboard />,
      icon: "icofont-dashboard",
    },
  ];

  return (
    <div className="pt-8 pb-6 border-b border-borderColor dark:border-borderColor-dark">
      <AccordionContainer>
        {items.map((item, idx) => (
          <MobileMenuItem key={idx} item={item} />
        ))}
      </AccordionContainer>
    </div>
  );
};

export default MobileMenuItems;
