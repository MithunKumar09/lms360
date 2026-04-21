"use client";

import React from "react";
import DropdownItems from "./DropdownItems";
import { useAuthStore } from "@/store/index.js";

const DropdownPages = () => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const isVendor = userRole === 'vendor';
  const isSuperadmin = userRole === 'superadmin';
  const isBrand = userRole === 'brand';

  const lists = [
    {
      title: "Resources",
      items: [
        {
          name: "Events",
          status: null,
          path: "/events",
          icon: "icofont-calendar",
        },
        // Hide Workshops for brand role
        ...(isBrand ? [] : [{
          name: "Workshops",
          status: null,
          path: "/workshops",
          icon: "icofont-book-alt",
        }]),
        // Hide Jobs for vendors and brand role
        ...(isVendor || isBrand ? [] : [{
          name: "Jobs",
          status: null,
          path: "/jobs",
          icon: "icofont-briefcase",
        }]),
        // Hide Blogs for superadmin and vendor
        ...(isSuperadmin || isVendor ? [] : [{
          name: "Blogs",
          status: null,
          path: "/blogs",
          icon: "icofont-newspaper",
        }]),
        {
          name: "Feedback",
          status: null,
          path: "#",
          icon: "icofont-comment",
        },
      ],
    },
  ];
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 translate-y-10 invisible opacity-0 transition-all duration-300 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 z-medium">
      <div className="w-[640px] aspect-video shadow-dropdown px-30px py-30px rounded-standard bg-white dark:bg-whiteColor-dark overflow-y-auto" style={{ maxWidth: 'min(640px, calc(100vw - 2rem))' }}>
        <div className="grid grid-cols-1 gap-x-30px h-full">
          {lists?.map((list, idx) => (
            <DropdownItems key={idx} list={list} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DropdownPages;
