//src/components/shared/roadmap/RoadmapCourseCard.js
"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * RoadmapCourseCard (Roadmap View – Slim Version)
 *
 * UI adapted for roadmap:
 * - Cover image visible
 * - Slim progress bar below cover
 * - Percentage + completed/total chapters
 * - Internal milestones / stats kept hidden (logic intact)
 */
const RoadmapCourseCard = memo(({ course, onMilestoneComplete }) => {
  const {
    id,
    title,
    coverImageUrl,
    progress = 0,
    completedMilestones = 0,
    totalMilestones = 0,
    slug,
  } = course;

const rawProgress =
  typeof progress === "string"
    ? parseFloat(progress)   // handles "60%" → 60
    : Number(progress);

const progressPercentage = Number.isFinite(rawProgress)
  ? Math.min(
      100,
      Math.round(rawProgress <= 1 ? rawProgress * 100 : rawProgress)
    )
  : 0;

  const getProgressGradient = (p) => {
  if (p >= 75) return "linear-gradient(90deg,#22c55e,#16a34a)";
  if (p >= 50) return "linear-gradient(90deg,#facc15,#22c55e)";
  if (p >= 25) return "linear-gradient(90deg,#fb923c,#facc15)";
  return "linear-gradient(90deg,#f97316,#fb7185)";
};

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">

      {/* ================= COVER ================= */}
      <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
        {coverImageUrl ? (
          <>
            <Image
              src={coverImageUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="320px"
            />
            <div className="absolute inset-0 bg-black/40" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primaryColor to-primaryColor-dark flex items-center justify-center">
            <span className="text-white text-5xl font-bold">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
<Link
  href={{
    pathname: "/course-details-3",
    query: { courseId: id },
  }}
  prefetch
>
  <h3 className="cursor-pointer text-white font-semibold text-base leading-tight line-clamp-2 hover:text-primaryColor transition">
    {title}
  </h3>
</Link>

        </div>
      </div>

      {/* ================= PROGRESS STRIP ================= */}
      <div className="px-3 pt-3 pb-4">

        {/* Progress text */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-contentColor">
            Course Progress
          </span>
          <span className="text-sm font-semibold text-black">
            {progressPercentage}%
          </span>
        </div>

{/* Progress bar */}
{/* Progress bar */}
<div
  className="w-full h-1.5 rounded-full bg-gray-200 transition-all duration-500"
  style={{
    backgroundImage: getProgressGradient(progressPercentage),
    backgroundSize: `${progressPercentage}% 100%`,
    backgroundRepeat: "no-repeat",
  }}
/>



        {/* Chapters / milestones */}
        <div className="mt-1.5 text-xs text-gray-500">
          {completedMilestones} / {totalMilestones} Chapters Completed
        </div>

        {/* Action */}
        {/* <div className="mt-4">
          <Link
            href={`/courses/${slug || id}`}
            className="inline-flex items-center justify-center w-full gap-2 px-4 py-2 bg-primaryColor text-white rounded-lg hover:bg-primaryColor-dark transition text-sm font-medium"
          >
            View Course
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div> */}
      </div>

      {/* ================= LOGIC KEPT (HIDDEN) ================= */}
      <div className="hidden">
        {/* All previous components are intentionally preserved here
            for future roadmap modes, analytics, or detailed views */}
      </div>
    </div>
  );
});

RoadmapCourseCard.displayName = "RoadmapCourseCard";

export default RoadmapCourseCard;
