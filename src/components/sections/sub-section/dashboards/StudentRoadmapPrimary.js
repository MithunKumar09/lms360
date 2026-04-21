//src/components/sections/sub-section/dashboards/StudentRoadmapPrimary.js
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRoadmap } from "@/hooks/api/useRoadmap";
import { useMilestoneCompletion } from "@/hooks/api/useMilestoneCompletion";
import { useMilestoneCelebration } from "@/hooks/useMilestoneCelebration";
import { useAuthStore } from "@/store/index.js";

import RoadmapCourseCard from "@/components/shared/roadmap/RoadmapCourseCard";
import MilestoneCelebrationManager from "@/components/shared/roadmap/MilestoneCelebrationManager";
import CourseCardSkeleton from "@/components/shared/courses/CourseCardSkeleton";
import NoData from "@/components/shared/others/NoData";

/* ---------------------------------------------
   CONSTANTS
--------------------------------------------- */
const YEAR_TABS = [
  { label: "Full Journey", value: "all" },
  { label: "1st Year", value: 1 },
  { label: "2nd Year", value: 2 },
  { label: "3rd Year", value: 3 },
  { label: "4th Year", value: 4 },
];

const getProgressLabel = (progress = 0) => {
  if (progress < 25) return "Just getting started";
  if (progress < 50) return "Making progress";
  if (progress < 75) return "Almost there";
  return "Near completion";
};

const CARD_CENTER_OFFSET = 70; // half of card visual height
const ROW_GAP = 360;
const START_Y = 380 + CARD_CENTER_OFFSET;
const LEFT_X = 60;
const RIGHT_X = 950;

/* ---------------------------------------------
   HELPERS
--------------------------------------------- */
const normalizeToFour = (items = []) => {
  const filled = [...items];
  while (filled.length < 4) filled.push(null);
  return filled.slice(0, 4);
};

const RoadmapPlaceholderCard = () => {
  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden min-w-[180px]">
      
      {/* ===== COVER PLACEHOLDER ===== */}
      <div className="relative h-28 w-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
        <span className="text-gray-400 dark:text-gray-500 text-sm font-medium">
          Upcoming
        </span>
      </div>

      {/* ===== CONTENT PLACEHOLDER ===== */}
      <div className="px-3 pt-3 pb-4">
        
        {/* Progress text row */}
        <div className="flex justify-between items-center mb-2">
          <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-8 rounded bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />

        {/* Chapters text */}
        <div className="mt-2 h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
};

/* ---------------------------------------------
   YEAR TAB ROW BUILDER (ISOLATED)
--------------------------------------------- */
const buildYearRows = (courses = []) => {
  const rows = [];

  for (let i = 0; i < courses.length; i += 3) {
    rows.push(courses.slice(i, i + 3));
  }

  return rows;
};

const buildPlaceholderRows = () => {
  // 3 rows × 3 cards = 9 placeholders
  return Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }).fill(null)
  );
};

/* ---------------------------------------------
   SVG ROAD BUILDER (FROM NEW CODE)
--------------------------------------------- */
const buildStaticRoadPath = (rows) => {
  let d = "";
  let y = START_Y;
  let dir = "right";

  for (let i = 0; i < rows; i++) {
    d += dir === "right"
      ? `M ${LEFT_X} ${y} H ${RIGHT_X} `
      : `M ${RIGHT_X} ${y} H ${LEFT_X} `;

    if (i < rows - 1) {
      d += dir === "right"
        ? `C ${RIGHT_X + 60} ${y}, ${RIGHT_X + 60} ${y + ROW_GAP}, ${RIGHT_X} ${y + ROW_GAP} `
        : `C ${LEFT_X - 60} ${y}, ${LEFT_X - 60} ${y + ROW_GAP}, ${LEFT_X} ${y + ROW_GAP} `;
    }

    y += ROW_GAP;
    dir = dir === "right" ? "left" : "right";
  }

  return d;
};

