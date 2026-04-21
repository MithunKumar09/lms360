"use client";
import PublishContent from "./PublishContent";
import DraftContent from "./DraftContent";
import TabButtonSecondary from "../buttons/TabButtonSecondary";
import TabContentWrapper from "../wrappers/TabContentWrapper";
import useTab from "@/hooks/useTab";
import { useCourseManagement } from "@/hooks/api/useCourses";
import { useAuthStore } from "@/store/index";
import CourseCardSkeleton from "../courses/CourseCardSkeleton";
import NoData from "../others/NoData";

const DashboardCoursesTab = () => {
  const { currentIdx, handleTabClick } = useTab();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Fetch published courses
  const {
    data: publishedData,
    isLoading: isLoadingPublished,
    error: publishedError,
  } = useCourseManagement(
    {
      status: "published",
      page: 1,
      limit: 100,
      role: user?.role || "instructor",
    },
    {
      enabled: isAuthenticated && user?.role === "instructor",
    }
  );

  // Fetch draft courses
  const {
    data: draftData,
    isLoading: isLoadingDraft,
    error: draftError,
  } = useCourseManagement(
    {
      status: "draft",
      page: 1,
      limit: 100,
      role: user?.role || "instructor",
    },
    {
      enabled: isAuthenticated && user?.role === "instructor",
    }
  );

  const publishedCourses = publishedData?.courses || [];
  const draftCourses = draftData?.courses || [];

  // Helper function to render loading state
  const renderLoading = () => (
    <>
      {Array.from({ length: 6 }).map((_, idx) => (
        <CourseCardSkeleton key={idx} type="primary" />
      ))}
    </>
  );

  // Helper function to render error state
  const renderError = (error) => (
    <div className="col-span-full text-center py-10 text-red-500">
      <p className="text-lg font-semibold mb-2">Error loading courses</p>
      <p className="text-sm">{error?.message || "Failed to fetch courses. Please try again."}</p>
    </div>
  );

  // Helper function to render empty state
  const renderEmpty = (message) => (
    <div className="col-span-full">
      <NoData message={message} />
    </div>
  );

  const tabbuttons = [
    {
      name: "PUBLISH",
      content: (
        <>
          {isLoadingPublished ? (
            renderLoading()
          ) : publishedError ? (
            renderError(publishedError)
          ) : publishedCourses.length === 0 ? (
            renderEmpty("No published courses found.")
          ) : (
            <PublishContent courses={publishedCourses} />
          )}
        </>
      ),
    },
    {
      name: "DRAFT",
      content: (
        <>
          {isLoadingDraft ? (
            renderLoading()
          ) : draftError ? (
            renderError(draftError)
          ) : draftCourses.length === 0 ? (
            renderEmpty("No draft courses found.")
          ) : (
            <DraftContent courses={draftCourses} />
          )}
        </>
      ),
    },
  ];
  return (
    <div className="p-4 sm:p-6 lg:p-8 mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-2xl overflow-hidden">
      {/* heading */}
      <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
        <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
          Course Status
        </h2>
      </div>
      <div>
        <div className=" flex flex-wrap mb-10px lg:mb-50px rounded gap-10px">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-6">
                {content}
              </div>
            </TabContentWrapper>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardCoursesTab;
