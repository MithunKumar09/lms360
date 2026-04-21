//src/components/modals/StudentStreaks.js
"use client";
import React from "react";
import { useStudentStreak } from "@/hooks/api/useStudentStreak.js";

/* ---------------- HELPERS ---------------- */

const getDaysInMonth = (year, month) =>
  new Date(year, month + 1, 0).getDate();

const getFirstDayOfMonth = (year, month) =>
  new Date(year, month, 1).getDay();

/* ---------------- ACHIEVEMENT MILESTONES (STATIC) ---------------- */

const getAchievementMilestones = (highestStreak) => [
  { label: "10 Days", icon: "🔥", active: highestStreak >= 10, tip: "Unlocked at 10 days streak" },
  { label: "20 Days", icon: "⚡", active: highestStreak >= 20, tip: "Unlocks at 20 days" },
  { label: "30 Days", icon: "💎", active: highestStreak >= 30, tip: "Unlocks at 30 days" },
  { label: "50 Days", icon: "👑", active: highestStreak >= 50, tip: "Unlocks at 50 days" },
  { label: "100 Days", icon: "⭐", active: highestStreak >= 100, tip: "Unlocks at 100 days" },
];

/* ---------------- MAIN COMPONENT ---------------- */

const StudentStreaks = ({ open, onClose }) => {
  // Fetch real streak data
  const { data: streakData, isLoading: isLoadingStreak } = useStudentStreak({
    enabled: open, // Only fetch when modal is open
  });

  const today = new Date();
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth());
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = React.useState(null);

  if (!open) return null;

  // Determine calendar data for the currently selected month
  // If no streakData yet, use empty calendar
  const currentStreak = streakData?.currentStreak ?? 0;
  const highestStreak = streakData?.highestStreak ?? 0;
  const consistency = streakData?.consistency ?? 0;
  const achievements = getAchievementMilestones(highestStreak);

  // Build calendar for the currently selected month
  // Use API calendar data if it matches current month, otherwise compute locally
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const monthLabel = new Date(currentYear, currentMonth).toLocaleString(
    "default",
    { month: "long", year: "numeric" }
  );

  const prevMonth = () => {
    setSelectedDay(null);
    setCurrentMonth((m) => (m === 0 ? 11 : m - 1));
    if (currentMonth === 0) setCurrentYear((y) => y - 1);
  };

  const nextMonth = () => {
    setSelectedDay(null);
    setCurrentMonth((m) => (m === 11 ? 0 : m + 1));
    if (currentMonth === 11) setCurrentYear((y) => y + 1);
  };

  // Build calendar status for the selected month using API calendar data
  // API calendar is for the current month, so only use it if we're viewing current month
  const calendarStatusMap = new Map();
  if (streakData?.calendar && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
    // Use API calendar data for current month
    streakData.calendar.forEach(item => {
      calendarStatusMap.set(item.date, item.status);
    });
  }

  const getDayStatus = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarStatusMap.get(dateStr) || 'unknown';
  };

  const FireIconBox = () => (
  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 via-red-500 to-orange-400 shadow-md">
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C12 2 7 7 7 11.5C7 15.0899 9.91015 18 13.5 18C17.0899 18 20 15.0899 20 11.5C20 8 16 5 16 5C16 5 16.5 8 14.5 9.5C13 10.6 12 9 12 7C12 4.5 12 2 12 2Z"
        fill="white"
      />
    </svg>
  </div>
);


  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full sm:max-w-5xl h-[92vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0E0E12] shadow-2xl"
        style={{
    scrollbarWidth: "none",      // Firefox
    msOverflowStyle: "none",     // IE / Edge legacy
  }}
      >

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="sticky top-0 z-10 ml-auto block px-6 py-4 text-2xl text-gray-400 hover:text-gray-700 dark:hover:text-white"
        >
          ×
        </button>

        {/* HEADER */}
        <div className="px-5 sm:px-10 pb-6">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
<div className="flex items-start gap-4">
  <FireIconBox />

  <div>
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
      Streak History
    </h2>

    <span className="inline-flex mt-2 items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-4 py-1 text-sm text-red-600 dark:text-red-400">
      🔥 Fire Level
    </span>
  </div>