/* ---------------------------------------------
   MAIN COMPONENT
--------------------------------------------- */
const StudentRoadmapPrimary = () => {
  const user = useAuthStore((s) => s.user);

  const { data: roadmapData, isLoading, error, refetch } = useRoadmap({
    refetchInterval: 30000,
  });

  const milestoneCompletion = useMilestoneCompletion();
  const { triggerCelebration } = useMilestoneCelebration();

  const [activeYear, setActiveYear] = useState("all");

    /* ---------- SVG PROGRESS ---------- */
  const pathRef = useRef(null);
  const [pathLength, setPathLength] = useState(0);
  const glowPathRef = useRef(null);
const [checkpoints, setCheckpoints] = useState([]);

  /* ---------- Group courses by year ---------- */
  const courses = roadmapData?.courses || [];

  const groupedByYear = useMemo(() => {
    return courses.reduce((acc, course) => {
      const year = course.year || 1;
      if (!acc[year]) acc[year] = [];
      acc[year].push(course);
      return acc;
    }, {});
  }, [courses]);

  const isFullJourney = activeYear === "all";

const yearRows = useMemo(() => {
  if (isFullJourney) return [];

  const yearCourses = groupedByYear[activeYear] || [];

  if (!yearCourses.length) {
    return buildPlaceholderRows();
  }

  return buildYearRows(yearCourses);
}, [activeYear, groupedByYear, isFullJourney]);


  const cohortMaxYear = roadmapData?.summary?.totalYears ?? 4;

const visibleYears =
  activeYear === "all"
    ? Array.from({ length: cohortMaxYear }, (_, i) => i + 1)
    : activeYear <= cohortMaxYear
      ? [activeYear]
      : [];


const svgRowsCount = isFullJourney
  ? visibleYears.length
  : yearRows.length;

const roadPath = buildStaticRoadPath(svgRowsCount);


useEffect(() => {
  if (!pathRef.current) return;

  const length = pathRef.current.getTotalLength();
  setPathLength(length);

  // ---- CHECKPOINT DOTS (per year) ----
  const points = [];
  const rows = svgRowsCount;
  for (let i = 1; i <= rows; i++) {
    const pct = i / rows;
    const point = pathRef.current.getPointAtLength(length * pct);
    points.push(point);
  }
  setCheckpoints(points);
}, [roadPath, svgRowsCount]);


  /* ---------- Milestone handler ---------- */
  const handleMilestoneComplete = async (courseId, milestoneNumber) => {
    const result = await milestoneCompletion.mutateAsync({
      courseId,
      milestoneNumber,
    });

    if (result?.completed && result?.stampAwarded) {
      triggerCelebration({
        courseId,
        milestoneNumber,
        stampType: result.stampType,
      });
      refetch();
    }
  };

  /* ---------------------------------------------
     LOADING / ERROR / EMPTY
  --------------------------------------------- */
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <CourseCardSkeleton key={i} type="primaryMd" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">
          Failed to load roadmap. Please try again.
        </p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-primaryColor text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!courses.length) {
    return <NoData message="You haven't enrolled in any courses yet." />;
  }

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */
  const progress = roadmapData?.summary?.overallProgress ?? 0;
  const dashOffset = pathLength * (1 - progress / 100);

  return (
    <>
      {/* ===== HEADER ===== */}
      <div className="relative mb-14 px-6 md:px-0 md:text-left text-center">
        <h1 className="text-3xl font-bold">Career Roadmap</h1>
        <p className="text-contentColor mt-2">
          Full Stack Developer Journey
        </p>

        {/* Progress Badge */}
        <div className="absolute right-0 top-0 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primaryColor flex items-center justify-center text-sm font-bold">
            {Math.round(progress)}%
          </div>
          <div className="text-left">
            <div className="text-xs text-gray-500">Your progress</div>
            <div className="text-sm font-semibold">
              {getProgressLabel(progress)}
            </div>
          </div>
        </div>
      </div>

      {/* ===== FILTER TABS ===== */}
      <div className="flex justify-center mb-10">
        <div className="bg-white rounded-full shadow px-2 py-1 flex gap-1">
          {YEAR_TABS.filter(tab =>
  tab.value === "all" || tab.value <= cohortMaxYear
).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveYear(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition
                ${
                  activeYear === tab.value
                    ? "bg-primaryColor text-white"
                    : "hover:bg-gray-100"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== ROADMAP (ROW-BASED + SCROLL) ===== */}
      <div className="relative space-y-6">


        {/* ===== SVG CURVE ===== */}
<svg
  className="absolute inset-0 w-full h-full z-0 pointer-events-none"
  viewBox="0 0 1000 2000"
  preserveAspectRatio="none"
>
  <defs>
    {/* Progress gradient */}
    <linearGradient id="roadGradient" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#8b5cf6" />
      <stop offset="100%" stopColor="#ec4899" />
    </linearGradient>

    {/* Glow filter */}
    <filter id="glow">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  {/* BASE ROAD */}
  <path
    d={roadPath}
    stroke="#e5e7eb"
    strokeWidth="6"
    fill="none"
    strokeLinecap="round"
  />

  {/* GLOW PATH */}
  <path
    ref={glowPathRef}
    d={roadPath}
    stroke="#a78bfa"
    strokeWidth="10"
    fill="none"
    strokeLinecap="round"
    strokeDasharray={pathLength}
    strokeDashoffset={dashOffset}
    filter="url(#glow)"
    opacity="0.6"
  />

  {/* PROGRESS PATH */}
  <path
    ref={pathRef}
    d={roadPath}
    stroke="url(#roadGradient)"
    strokeWidth="6"
    fill="none"
    strokeLinecap="round"
    strokeDasharray={pathLength}
    strokeDashoffset={dashOffset}
    style={{ transition: "stroke-dashoffset 1s ease" }}
  />

  {/* CHECKPOINT DOTS */}
  {checkpoints.map((pt, i) => (
    <circle
      key={i}
      cx={pt.x}
      cy={pt.y}
      r="6"
      fill={progress >= ((i + 1) / checkpoints.length) * 100 ? "#8b5cf6" : "#e5e7eb"}
      stroke="white"
      strokeWidth="2"
    />
  ))}

  {/* ROCKET MOVING ON PATH */}
  <g>
    <circle r="16" fill="#7c3aed" />
    <text
      x="-6"
      y="6"
      fontSize="16"
      fill="white"
    >
      🚀
    </text>

    <animateMotion
      dur="1s"
      fill="freeze"
      path={roadPath}
      keyPoints={`0;${progress / 100}`}
      keyTimes="0;1"
      calcMode="linear"
    />
  </g>
</svg>

        

{/* ===== START NODE ===== */}
<div className="flex flex-col items-center text-center gap-2">

  {/* Rocket Icon */}
<div className="relative">
  {/* soft outer glow */}
  <div className="absolute inset-0 rounded-full bg-purple-600/40 blur-2xl" />

  {/* main circle */}
  <div
    className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl"
    style={{
      background: `
        radial-gradient(
          circle at 30% 30%,
          #a855f7 0%,
          #7c3aed 35%,
          #5b21b6 70%,
          #3b0764 100%
        )
      `,
    }}
  >
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2c4 2 6 6 6 10l-6 6-6-6c0-4 2-8 6-10z" />
      <circle cx="12" cy="8" r="1.5" />
      <path d="M12 18v4" />
      <path d="M9 20l3-2 3 2" />
    </svg>
  </div>
</div>


  {/* Center Text (MISSING PART) */}
  <div className="max-w-md">
    <h2 className="text-xl font-bold text-black">
      Start Your Journey
    </h2>
    <p className="mt-1 text-sm text-gray-500">
      From beginner to industry-ready full stack developer
    </p>
  </div>

  {/* Gradient Vertical Line */}
  <div className="w-[3px] h-14 bg-gradient-to-b from-purple-500 via-purple-400 to-transparent rounded-full" />
</div>

        {isFullJourney && visibleYears.map((year, yearIndex) => {
          const yearCoursesRaw = groupedByYear[year] || [];
          const shouldScroll = yearCoursesRaw.length > 4;
          const yearCourses = shouldScroll
            ? yearCoursesRaw
            : normalizeToFour(yearCoursesRaw);

          return (
            <div key={year} className="relative z-10">

              {/* YEAR LABEL */}
              <div className="flex justify-center mb-6">
                <span className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-semibold shadow">
                  {year} Year
                </span>
              </div>

              {/* ROW */}
<div className="relative flex gap-8 overflow-x-auto pb-4 px-6 md:px-12 scroll-pl-12 scroll-pr-12 scrollbar-none">

                {yearCourses.map((course, idx) => (
                  <div key={idx} className="relative min-w-[180px]">
                    {course ? (
                      <RoadmapCourseCard
                        course={course}
                        onMilestoneComplete={handleMilestoneComplete}
                      />
                    ) : (
                      <RoadmapPlaceholderCard />
                    )}

{/* Horizontal connector (disabled) */}
{false && idx < yearCourses.length - 1 && (
  <div className="absolute top-1/2 right-[-32px] w-8 h-[3px]" />
)}
                  </div>
                ))}
              </div>

              {/* Vertical connector to next row */}
              {yearIndex < visibleYears.length - 1 && (
                <div className="hidden md:block absolute left-1/2 -bottom-20 w-[3px] h-20 bg-purple-400 -translate-x-1/2" />
              )}
            </div>
          );
        })}

        {!isFullJourney &&
  yearRows.map((row, rowIndex) => (
    <div key={rowIndex} className="relative z-10">

      {/* ROW */}
      <div className="relative flex gap-15 pb-20 px-6 md:px-12">
        {row.map((course, idx) => (
          <div key={idx} className="relative min-w-[200px]">
            {course ? (
              <RoadmapCourseCard
                course={course}
                onMilestoneComplete={handleMilestoneComplete}
              />
            ) : (
              <RoadmapPlaceholderCard />
            )}
          </div>
        ))}
      </div>

      {/* Vertical connector */}
      {rowIndex < yearRows.length - 1 && (
        <div className="hidden md:block absolute left-1/2 -bottom-20 w-[3px] h-20 bg-purple-400 -translate-x-1/2" />
      )}
    </div>
  ))}


{/* ===== END NODE ===== */}
<div className="flex justify-center relative z-10">
  <div className="flex flex-col items-center text-center">

    {/* Gradient vertical connector */}
    <div className="w-[3px] h-20 mb-4 rounded-full
      bg-gradient-to-b from-orange-400 via-orange-500 to-transparent" />

    {/* Trophy */}
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-orange-400/40 blur-2xl" />
      <div
        className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: `
            radial-gradient(
              circle at 30% 30%,
              #fbbf24 0%,
              #f59e0b 40%,
              #d97706 70%,
              #92400e 100%
            )
          `,
        }}
      >
        {/* Trophy SVG */}
        <svg width="42" height="42" viewBox="0 0 24 24" fill="white">
          <path d="M18 4h2a1 1 0 011 1c0 3.31-2.69 6-6 6-.34 0-.67-.03-1-.08V14h3v2H7v-2h3V10.92c-.33.05-.66.08-1 .08-3.31 0-6-2.69-6-6a1 1 0 011-1h2V2h12v2z" />
          <path d="M9 18h6v2H9z" />
          <path d="M10 20h4v2h-4z" />
        </svg>
      </div>
    </div>

    <p className="mt-4 font-bold text-lg text-orange-500">
      You Are Job-Ready
    </p>

    <div className="flex flex-wrap justify-center gap-3 mt-3">
      <span className="px-4 py-1.5 rounded-full bg-white shadow text-sm font-medium">
        🧑‍💼 Portfolio Ready
      </span>
      <span className="px-4 py-1.5 rounded-full bg-white shadow text-sm font-medium">
        🎒 Internship Ready
      </span>
      <span className="px-4 py-1.5 rounded-full bg-white shadow text-sm font-medium">
        🎓 Industry Certified
      </span>
    </div>
  </div>
</div>

      </div>

      {/* ===== CELEBRATION ===== */}
      <MilestoneCelebrationManager />
    </>
  );
};

export default StudentRoadmapPrimary;
