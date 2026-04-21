"use client";

import accordions from "@/libs/accordions";
import React from "react";
import MobileAccordion from "./MobileAccordion";
import Image from "next/image";
import megamenu2 from "@/assets/images/mega/mega_menu_2.png";
import { useAuthStore } from "@/store/index.js";

const AccordionPages = () => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const isVendor = userRole === 'vendor';
  const isSuperadmin = userRole === 'superadmin';
  const isBrand = userRole === 'brand';

  const resourcesItems = [
    {
      name: "Events",
      path: "/events",
      icon: "icofont-calendar",
    },
    // Hide Workshops for brand role
    ...(isBrand ? [] : [{
      name: "Workshops",
      path: "/workshops",
      icon: "icofont-book-alt",
    }]),
    // Hide Jobs for vendors and brand role
    ...(isVendor || isBrand ? [] : [{
      name: "Jobs",
      path: "/jobs",
      icon: "icofont-briefcase",
    }]),
    // Hide Blogs for superadmin and vendor
    ...(isSuperadmin || isVendor ? [] : [{
      name: "Blogs",
      path: "/blogs",
      icon: "icofont-newspaper",
    }]),
    {
      name: "Feedback",
      path: "#",
      icon: "icofont-comment",
    },
  ];
  const items = [
    {
      name: "Resources",
      path: "#",
      accordion: true,
      items: resourcesItems,
    },
  ];
  return (
    <MobileAccordion items={items}>
      {/* Mobile menu banner - removed as per user request */}
      {/* <a href="#" className="pl-15px pt-3 pb-7px">
        <Image className="w-full" src={megamenu2} alt="" placeholder="blur" />
      </a> */}
    </MobileAccordion>
  );
};

export default AccordionPages;
