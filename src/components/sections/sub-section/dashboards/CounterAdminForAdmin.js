"use client";

import { useMemo } from "react";
import counter1 from "@/assets/images/counter/counter__1.png";
import counter2 from "@/assets/images/counter/counter__2.png";
import counter3 from "@/assets/images/counter/counter__3.png";
import counter4 from "@/assets/images/counter/counter__4.png";
import CounterDashboard from "@/components/shared/dashboards/CounterDashboard";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import { useAdminDashboard } from "@/hooks/api/useAdminDashboard";
import LoadingSpinner from "@/components/shared/loading/LoadingSpinner";

const CounterAdminForAdmin = () => {
  const { data: statistics, isLoading, isError, error, refetch } = useAdminDashboard();

  // Build counts array from dashboard data
  const counts = useMemo(() => {
    if (!statistics) {
      // Return default/loading values
      return [
        {
          name: "Enrolled Courses",
          image: counter1,
          data: 0,
          symbol: "+",
        },
        {
          name: "Active Courses",
          image: counter2,
          data: 0,
          symbol: "+",
        },
        {
          name: "Complete Courses",
          image: counter3,
          data: 0,
          symbol: "+",
        },
        {
          name: "Total Courses",
          image: counter4,
          data: 0,
          symbol: "+",
        },
        {
          name: "Total Students",
          image: counter3,
          data: 0,
          symbol: "+",
        },
      ];
    }

    return [
      {
        name: "Enrolled Courses",
        image: counter1,
        data: statistics.enrolledCourses || 0,
        symbol: "+",
      },
      {
        name: "Active Courses",
        image: counter2,
        data: statistics.activeCourses || 0,
        symbol: "+",
      },
      {
        name: "Complete Courses",
        image: counter3,
        data: statistics.completeCourses || 0,
        symbol: "+",
      },
      {
        name: "Total Courses",
        image: counter4,
        data: statistics.totalCourses || 0,
        symbol: "+",
      },
      {
        name: "Total Students",
        image: counter3,
        data: statistics.totalStudents || 0,
        symbol: "+",
      },
    ];
  }, [statistics]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <HeadingDashboard>Dashboard</HeadingDashboard>
        <div className="flex flex-col items-center justify-center py-50px">
          <LoadingSpinner size="lg" color="blue" />
          <p className="text-sm text-contentColor dark:text-contentColor-dark mt-15px">
            Loading dashboard statistics...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <HeadingDashboard>Dashboard</HeadingDashboard>
        <div className="text-center py-50px text-contentColor dark:text-contentColor-dark">
          <div className="mb-15px">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-red-500 mx-auto mb-10px"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-500 mb-10px font-semibold">Failed to load dashboard data</p>
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-20px">
              {error?.message || 'Unknown error occurred. Please try again.'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor rounded transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <CounterDashboard counts={counts}>
      <HeadingDashboard>Dashboard</HeadingDashboard>
    </CounterDashboard>
  );
};

export default CounterAdminForAdmin;

