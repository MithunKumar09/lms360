"use client";
import React, { useMemo } from "react";
import Navitem from "./Navitem";
import DropdownPages from "./DropdownPages";
import DropdownCompany from "./DropdownCompany";
import DropdownCourses from "./DropdownCourses";
import DropdownWrapper from "@/components/shared/wrappers/DropdownWrapper";
import useAuthStore from "@/store/authStore";

/**
 * Get dashboard path based on user role
 * @param {string|null} role - User role
 * @returns {string} Dashboard path
 */
const getDashboardPath = (role) => {
  const roleDashboardMap = {
    superadmin: "/dashboards/superadmin-dashboard",
    admin: "/dashboards/admin-dashboard",
    vendor: "/dashboards/vendor-dashboard",
    instructor: "/dashboards/instructor-dashboard",
    student: "/dashboards/student-dashboard",
    alumni: "/dashboards/alumni-dashboard",
    parent: "/dashboards/parent-dashboard",
  };

  // Return dashboard path for the role, or default to login if not authenticated
  return role && roleDashboardMap[role] 
    ? roleDashboardMap[role] 
    : "/login";
};

const NavItems = () => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Get dashboard path based on user role
  const dashboardPath = useMemo(() => getDashboardPath(userRole), [userRole]);
  
  // Brand and parent roles should NOT see "Courses" navbar item
  const hideCourses = userRole === 'brand' || userRole === 'parent';

  const navItems = [
    {
      id: 1,
      name: "Home",
      path: "/",
      dropdown: null,
      isRelative: false,
      icon: "icofont-home",
    },
    {
      id: 2,
      name: "Resources",
      path: "/about",
      dropdown: <DropdownPages />,
      isRelative: false,
      icon: "icofont-briefcase",
    },
    {
      id: 3,
      name: "Company",
      path: "/about",
      dropdown: <DropdownCompany />,
      isRelative: false,
      icon: "icofont-building",
    },
    // Hide Courses for brand and parent roles
    ...(hideCourses ? [] : [{
      id: 4,
      name: "Courses",
      path: "/courses",
      dropdown: <DropdownCourses />,
      isRelative: false,
      icon: "icofont-book-alt",
    }]),
    {
      id: 5,
      name: "Dashboard",
      path: dashboardPath,
      dropdown: null, // Removed dropdown - direct link based on role
      isRelative: true,
      icon: "icofont-dashboard",
    },
  ];
  
  return (
    <div className="hidden lg:block lg:col-start-3 lg:col-span-7">
      <ul className="nav-list flex justify-center">
        {navItems.map((navItem, idx) => (
          <Navitem key={idx} idx={idx} navItem={{ ...navItem, idx: idx }}>
            {(navItem.id === 2 || navItem.id === 3 || navItem.id === 4) ? navItem.dropdown : <DropdownWrapper>{navItem.dropdown}</DropdownWrapper>}
          </Navitem>
        ))}
      </ul>
    </div>
  );
};

export default NavItems;