</div>


            {/* ACHIEVEMENTS */}
            <div className="flex gap-3 flex-wrap">
              {achievements.map((a, i) => (
                <Tooltip key={i} text={a.tip}>
                  <div
                    className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex flex-col items-center justify-center gap-1 text-[11px] font-medium
                      ${
                        a.active
                          ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }`}
                  >
                    <span className="text-lg">{a.icon}</span>
                    <span>{a.label}</span>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="px-5 sm:px-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <StatCard title="Current Streak" value={isLoadingStreak ? 0 : currentStreak} color="orange" isLoading={isLoadingStreak} />
          <StatCard title="Highest Streak" value={isLoadingStreak ? 0 : highestStreak} color="purple" isLoading={isLoadingStreak} />
          <StatCard title="Consistency" value={isLoadingStreak ? 0 : consistency} suffix="%" color="green" isLoading={isLoadingStreak} />
        </div>

        {/* CALENDAR */}
        <div className="px-5 sm:px-10 mt-8 sm:mt-10">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="text-xl px-2 text-gray-400">‹</button>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
              {monthLabel}
            </h3>
            <button onClick={nextMonth} className="text-xl px-2 text-gray-400">›</button>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-4 text-center text-[10px] sm:text-xs">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
              <div key={d} className="font-medium text-gray-500">{d}</div>
            ))}

            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const status = getDayStatus(day);
              const isSelected = selectedDay === day;

              return (
                <Tooltip
                  key={day}
                  text={
                    status === "done"
                      ? "Completed"
                      : status === "missed"
                      ? "Missed"
                      : "No data"
                  }
                >
                  <div
                    onClick={() => setSelectedDay(day)}
                    className="flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <div
                      className={`h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-full transition
                        ${
                          status === "done"
                            ? "bg-green-500 text-white"
                            : status === "missed"
                            ? "border border-red-400 text-red-500"
                            : "border border-dashed text-gray-400"
                        }
                        ${isSelected ? "scale-110 ring-2 ring-purple-400" : ""}
                      `}
                    >
                      {status === "done" ? "✓" : status === "missed" ? "×" : "?"}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-gray-500">
                      {day}
                    </span>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 sm:px-10 py-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            🔔 <span className="font-semibold">Quote of the Day:</span>{" "}
            Consistency like this separates learners who finish from those who quit halfway.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ---------------- STAT CARD (with loading state) ---------------- */

const StatCard = ({ title, value, suffix = "", color, isLoading = false }) => {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (isLoading) {
      setCount(0);
      return;
    }

    let startTime = performance.now();
    const duration = 700;

    const animate = (t) => {
      const p = Math.min((t - startTime) / duration, 1);
      setCount(Math.floor(p * value));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, isLoading]);

  const styles = {
    orange: {
      text: "text-orange-600",
      bg: "bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20",
      icon: "🔥",
    },
    purple: {
      text: "text-purple-600",
      bg: "bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20",
      icon: "🔥",
    },
    green: {
      text: "text-green-600",
      bg: "bg-gradient-to-br from-green-50 to-white dark:from-green-900/20",
      icon: "📈",
    },
  };

  const s = styles[color];

  return (
    <div className={`rounded-2xl border px-6 py-6 text-center ${s.bg}`}>
      <div className={`text-xl mb-2 ${s.text}`}>{s.icon}</div>
      <div className={`text-2xl font-bold ${s.text}`}>
        {isLoading ? "..." : `${count}${suffix}`}
      </div>
      <div className="text-sm mt-1 text-gray-600 dark:text-gray-400">
        {title}
      </div>
    </div>
  );
};

/* ---------------- TOOLTIP (unchanged) ---------------- */

const Tooltip = ({ text, children }) => (
  <div className="relative group">
    {children}
    <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max -translate-x-1/2 scale-95 opacity-0 transition group-hover:scale-100 group-hover:opacity-100">
      <div className="rounded-md bg-gray-900 px-3 py-1 text-xs text-white shadow">
        {text}
      </div>
    </div>
  </div>
);

export default StudentStreaks;
