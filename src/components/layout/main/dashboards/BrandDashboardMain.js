"use client";

import CounterBrand from "@/components/sections/sub-section/dashboards/CounterBrand";
import ChartDashboard from "@/components/shared/dashboards/ChartDashboard";
import { useRouter } from "next/navigation";

const BrandDashboardMain = () => {
  const router = useRouter();

  return (
    <>
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-15px lg:gap-30px mb-30px">
        <div 
          onClick={() => router.push('/dashboards/brand-events')}
          className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
              Events
            </h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-600 dark:text-blue-400"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
          <p className="text-sm text-contentColor dark:text-contentColor-dark">
            Manage and propose events
          </p>
        </div>

        <div 
          onClick={() => router.push('/dashboards/brand-certificates')}
          className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-green-200 dark:border-green-800 cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
              Certificates
            </h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-600 dark:text-green-400"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
          <p className="text-sm text-contentColor dark:text-contentColor-dark">
            Design and issue certificates
          </p>
        </div>

        <div 
          onClick={() => router.push('/dashboards/brand-profile')}
          className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-purple-200 dark:border-purple-800 cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
              Profile
            </h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-purple-600 dark:text-purple-400"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
          <p className="text-sm text-contentColor dark:text-contentColor-dark">
            Update brand profile
          </p>
        </div>
      </div>

      {/* Statistics and Charts */}
      <CounterBrand />
      <ChartDashboard />
    </>
  );
};

export default BrandDashboardMain;
