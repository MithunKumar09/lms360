/**
 * Wishlist Component
 * 
 * Displays user's wishlist courses with dynamic data from API.
 * Uses Zustand store and React Query hooks.
 */

"use client";
import CourseCard from "../courses/CourseCard";
import CourseCardSkeleton from "../courses/CourseCardSkeleton";
import HeadingDashboard from "../headings/HeadingDashboard";
import AdvancedPagination from "../courses/AdvancedPagination";
import { useWishlist } from "@/hooks/api/useWishlist";
import { useAuthStore } from "@/store/index.js";
import { useWishlistStore } from "@/store/index.js";
import NoData from "../others/NoData";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useMemo } from "react";

const Wishlist = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const role = user?.role;
  const wishlistRef = useRef(null);

  // Pagination state from URL params
  const [currentPage, setCurrentPage] = useState(0);
  const [limit, setLimit] = useState(12);

  // Initialize pagination from URL params (only on mount)
  useEffect(() => {
    if (searchParams) {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const pageLimit = parseInt(searchParams.get('limit') || '12', 10);
      const initialPage = Math.max(0, page - 1); // Convert to 0-based index
      if (initialPage !== currentPage) setCurrentPage(initialPage);
      if (pageLimit !== limit) setLimit(pageLimit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Fetch wishlist from API
  const { data: wishlistData, isLoading, error } = useWishlist({
    enabled: isAuthenticated,
  });

  // Get wishlist items from Zustand store (synced with API)
  const wishlistItems = useWishlistStore((state) => state.items);

  // Use API data if available, otherwise use Zustand store
  const allCourses = wishlistData?.items || wishlistItems || [];
  
  // Client-side pagination
  const totalItems = allCourses.length;
  const totalPages = Math.ceil(totalItems / limit);
  const skip = currentPage * limit;
  
  const courses = useMemo(() => {
    if (!allCourses || allCourses.length === 0) return [];
    return allCourses.slice(skip, skip + limit);
  }, [allCourses, skip, limit]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Optionally redirect to login or show message
      // router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Update URL params when pagination changes (prevent infinite loop)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const currentSearch = new URLSearchParams(window.location.search);
    const currentUrlPage = parseInt(currentSearch.get('page') || '1', 10) - 1;
    const currentUrlLimit = parseInt(currentSearch.get('limit') || '12', 10);
    
    // Only update if values actually changed
    if (currentUrlPage === currentPage && currentUrlLimit === limit) return;
    
    const params = new URLSearchParams();
    if (currentPage > 0) params.set('page', (currentPage + 1).toString());
    if (limit !== 12) params.set('limit', limit.toString());
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;
    
    router.replace(newUrl, { scroll: false });
  }, [currentPage, limit, router]);

  // Handle pagination
  const handlePagination = (newPage) => {
    setCurrentPage(newPage);
    if (wishlistRef.current) {
      wishlistRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle page size change
  const handlePageSizeChange = (newLimit) => {
    setLimit(newLimit);
    setCurrentPage(0); // Reset to first page
  };

  // Loading state with enhanced skeleton
  if (isLoading) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <HeadingDashboard>Wishlist</HeadingDashboard>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-y-30px">
          {Array.from({ length: limit || 12 }).map((_, idx) => (
            <CourseCardSkeleton key={idx} type="primaryMd" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <HeadingDashboard>Wishlist</HeadingDashboard>
        <NoData message="Failed to load wishlist. Please try again." />
      </div>
    );
  }

  // Empty state
  if (!courses || courses.length === 0) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <HeadingDashboard>Wishlist</HeadingDashboard>
        <NoData message="Your wishlist is empty. Start adding courses to your wishlist!" />
      </div>
    );
  }

  return (
    <div ref={wishlistRef} className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <HeadingDashboard>
        Wishlist {totalItems > 0 && `(${totalItems})`}
      </HeadingDashboard>
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-6">
        {courses.map((course, idx) => (
          <CourseCard key={course.id || course.courseId || idx} type={"primary"} course={course} />
        ))}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <AdvancedPagination
          currentPage={currentPage}
          totalPages={totalPages}
          limit={limit}
          totalItems={totalItems}
          onPageChange={handlePagination}
          onPageSizeChange={handlePageSizeChange}
          scrollRef={wishlistRef}
        />
      )}
    </div>
  );
};

export default Wishlist;
