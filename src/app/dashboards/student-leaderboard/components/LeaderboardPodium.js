//src/app/dashboards/student-leaderboard/components/LeaderboardPodium.js
import React from "react";

const podium = [
  {
    rank: 2,
    name: "Laxmi Patil",
    points: "5,250",
    gradient: "from-purple-400 to-indigo-500",
  },
  {
    rank: 1,
    name: "Chandan K",
    points: "5,050",
    gradient: "from-amber-400 to-yellow-500",
  },
  {
    rank: 3,
    name: "Omkar B",
    points: "4,950",
    gradient: "from-emerald-400 to-green-500",
  },
];

const LeaderboardPodium = () => {
  return (
    <div className="flex items-end justify-center gap-4 mt-8">
      {podium.map((user) => (
        <div key={user.rank} className="text-center">
          <div className="mb-2">
            <div className="w-14 h-14 rounded-full bg-gray-200 mx-auto" />
          </div>
          <div
            className={`w-20 rounded-xl py-4 text-white bg-gradient-to-b ${user.gradient}`}
          >
            <div className="text-xl font-bold">{user.rank}</div>
            <div className="text-xs mt-1">🏆</div>
          </div>
          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ({user.points} points)
          </p>
        </div>
      ))}
    </div>
  );
};

export default LeaderboardPodium;
