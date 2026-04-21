// src/app/dashboards/student-leaderboard/components/LeaderboardSearch.js
import React from "react";

const LeaderboardSearch = () => {
  return (
    <div className="px-6 mt-5">
 <div className=" 
   flex items-center gap-2 
   border border-gray-200 dark:border-white/10 
   bg-white dark:bg-white/5 
   rounded-full px-4 py-2 
 ">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-400"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="text"
          placeholder="Search Learners"
          className="w-full outline-none text-sm bg-transparent text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>
    </div>
  );
};

export default LeaderboardSearch;
