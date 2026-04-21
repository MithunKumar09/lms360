//src/components/sections/sub-section/dashboards/StudentRegisteredEventsWorkshops.js
"use client";
import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useStudentRegisteredEventsWorkshops } from "@/hooks/api/useStudentRegisteredEventsWorkshops";
import { formatDateShort } from "@/lib/utils/dateFormatter";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";

/**
 * Format date range for display
 */
const formatDateRange = (startDate, endDate) => {
  if (!startDate) return '--';
  
  try {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    if (isNaN(start.getTime())) return '--';
    
    const startFormatted = formatDateShort(start);
    
    if (!end || isNaN(end.getTime())) {
      return startFormatted;
    }
    
    // If same day, show single date
    if (start.toDateString() === end.toDateString()) {
      return startFormatted;
    }
    
    // Show date range
    const endFormatted = formatDateShort(end);
    return `${startFormatted} - ${endFormatted}`;
  } catch (error) {
    console.error('Error formatting date range:', error);
    return '--';
  }
};

/**
 * Check if event/workshop is ongoing
 */
const isOngoing = (startDate, endDate) => {
  if (!startDate) return false;
  
  try {
    const now = new Date();
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    return start <= now && (!end || end >= now);
  } catch {
    return false;
  }
};

const StudentRegisteredEventsWorkshops = () => {
  const { data, isLoading, error } = useStudentRegisteredEventsWorkshops({
    type: 'all',
    limit: 20, // Fetch more items for pagination
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // 3 columns on desktop, 2 on tablet, 1 on mobile

  // Paginate items
  const paginatedItems = useMemo(() => {
    if (!data?.items) return [];
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.items.slice(startIndex, endIndex);
  }, [data?.items, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (!data?.items) return 0;
    return Math.ceil(data.items.length / itemsPerPage);
  }, [data?.items, itemsPerPage]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <SkeletonLoader type="text" className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg overflow-hidden shadow-accordion-dark"
            >
              <SkeletonLoader type="card" className="h-48 w-full" />
              <div className="p-4">
                <SkeletonLoader type="text" className="h-4 w-20 mb-2" />
                <SkeletonLoader type="text" className="h-6 w-full mb-2" />
                <SkeletonLoader type="text" className="h-4 w-32 mb-4" />
                <SkeletonLoader type="button" className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    console.error("Error loading registered events/workshops:", error);
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <HeadingDashboard>Registered Events & Workshops</HeadingDashboard>
        <div className="mt-6">
          <NoData message="Failed to load events and workshops. Please try again later." />
        </div>
      </div>
    );
  }

  // Empty state
  if (!data?.items || data.items.length === 0) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <HeadingDashboard>Registered Events & Workshops</HeadingDashboard>
        <div className="mt-6">
          <NoData message="You haven't registered for any upcoming events or workshops yet." />
        </div>
      </div>
    );
  }

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <HeadingDashboard>Registered Events & Workshops</HeadingDashboard>

      {/* Grid Carousel */}
      <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedItems.map((item) => {
            const ongoing = isOngoing(item.startDate, item.endDate);
            const detailUrl = item.type === 'event' ? `/events/${item.id}` : `/workshops/${item.id}`;

            return (
              <div
                key={`${item.type}-${item.id}`}
                className="bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg overflow-hidden shadow-accordion-dark hover:shadow-lg transition-all duration-300 group"
              >
                {/* Cover Image */}
                <div className="relative h-48 w-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {item.coverImageUrl ? (
                    <Image
                      src={item.coverImageUrl}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primaryColor to-secondaryColor">
                      <i className="icofont-calendar text-whiteColor text-5xl opacity-50"></i>
                    </div>
                  )}
                  
                  {/* Type Badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.type === 'event'
                          ? 'bg-blue-500 text-whiteColor'
                          : 'bg-purple-500 text-whiteColor'
                      }`}
                    >
                      {item.type === 'event' ? 'Event' : 'Workshop'}
                    </span>
                  </div>

                  {/* Ongoing Badge */}
                  {ongoing && (
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-whiteColor">
                        Ongoing
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Date */}
                  <p className="text-sm text-blackColor dark:text-blackColor-dark mb-2 flex items-center gap-2">
                    <i className="icofont-calendar text-primaryColor"></i>
                    <span>{formatDateRange(item.startDate, item.endDate)}</span>
                  </p>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-2 line-clamp-2 group-hover:text-primaryColor transition-colors">
                    <Link href={detailUrl}>{item.title}</Link>
                  </h3>

                  {/* Mode */}
                  {item.mode && (
                    <p className="text-sm text-blackColor dark:text-blackColor-dark mb-4 flex items-center gap-2">
                      <i className={`icofont-${item.mode === 'online' ? 'monitor' : 'location-pin'} text-primaryColor`}></i>
                      <span className="capitalize">
                        {item.mode === 'online' ? 'Online' : item.mode}
                      </span>
                    </p>
                  )}

                  {/* Description (truncated) */}
                  {item.description && (
                    <p className="text-sm text-blackColor dark:text-blackColor-dark mb-4 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* View Details Button */}
                  <Link
                    href={detailUrl}
                    className="block w-full text-center px-4 py-2 bg-primaryColor text-whiteColor rounded-lg hover:bg-secondaryColor transition-colors duration-300 font-medium"
                  >
                    View Details
                    <i className="icofont-simple-right ml-2"></i>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                  : 'bg-primaryColor text-whiteColor hover:bg-secondaryColor'
              }`}
            >
              <i className="icofont-simple-left mr-2"></i>
              Previous
            </button>

            {/* Page Indicators */}
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primaryColor text-whiteColor'
                      : 'bg-gray-200 text-blackColor hover:bg-gray-300 dark:bg-gray-700 dark:text-blackColor-dark dark:hover:bg-gray-600'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                  : 'bg-primaryColor text-whiteColor hover:bg-secondaryColor'
              }`}
            >
              Next
              <i className="icofont-simple-right ml-2"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentRegisteredEventsWorkshops;
