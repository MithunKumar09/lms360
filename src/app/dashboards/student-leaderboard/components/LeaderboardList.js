//src/app/dashboards/student-leaderboard/components/LeaderboardList.js
import React from "react";
import LeaderboardRow from "./LeaderboardRow";

const users = [
  { rank: 4, name: "Ragu Naik", level: "Level 22 Perfectionist", points: "4,850" },
  { rank: 5, name: "Shilpa Kumari", level: "Level 21 Perfectionist", points: "4,570" },
  { rank: 24, name: "Rahul Ramaki", level: "Level 8 Achiever", points: "2,450", me: true },
];

const LeaderboardList = () => {
  return (
    <div className="mt-6 max-h-[380px] overflow-y-auto px-4 pb-6 rounded-xl bg-white/80 dark:bg-white/5">
      {users.map((user) => (
        <LeaderboardRow key={user.rank} {...user} />
      ))}
    </div>
  );
};

export default LeaderboardList;
