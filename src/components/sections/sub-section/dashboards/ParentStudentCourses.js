"use client";

import { useState, useEffect } from "react";
import useTab from "@/hooks/useTab";
import TabContentWrapper from "@/components/shared/wrappers/TabContentWrapper";
import TabButtonSecondary from "@/components/shared/buttons/TabButtonSecondary";
import EnrolledContent from "@/components/shared/dashboards/EnrolledContent";
import ActiveContent from "@/components/shared/dashboards/ActiveContent";
import CompletedContent from "@/components/shared/dashboards/CompletedContent";
import AdvancedPagination from "@/components/shared/courses/AdvancedPagination";
import { useParentStudentCourses } from "@/hooks/api/useParent";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import CourseCardSkeleton from "@/components/shared/courses/CourseCardSkeleton";
import NoData from "@/components/shared/others/NoData";
import ParentStudentSelector from "./ParentStudentSelector";

/**
 * ParentStudentCourses Component
 * 
 * Displays enrolled/active/completed courses for a selected child.
 * Filters courses by the selected student.
 */
const ParentStudentCourses = () => {
  const { currentIdx, handleTabClick } = useTab();
  
  // Selected child state
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  
  // Pagination state for each tab
  const [enrolledPage, setEnrolledPage] = useState(1);
  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [limit] = useState(12);

  // Reset pagination when student changes
  useEffect(() => {
    setEnrolledPage(1);
    setActivePage(1);
    setCompletedPage(1);
  }, [selectedStudentId]);

  // Fetch courses for selected child
  const { data: enrolledData, isLoading: isLoadingEnrolled, error: enrolledError } = useParentStudentCourses({
    studentId: selectedStudentId,
    page: enrolledPage,
    limit,
    status: 'enrolled',
  });

  const { data: activeData, isLoading: isLoadingActive, error: activeError } = useParentStudentCourses({
    studentId: selectedStudentId,
    page: activePage,
    limit,
    status: 'active',
  });

  const { data: completedData, isLoading: isLoadingCompleted, error: completedError } = useParentStudentCourses({
    studentId: selectedStudentId,
    page: completedPage,
    limit,
    status: 'completed',
  });

  // Transform courses for display
  const enrolledCourses = enrolledData?.courses?.map(course => ({
    ...course,
    isActive: !course.isCompleted && (course.progress || 0) > 0,
    isCompleted: course.isCompleted,
    completedParchent: Math.round(course.progress || 0),
  })) || [];

  const activeCourses = activeData?.courses || [];
  const completedCourses = completedData?.courses?.map(course => ({
    ...course,
    isCompleted: true,
    completedParchent: 100,
  })) || [];

  // Loading skeleton
  const renderSkeleton = () => (
    <>
      {Array.from({ length: 6 }).map((_, idx) => (
        <CourseCardSkeleton key={`skeleton-${idx}`} type="primaryMd" />
      ))}
    </>
  );

  // Error state
  const renderError = (error) => (
    <div className="text-center py-10">
      <p className="text-red-500">{error?.message || 'Failed to load courses'}</p>
    </div>
  );

  // Empty state
  const renderEmpty = (message) => (
    <div className="col-span-full">
      <NoData message={message} />
    </div>
  );

  // Show student selector and message if no student selected
  if (!selectedStudentId) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Student Courses
          </h2>
        </div>
        <div className="mb-6">
          <ParentStudentSelector
            value={selectedStudentId}
            onChange={setSelectedStudentId}
            showLabel={true}
          />
        </div>
        <div className="text-center py-10">
          <p className="text-contentColor dark:text-contentColor-dark">
            Please select a child to view their enrolled courses.
          </p>
        </div>
      </div>
    );
  }

  const tabbuttons = [
    {
      name: "ENROLLED COURSES",
      content: (
        <>
          {isLoadingEnrolled ? (
            renderSkeleton()
          ) : enrolledError ? (
            renderError(enrolledError)
          ) : enrolledCourses.length === 0 ? (
            renderEmpty("This child hasn't enrolled in any courses yet.")
          ) : (
            <>
              <EnrolledContent courses={enrolledCourses} />
              <div className="mt-6">
                <AdvancedPagination
                  currentPage={enrolledPage - 1}
                  totalPages={enrolledData?.pagination?.totalPages || 0}
                  totalItems={enrolledData?.pagination?.total || 0}
                  limit={limit}
                  onPageChange={(page) => setEnrolledPage(page + 1)}
                  showPageSizeSelector={false}
                  updateUrlParams={false}
                />
              </div>
            </>
          )}
        </>
      ),
    },
    {
      name: "ACTIVE COURSES",
      content: (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:-mx-15px">
            {isLoadingActive ? (
              <>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <CourseCardSkeleton key={idx} type="primaryMd" />
                ))}
              </>
            ) : activeError ? (
              renderError(activeError)
            ) : activeCourses.length === 0 ? (
              renderEmpty("No active courses for this child.")
            ) : (
              <ActiveContent courses={activeCourses} />
            )}
          </div>
          
          {!isLoadingActive && !activeError && activeCourses.length > 0 && (
            <div className="mt-6">
              <AdvancedPagination
                currentPage={activePage - 1}
                totalPages={activeData?.pagination?.totalPages || 0}
                totalItems={activeData?.pagination?.total || 0}
                limit={limit}
                onPageChange={(page) => setActivePage(page + 1)}
                showPageSizeSelector={false}
                updateUrlParams={false}
              />
            </div>
          )}
        </>
      ),
    },
    {
      name: "COMPLETED COURSES",
      content: (
        <>
          {isLoadingCompleted ? (
            renderSkeleton()
          ) : completedError ? (
            renderError(completedError)
          ) : completedCourses.length === 0 ? (
            renderEmpty("This child hasn't completed any courses yet.")
          ) : (
            <>
              <CompletedContent courses={completedCourses} />
              <div className="mt-6">
                <AdvancedPagination
                  currentPage={completedPage - 1}
                  totalPages={completedData?.pagination?.totalPages || 0}
                  totalItems={completedData?.pagination?.total || 0}
                  limit={limit}
                  onPageChange={(page) => setCompletedPage(page + 1)}
                  showPageSizeSelector={false}
                  updateUrlParams={false}
                />
              </div>
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      {/* heading */}
      <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Student Courses
          </h2>
          <div className="w-64">
            <ParentStudentSelector
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              showLabel={false}
              placeholder="Select child..."
            />
          </div>
        </div>
      </div>
      <div className="tab">
        <div className="tab-links flex flex-wrap mb-10px lg:mb-50px rounded gap-10px justify-center">
          {tabbuttons?.map(({ name }, idx) => (
            <TabButtonSecondary
              key={idx}
              name={name}
              idx={idx}
              currentIdx={currentIdx}
              handleTabClick={handleTabClick}
              button={"small"}
            />
          ))}
        </div>
        <div>
          {tabbuttons?.map(({ content }, idx) => (
            <TabContentWrapper
              key={idx}
              isShow={idx === currentIdx ? true : false}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:-mx-15px">
                {content}
              </div>
            </TabContentWrapper>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParentStudentCourses;
