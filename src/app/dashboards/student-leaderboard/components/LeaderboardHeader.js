// src/app/dashboards/student-leaderboard/components/LeaderboardHeader.js
import React from "react";

const LeaderboardHeader = () => {
  return (
    <div className="flex items-center justify-between px-6 pt-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white text-lg">
          👑
        </div>
        <div>
          <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">Leaderboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Compete with best learners
          </p>
        </div>
      </div>

      {/* Close Icon */}
      <button
        aria-label="Close"
        className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export default LeaderboardHeader;
