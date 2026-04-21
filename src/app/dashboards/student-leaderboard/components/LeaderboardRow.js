//src/app/dashboards/student-leaderboard/components/LeaderboardRow.js
import React from "react";

const LeaderboardRow = ({ rank, name, level, points, me }) => {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl mb-2 ${
        me ? "bg-gradient-to-r from-emerald-50 to-green-100 dark:from-emerald-500/10 dark:to-green-500/10" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`font-bold ${me ? "text-purple-600" : ""}`}>
          #{rank}
        </span>
        <div className="w-10 h-10 rounded-full bg-gray-300" />
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {me ? `(${name})` : name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">⚡ {level}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-green-500 dark:text-green-400 font-medium">
        ↗ {points}
      </div>
    </div>
  );
};

export default LeaderboardRow;
