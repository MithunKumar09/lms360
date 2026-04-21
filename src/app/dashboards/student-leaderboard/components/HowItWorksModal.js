"use client";
import React from "react";

/* ---------------------------------------------------
   LEVEL → THEME MAPPING
--------------------------------------------------- */
const levelThemeMap = {
  achiever: {
    primary: "from-purple-500 to-indigo-600",
    text: "text-purple-600",
  },
  perfectionist: {
    primary: "from-emerald-500 to-green-600",
    text: "text-emerald-600",
  },
  beginner: {
    primary: "from-blue-500 to-sky-600",
    text: "text-blue-600",
  },
  master: {
    primary: "from-amber-400 to-yellow-500",
    text: "text-amber-600",
  },
};

// 🔹 Demo user level (later comes from backend / context)
const userLevelType = "achiever";
const theme = levelThemeMap[userLevelType];

const HowItWorksModal = ({ onClose }) => {
  return (
<div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-6">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[420px] bg-white dark:bg-[#020617] text-gray-900 dark:text-gray-200 rounded-2xl p-5 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">How Leaderboard Works</h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm text-gray-600 dark:text-gray-500">

          {/* POINTS */}
          <InfoRow
            illustration={<PointsIllustration theme={theme} />}
            title="Points"
            description="Earned by completing courses, lessons, quizzes, and daily learning activities."
          />

          {/* STREAK */}
          <InfoRow
            illustration={<StreakIllustration theme={theme} />}
            title="Streak"
            description="Increases when you learn consistently every day. Missing a day resets it."
          />

          {/* RANK */}
          <InfoRow
            illustration={<RankIllustration theme={theme} />}
            title="Rank"
            description="Calculated based on your total points and activity compared with other learners."
          />
        </div>

        {/* Footer */}
        <div className="mt-6">
          <button
            onClick={onClose}
            className={`w-full bg-gradient-to-r ${theme.primary} text-white py-2 rounded-full font-medium hover:opacity-90 transition`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksModal;

/* ---------------------------------------------------
   RESPONSIVE INFO ROW
--------------------------------------------------- */
const InfoRow = ({ illustration, title, description }) => (
  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
    {illustration}
    <p>
      <b>{title}</b> {description}
    </p>
  </div>
);

/* ---------------------------------------------------
   SVG ILLUSTRATIONS (HOVER ANIMATED)
--------------------------------------------------- */

const AnimatedWrapper = ({ children }) => (
  <div className="w-10 h-10 flex-shrink-0 transform transition-all duration-300 hover:scale-110 hover:rotate-3 hover:drop-shadow-lg">
    {children}
  </div>
);

const PointsIllustration = ({ theme }) => (
  <AnimatedWrapper>
    <svg viewBox="0 0 40 40">
      <defs>
        <linearGradient id="diamondGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <polygon points="20,3 35,20 20,37 5,20" fill="url(#diamondGrad)" />
      <polygon points="20,8 30,20 20,32 10,20" fill="white" opacity="0.25" />
    </svg>
  </AnimatedWrapper>
);

const StreakIllustration = ({ theme }) => (
  <AnimatedWrapper>
    <svg viewBox="0 0 40 40">
      <defs>
        <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <path
        d="M20 4 C14 12 26 14 16 26 C10 34 20 38 20 38 C20 38 30 34 26 24 C24 18 28 14 24 8 Z"
        fill="url(#fireGrad)"
      />
    </svg>
  </AnimatedWrapper>
);

const RankIllustration = ({ theme }) => (
  <AnimatedWrapper>
    <svg viewBox="0 0 40 40">
      <defs>
        <linearGradient id="crownGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <path
        d="M5 30 L8 14 L15 20 L20 10 L25 20 L32 14 L35 30 Z"
        fill="url(#crownGrad)"
      />
      <rect x="5" y="30" width="30" height="4" fill="#D97706" />
    </svg>
  </AnimatedWrapper>
);
