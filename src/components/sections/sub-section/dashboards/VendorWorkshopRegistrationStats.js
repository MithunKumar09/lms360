"use client";

import { useVendorWorkshopStatistics } from "@/hooks/api/useVendorWorkshops";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";

const VendorWorkshopRegistrationStats = ({ workshopId }) => {
  const { data, isLoading, error } = useVendorWorkshopStatistics(workshopId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-15px mb-30px">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
            <SkeletonLoader count={2} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-5 p-20px mb-30px">
        <p className="text-red-600 dark:text-red-400">
          {error?.message || "Failed to load statistics"}
        </p>
      </div>
    );
  }

  const stats = data?.statistics;
  if (!stats) {
    return null;
  }

  const statCards = [
    {
      title: "Total Registrations",
      value: stats.registrations.total,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Confirmed",
      value: stats.registrations.confirmed,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      ),
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "Slots Booked",
      value: `${stats.slots.booked}${stats.slots.total ? ` / ${stats.slots.total}` : ""}`,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      ),
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      subtitle: stats.slots.available !== null ? `${stats.slots.available} available` : "Unlimited",
    },
    {
      title: "Total Revenue",
      value: stats.workshop.isFree ? "Free Workshop" : `₹${stats.payments.totalRevenue.toFixed(2)}`,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ),
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      subtitle: stats.payments.paid > 0 ? `${stats.payments.paid} paid` : null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-15px mb-30px">
      {statCards.map((card, index) => (
        <div
          key={index}
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px"
        >
          <div className="flex items-center justify-between mb-15px">
            <div className={`w-48px h-48px rounded-full ${card.bgColor} flex items-center justify-center ${card.color}`}>
              {card.icon}
            </div>
          </div>
          <div>
            <p className="text-14px text-contentColor dark:text-contentColor-dark mb-5px">
              {card.title}
            </p>
            <p className="text-24px font-bold text-blackColor dark:text-blackColor-dark">
              {card.value}
            </p>
            {card.subtitle && (
              <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
                {card.subtitle}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VendorWorkshopRegistrationStats;
