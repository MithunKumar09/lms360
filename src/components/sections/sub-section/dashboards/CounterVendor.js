"use client";

import { useVendorDashboardStatistics } from "@/hooks/api/useVendorStatistics";
import counter1 from "@/assets/images/counter/counter__1.png";
import counter2 from "@/assets/images/counter/counter__2.png";
import counter3 from "@/assets/images/counter/counter__3.png";
import counter4 from "@/assets/images/counter/counter__4.png";
import CounterDashboard from "@/components/shared/dashboards/CounterDashboard";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";

const CounterVendor = () => {
  const { data, isLoading, error } = useVendorDashboardStatistics();

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
  if (!stats || typeof stats !== 'object') {
    return null;
  }

  const counts = [
    {
      name: "Total Courses",
      image: counter1,
      data: typeof stats.courses?.total === 'number' ? stats.courses.total : 0,
      symbol: "",
    },
    {
      name: "Total Enrollments",
      image: counter2,
      data: typeof stats.courses?.enrollments?.total === 'number' ? stats.courses.enrollments.total : 0,
      symbol: "",
    },
    {
      name: "Active Enrollments",
      image: counter3,
      data: typeof stats.courses?.enrollments?.active === 'number' ? stats.courses.enrollments.active : 0,
      symbol: "",
    },
    {
      name: "Total Events",
      image: counter4,
      data: typeof stats.events?.total === 'number' ? stats.events.total : 0,
      symbol: "",
    },
    {
      name: "Total Workshops",
      image: counter1,
      data: typeof stats.workshops?.total === 'number' ? stats.workshops.total : 0,
      symbol: "",
    },
    {
      name: "Event Registrations",
      image: counter2,
      data: typeof stats.events?.registrations?.total === 'number' ? stats.events.registrations.total : 0,
      symbol: "",
    },
    {
      name: "Workshop Registrations",
      image: counter3,
      data: typeof stats.workshops?.registrations?.total === 'number' ? stats.workshops.registrations.total : 0,
      symbol: "",
    },
    {
      name: "Total Revenue",
      image: counter4,
      data: typeof stats.revenue?.total === 'number' ? Math.round(stats.revenue.total) : 0,
      symbol: "₹",
    },
  ];

  return (
    <CounterDashboard counts={counts}>
      <HeadingDashboard>Dashboard</HeadingDashboard>
    </CounterDashboard>
  );
};

export default CounterVendor;
