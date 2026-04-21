//src/app/dashboards/student-leaderboard/components/LeaderboardTabs.js
import React from "react";

const tabs = [
  { label: "🌍 Global", active: true },
  { label: "👥 Friends" },
  { label: "📅 This Month" },
];

const LeaderboardTabs = ({ onHowItWorks }) => {
  return (
    <div className="px-6 mt-4">
      <div className="flex gap-2">
        {tabs.map((tab, i) => (
          <button
            key={i}
            className={`flex-1 py-2 rounded-full text-sm font-medium ${
              tab.active
                ? "bg-white dark:bg-white/10 shadow text-gray-900 dark:text-gray-100"
                : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* See how it works */}
      <div className="text-right mt-2">
        <button
          onClick={onHowItWorks}
          className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 justify-end"
        >
          See how it works
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default LeaderboardTabs;
