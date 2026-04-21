//src/components/sections/sub-section/dashboards/CounterStudent.js
"use client";
import { useMemo } from "react";
import counter1 from "@/assets/images/counter/counter__1.png";
import counter2 from "@/assets/images/counter/counter__2.png";
import counter3 from "@/assets/images/counter/counter__3.png";
import CounterDashboard from "@/components/shared/dashboards/CounterDashboard";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import { useStudentDashboardStats } from "@/hooks/api/useStudentDashboardStats";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";

const CounterStudent = () => {
  const { data: stats, isLoading, error } = useStudentDashboardStats();

  const counts = useMemo(() => {
    if (!stats) {
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
        },
      ];
    }

    return [
      {
        name: "Enrolled Courses",
        image: counter1,
        data: stats.enrolledCount || 0,
        symbol: stats.enrolledCount > 0 ? "+" : "",
      },
      {
        name: "Active Courses",
        image: counter2,
        data: stats.activeCount || 0,
        symbol: stats.activeCount > 0 ? "+" : "",
      },
      {
        name: "Complete Courses",
        image: counter3,
        data: stats.completedCount || 0,
      },
    ];
  }, [stats]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <SkeletonLoader type="text" className="h-8 w-32 mb-6" />
        <div className="counter grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-x-30px gap-y-5 pb-5">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="p-5 md:px-10 md:py-50px bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg2 shadow-accordion-dark"
            >
              <div className="flex gap-4">
                <SkeletonLoader type="card" className="h-16 w-16 rounded" />
                <div className="flex-1">
                  <SkeletonLoader type="text" className="h-8 w-20 mb-2" />
                  <SkeletonLoader type="text" className="h-4 w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state - show with zero counts
  if (error) {
    console.error("Error loading dashboard stats:", error);
  }

  return (
    <CounterDashboard counts={counts}>
      <HeadingDashboard>Summery</HeadingDashboard>
    </CounterDashboard>
  );
};

export default CounterStudent;
