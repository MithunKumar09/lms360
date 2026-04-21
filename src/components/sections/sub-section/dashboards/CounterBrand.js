"use client";

import { useBrandDashboardStatistics } from "@/hooks/api/useBrandStatistics";
import counter1 from "@/assets/images/counter/counter__1.png";
import counter2 from "@/assets/images/counter/counter__2.png";
import counter3 from "@/assets/images/counter/counter__3.png";
import CounterDashboard from "@/components/shared/dashboards/CounterDashboard";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";

const CounterBrand = () => {
  const { data, isLoading, error } = useBrandDashboardStatistics();

  if (isLoading) {
    return (
      <div>
        <HeadingDashboard>Dashboard</HeadingDashboard>
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
        <HeadingDashboard>Dashboard</HeadingDashboard>
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
      name: "Events Hosted",
      image: counter1,
      data: stats.events?.total || 0,
      symbol: "",
    },
    {
      name: "Certificates Issued",
      image: counter2,
      data: stats.certificates?.issued || 0,
      symbol: "",
    },
    {
      name: "Total Registrations",
      image: counter3,
      data: stats.events?.registrations?.total || 0,
      symbol: "",
    },
  ];

  return (
    <CounterDashboard counts={counts}>
      <HeadingDashboard>Dashboard</HeadingDashboard>
    </CounterDashboard>
  );
};

export default CounterBrand;
