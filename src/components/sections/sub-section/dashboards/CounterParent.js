"use client";

import { useParentDashboardStatistics } from "@/hooks/api/useParent";
import counter1 from "@/assets/images/counter/counter__1.png";
import counter2 from "@/assets/images/counter/counter__2.png";
import counter3 from "@/assets/images/counter/counter__3.png";
import counter4 from "@/assets/images/counter/counter__4.png";
import CounterDashboard from "@/components/shared/dashboards/CounterDashboard";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";

const CounterParent = () => {
  const { data, isLoading, error } = useParentDashboardStatistics();

  if (isLoading) {
    return (
      <div>
        <HeadingDashboard>Summary</HeadingDashboard>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-15px mt-30px">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
              <SkeletonLoader count={2} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <HeadingDashboard>Summary</HeadingDashboard>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-5 p-20px mt-30px">
          <p className="text-red-600 dark:text-red-400">
            {error?.message || "Failed to load dashboard statistics"}
          </p>
        </div>
      </div>
    );
  }

  const stats = data?.statistics;
  if (!stats) {
    return null;
  }

  const counts = [
    {
      name: "Linked Children",
      image: counter1,
      data: stats.linkedChildren || 0,
      symbol: "",
    },
    {
      name: "Active Enrollments",
      image: counter2,
      data: stats.activeEnrollments || 0,
      symbol: "",
    },
    {
      name: "Completed Courses",
      image: counter3,
      data: stats.completedCourses || 0,
      symbol: "",
    },
    {
      name: "Achievements Earned",
      image: counter4,
      data: stats.achievementsEarned || 0,
      symbol: "",
    },
  ];

  return (
    <CounterDashboard counts={counts}>
      <HeadingDashboard>Summary</HeadingDashboard>
    </CounterDashboard>
  );
};

export default CounterParent;
