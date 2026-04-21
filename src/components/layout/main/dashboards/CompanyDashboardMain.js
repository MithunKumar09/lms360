"use client";

import { useRouter } from "next/navigation";

const CompanyDashboardMain = () => {
  const router = useRouter();

  return (
    <>
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-15px lg:gap-30px mb-30px">
        <div 
          onClick={() => router.push('/dashboards/company-profile')}
          className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-lg transition-shadow"
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
              className="text-blue-600 dark:text-blue-400"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
          <p className="text-sm text-contentColor dark:text-contentColor-dark">
            Manage company profile and hiring needs
          </p>
        </div>

        <div 
          onClick={() => router.push('/dashboards/company-settings')}
          className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-green-200 dark:border-green-800 cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
              Settings
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
            Update account settings and preferences
          </p>
        </div>

        <div 
          onClick={() => router.push('/dashboards/company-virtual-internships')}
          className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-purple-200 dark:border-purple-800 cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
              Virtual Internships
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
              <path d="M16 20V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16" />
              <rect x="8" y="6" width="6" height="4" rx="1" />
              <path d="M6 20h12" />
            </svg>
          </div>
          <p className="text-sm text-contentColor dark:text-contentColor-dark">
            Create programs, tasks, and grade submissions
          </p>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px mb-30px">
        <h1 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-4">
          Welcome to Company Dashboard
        </h1>
        <p className="text-contentColor dark:text-contentColor-dark">
          Manage your recruitment activities, virtual internships, job postings, and talent pool access from here.
        </p>
      </div>
    </>
  );
};

export default CompanyDashboardMain;
