//src/components/sections/hero-banners/HeroDashboard.js
"use client";
import React from "react";
import dashboardImage2 from "@/assets/images/dashbord/dashbord__2.jpg";
import teacherImage2 from "@/assets/images/teacher/teacher__2.png";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/api/useUser.js";
import { useEnrolledCourses, useCompletedCourses } from "@/hooks/api/useStudentCourses";
import { useInstructorReviewStats } from "@/hooks/api/useInstructorReviews.js";
import { useStudentStreak } from "@/hooks/api/useStudentStreak.js";
import { useRoadmap } from "@/hooks/api/useRoadmap.js";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import dynamic from "next/dynamic";
import StudentStreaks from "@/components/modals/StudentStreaks";

// Import Lottie with proper error handling
const Lottie = dynamic(
  () => import("lottie-react").then((mod) => mod.default || mod),
  { 
    ssr: false,
    loading: () => null
  }
);

const HeroDashboard = () => {
  const pathname = usePathname();
  // Safely extract the role from pathname (e.g., /dashboards/admin-dashboard -> "admin")
  const pathParts = pathname?.split("/") || [];
  const secondPart = pathParts[2] || "";
  const partOfPathNaem = secondPart.split("-")[0] || "";
  
  // Special handling for shared routes that should show admin UI
  const isOrganizationFinance = pathname.startsWith('/dashboards/organization-finance');
  const isAnnouncements = pathname.startsWith('/dashboards/announcements');
  
  const isSuperadmin = partOfPathNaem === "superadmin";
  const isAdmin = partOfPathNaem === "admin" || isOrganizationFinance || isAnnouncements;
  const isInstructor = partOfPathNaem === "instructor";
  const isVendor = partOfPathNaem === "vendor";
  const isMentor = partOfPathNaem === "mentor";
  const isBrand = partOfPathNaem === "brand";

  // Fetch current user data for all roles (including student)
  const isStudent = partOfPathNaem === "student" || partOfPathNaem === "alumni" || partOfPathNaem === "parent";
  const { data: userData, isLoading: isLoadingUser } = useUser({
    enabled: isSuperadmin || isAdmin || isVendor || isInstructor || isStudent || isMentor || isBrand,
  });
  const [openStreaks, setOpenStreaks] = React.useState(false);

  // Fetch brand profile data for brand role
  const { data: brandProfileData, isLoading: isLoadingBrandProfile } = useQuery({
    queryKey: ['brandProfile'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/brand/profile');
        return response;
      } catch (error) {
        return { success: false, data: { profile: null } };
      }
    },
    enabled: isBrand,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const brandProfile = brandProfileData?.data?.profile || null;

  // Fetch enrolled courses count for students
  const { data: enrolledCoursesData, isLoading: isLoadingEnrolled } = useEnrolledCourses(
    { page: 1, limit: 1 }, // Only need count, so minimal data
    { enabled: isStudent }
  );

  // Fetch completed courses count (certificates) for students
  const { data: completedCoursesData, isLoading: isLoadingCompleted } = useCompletedCourses(
    { page: 1, limit: 1 }, // Only need count, so minimal data
    { enabled: isStudent }
  );

  // Extract counts
  const enrolledCount = enrolledCoursesData?.pagination?.total || 0;
  const certificatesCount = completedCoursesData?.pagination?.total || 0;

  // Fetch student streak (activity-based)
  const { data: streakData, isLoading: isLoadingStreak } = useStudentStreak({
    enabled: isStudent,
  });

  // Fetch roadmap data for rank calculation (based on total stamps)
  const { data: roadmapData, isLoading: isLoadingRoadmap } = useRoadmap({
    enabled: isStudent,
    refetchInterval: false, // Don't auto-refetch for rank display
  });

  // Extract dynamic values for student
  const streakDays = streakData?.currentStreak ?? 0;
  const totalStamps = roadmapData?.summary?.totalStamps || 0;
  
  // Derive rank from stamp count
  // Use a simple formula: rank = max(1, 1000 - totalStamps)
  // Can be adjusted based on global leaderboard logic if needed
  const rankNumber = totalStamps === 0 
    ? 1000 // New student with no stamps shows rank #1000
    : Math.max(1, 1000 - totalStamps);

  // Fetch instructor review statistics for instructor role
  const instructorId = userData?.user?.id;
  const { data: reviewStats, isLoading: isLoadingReviews, isError: isReviewsError } = useInstructorReviewStats(
    instructorId,
    { enabled: isInstructor && !!instructorId }
  );

  // Format rating and review count
  const averageRating = reviewStats?.averageRating || 0;
  const totalReviews = reviewStats?.totalReviews || 0;
  const formattedRating = averageRating > 0 ? averageRating.toFixed(1) : '0.0';

  // Load Lottie animation data dynamically
  const [animationData, setAnimationData] = React.useState(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const [lottieReady, setLottieReady] = React.useState(false);
  
  // Ensure component is mounted on client side
  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Preload Lottie component when student
  React.useEffect(() => {
    if (isStudent && isMounted) {
      import("lottie-react")
        .then(() => {
          setLottieReady(true);
        })
        .catch((error) => {
          console.error("Failed to load Lottie library:", error);
        });
    } else {
      setLottieReady(false);
    }
  }, [isStudent, isMounted]);
  
  React.useEffect(() => {
    if (!isStudent || !isMounted) {
      setAnimationData(null);
      return;
    }
    
    let isCancelled = false;
    
    const loadAnimation = async () => {
      try {
        // Use dynamic import for JSON files in Next.js
        const lottieModule = await import("@/assets/lottie/roadmapanime.json");
        
        if (isCancelled) return;
        
        // Handle different export formats
        let data = null;
        if (lottieModule && lottieModule.default) {
          data = lottieModule.default;
        } else if (lottieModule && typeof lottieModule === 'object' && !Array.isArray(lottieModule)) {
          data = lottieModule;
        }
        
        // Validate the data structure - ensure it's a valid object
        if (data && 
            typeof data === 'object' && 
            !Array.isArray(data) && 
            !(data instanceof Error) &&
            data !== null &&
            Object.keys(data).length > 0) {
          if (!isCancelled) {
            setAnimationData(data);
          }
        } else {
          console.warn("Invalid animation data structure");
          if (!isCancelled) {
            setAnimationData(null);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to load Lottie animation:", error);
          setAnimationData(null);
        }
      }
    };
    
    loadAnimation();
    
    return () => {
      isCancelled = true;
    };
  }, [isStudent, isMounted]);

  // Extract user information with fallbacks
  const firstName = userData?.user?.firstName || null;
  const lastName = userData?.user?.lastName || null;
  const profileImage = userData?.user?.profileImage || null;
  
  // Format display name - show "--" if both are null, otherwise show available names
  // For brand role, use brand_name from profile
  const displayName = (() => {
    if (isBrand && brandProfile?.brand_name) {
      return brandProfile.brand_name;
    }
    if (!firstName && !lastName) return "--";
    const parts = [];
    if (firstName) parts.push(firstName);
    if (lastName) parts.push(lastName);
    return parts.length > 0 ? parts.join(" ") : "--";
  })();

  // Get brand logo for brand role
  const brandLogo = isBrand && brandProfile?.logo_url ? brandProfile.logo_url : null;

  // Determine profile image source
  // For brand role, use brand logo if available
  const profileImageSrc = isBrand && brandLogo 
    ? brandLogo 
    : profileImage || (isSuperadmin || isAdmin || isVendor || isInstructor || isMentor ? dashboardImage2 : teacherImage2);

      /* ======================================================
     ⭐ STUDENT HERO (NEW UI – IMAGE MATCHED)
     ====================================================== */
  if (isStudent) {
    return (
      <section>
        <div className="container-fluid-2">
          <div className="rounded-[36px] bg-gradient-to-r from-[#160A3A] via-[#1B0F4D] to-[#12072E] px-6 py-5 md:px-10 md:py-6 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-2xl">

            {/* LEFT */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 p-[2px]">
                <Image
                  src={profileImageSrc}
                  alt="Profile"
                  width={56}
                  height={56}
                  className="rounded-full object-cover bg-[#1b1144]"
                />
              </div>

              <div className="text-white">
                <div className="text-xs text-purple-200 mb-1 flex items-center gap-1">
                  ⚡ <span className="font-medium">Level 8 Achiever</span>
                </div>
                <h2 className="text-lg md:text-xl font-bold">
                  Welcome back, {isLoadingUser ? "..." : displayName}!
                </h2>
                <p className="text-sm text-purple-200">
                  You are on fire! keep your {isLoadingStreak ? "..." : streakDays}-day streak going
                </p>
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex flex-wrap gap-3 justify-center xl:justify-end">
              <div onClick={() => setOpenStreaks(true)} className="cursor-pointer">
  <StatPill
    icon="🔥"
    title={`${streakDays} Day`}
    subtitle="Streak"
    gradient="from-orange-400 to-pink-500"
  />
</div>
              <Link href="/dashboards/student-leaderboard">
              <StatPill icon="🏆" title="Batch-8" subtitle="Achiever" gradient="from-purple-500 to-fuchsia-600" /></Link>
              <StatPill icon="👑" title={isLoadingRoadmap ? "..." : `#${rankNumber}`} subtitle="Rank" gradient="from-emerald-400 to-teal-500" />
              <Link href="/dashboards/student-leaderboard">
              <StatPill icon="💎" title="2,450" subtitle="Points" gradient="from-indigo-500 to-violet-600" /></Link>
            </div>
          </div>
        </div>
              <StudentStreaks
  open={openStreaks}
  onClose={() => setOpenStreaks(false)}
/>
      </section>
    );
  }

return (
  <section>
    <div className="container-fluid-2">
      <div className="rounded-[36px] bg-gradient-to-r from-[#160A3A] via-[#1B0F4D] to-[#12072E] px-6 py-5 md:px-10 md:py-6 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-2xl">

        {/* LEFT PROFILE SECTION */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 p-[2px] shrink-0">
            <Image
              src={profileImageSrc}
              alt="Profile"
              width={64}
              height={64}
              unoptimized={
                typeof profileImageSrc === "string" &&
                profileImageSrc.startsWith("http")
              }
              className="w-full h-full rounded-full object-cover bg-[#1b1144]"
            />
          </div>

          <div className="text-white min-w-0">
            {(isSuperadmin ||
              isAdmin ||
              isVendor ||
              isInstructor ||
              isMentor) && (
              <>
                <div className="text-xs text-purple-200 mb-1">
                  ⚡ <span className="font-medium">Dashboard Overview</span>
                </div>
                <h2 className="text-lg md:text-xl font-bold truncate">
                  Hello, {isLoadingUser ? "Loading..." : displayName}
                </h2>
              </>
            )}

            {isBrand && (
              <>
                <div className="text-xs text-purple-200 mb-1">
                  ✨ <span className="font-medium">Brand Workspace</span>
                </div>
                <h2 className="text-lg md:text-xl font-bold truncate">
                  {isLoadingBrandProfile || isLoadingUser
                    ? "Loading..."
                    : displayName}
                </h2>

                {brandProfile && (
                  <ul className="flex items-center gap-3 mt-2 flex-wrap text-purple-200">
                    {brandProfile.website_url && (
                      <li>
                        <a
                          href={brandProfile.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white transition-colors"
                        >
                          🌐
                        </a>
                      </li>
                    )}
                    {brandProfile.contact_email && (
                      <li>
                        <a
                          href={`mailto:${brandProfile.contact_email}`}
                          className="hover:text-white transition-colors"
                        >
                          ✉️
                        </a>
                      </li>
                    )}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>

        {/* CENTER ROLE FEATURES */}
        {(isVendor || isInstructor || isMentor) && !isAdmin && (
          <div className="flex justify-center">
            <div className="rounded-full bg-white/10 backdrop-blur-md px-5 py-3 text-white shadow-lg border border-white/10">
              {isInstructor ? (
                isLoadingReviews ? (
                  <p className="text-sm">Loading ratings...</p>
                ) : isReviewsError ? (
                  <p className="text-sm text-red-200">
                    Unable to load ratings
                  </p>
                ) : totalReviews > 0 ? (
                  <div className="text-center">
                    <div className="text-yellow text-lg">
                      ⭐ {formattedRating}
                    </div>
                    <p className="text-xs text-purple-200">
                      {totalReviews}{" "}
                      {totalReviews === 1 ? "Review" : "Reviews"}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-yellow text-lg">☆☆☆☆☆</div>
                    <p className="text-xs text-purple-200">
                      No reviews yet
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center">
                  <div className="text-yellow text-lg">⭐ 4.0</div>
                  <p className="text-xs text-purple-200">120 Reviews</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RIGHT ACTION / LOTTIE */}
        <div className="flex items-center justify-center xl:justify-end">
          {isSuperadmin ||
          isAdmin ||
          isVendor ||
          isInstructor ||
          isMentor ? (
            <Link
              href={`/dashboards/create-course`}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] px-6 py-3 text-white font-semibold shadow-lg hover:scale-[1.02] transition-all duration-300"
            >
              Create a New Course
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          ) : (
            <div className="flex items-center justify-center">
              {isMounted &&
              lottieReady &&
              animationData &&
              typeof animationData === "object" &&
              !Array.isArray(animationData) &&
              !(animationData instanceof Error) ? (
                <div className="w-full max-w-[220px] md:max-w-[260px]">
                  <React.Suspense fallback={null}>
                    <Lottie
                      animationData={animationData}
                      loop
                      autoplay
                      className="w-full h-auto"
                    />
                  </React.Suspense>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  </section>
);
};

/* ---------------- STAT PILL ---------------- */
const StatPill = ({ icon, title, subtitle, gradient }) => (
  <div className={`flex items-center gap-3 rounded-full bg-gradient-to-r ${gradient} px-4 py-2 text-white shadow-md`}>
    <span className="text-lg">{icon}</span>
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs opacity-90">{subtitle}</div>
    </div>
    <span className="text-xs opacity-70">▲</span>
  </div>
);

export default HeroDashboard;
