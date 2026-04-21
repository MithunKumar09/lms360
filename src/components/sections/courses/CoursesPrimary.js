"use client";
import { useSearchParams, useRouter } from "next/navigation";
import TabButtonSecondary from "@/components/shared/buttons/TabButtonSecondary";
import CoursesGrid from "@/components/shared/courses/CoursesGrid";
import CoursesList from "@/components/shared/courses/CoursesList";
import AdvancedPagination from "@/components/shared/courses/AdvancedPagination";
import TabContentWrapper from "@/components/shared/wrappers/TabContentWrapper";
import useTab from "@/hooks/useTab";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import NoData from "@/components/shared/others/NoData";
import { useCoursesList, useCourseFilters } from "@/hooks/api/useCoursesList";
import { useAuthStore } from "@/store/index.js";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import CourseCardSkeleton from "@/components/shared/courses/CourseCardSkeleton";
import CourseListCardSkeleton from "@/components/shared/courses/CourseListCardSkeleton";
import CourseSearchSuggestions from "@/components/shared/courses/CourseSearchSuggestions";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useBulkEnrollmentStatus } from "@/hooks/api/useEnrollment";

const sortInputs = [
  "Sort by New",
  "Title Ascending",
  "Title Descending",
  "Price Ascending",
  "Price Descending",
];

// Map sort input to API sortBy value
const mapSortToAPI = (sortInput) => {
  switch (sortInput) {
    case "Sort by New":
      return "newest";
    case "Title Ascending":
      return "title_asc";
    case "Title Descending":
      return "title_desc";
    case "Price Ascending":
      return "price_asc";
    case "Price Descending":
      return "price_desc";
    default:
      return "newest";
  }
};

const CoursesPrimary = ({ isNotSidebar, isList, card }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const user = useAuthStore((state) => state.user);
  const isSuperadmin = user?.role === "superadmin";

  // Filter states
  const [currentCategories, setCurrentCategories] = useState([]);
  const [currentTags, setCurrentTags] = useState([]);
  const [currentSkillLevel, setCurrentSkillLevel] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(null); // For superadmin
  const [sortInput, setSortInput] = useState("Sort by New");
  const [searchString, setSearchString] = useState("");
  const [isBlock, setIsBlog] = useState(false);
  const [searchCourses, setSearchCourses] = useState([]);
  const [isSearch, setIsSearch] = useState(false);

  // Pagination states - initialize from URL params only once on mount
  const [currentPage, setCurrentPage] = useState(() => {
    const urlPageParam = searchParams.get('page');
    return urlPageParam ? Math.max(0, parseInt(urlPageParam, 10) - 1) : 0; // Convert 1-based URL to 0-based
  });
  const [limit, setLimit] = useState(() => {
    const urlLimitParam = searchParams.get('limit');
    return urlLimitParam ? parseInt(urlLimitParam, 10) : 12;
  });

  // Sync URL params to state only when URL actually changes (using ref to prevent loops)
  const prevUrlParamsRef = useRef({ page: null, limit: null });
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    const urlPageParam = searchParams.get('page');
    const urlLimitParam = searchParams.get('limit');
    
    // Skip on initial mount (already handled by useState initializer)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevUrlParamsRef.current = { page: urlPageParam, limit: urlLimitParam };
      return;
    }
    
    // Only sync if URL params actually changed (external navigation like back/forward)
    if (prevUrlParamsRef.current.page !== urlPageParam || prevUrlParamsRef.current.limit !== urlLimitParam) {
      prevUrlParamsRef.current = { page: urlPageParam, limit: urlLimitParam };
      
      const urlPage = urlPageParam ? Math.max(0, parseInt(urlPageParam, 10) - 1) : 0;
      const urlLimit = urlLimitParam ? parseInt(urlLimitParam, 10) : 12;
      
      setCurrentPage(urlPage);
      setLimit(urlLimit);
    }
  }, [searchParams]); // Only depend on searchParams

  // Refs
  const coursesRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Recent searches hook
  const { addRecentSearch } = useRecentSearches();

  // Tab state
  const { currentIdx, setCurrentIdx, handleTabClick } = useTab();

  // Fetch filter options
  const { categories, skills, organizations, courseLevels, isLoading: isLoadingFilters } = useCourseFilters({
    enabled: true,
  });

  // Build base filters for count calculation (without category/org filters)
  // Only fetch first 500 courses for count calculation to optimize performance
  const baseFiltersForCounts = useMemo(() => {
    const filters = {
      page: 1,
      limit: 500, // Optimized: Get enough courses for accurate counts without overwhelming
      sortBy: "newest",
    };
    // Only include role-based filters, not category/org filters
    return filters;
  }, []);

  // Fetch courses for filter count calculation (optimized query)
  const {
    data: allCoursesData,
    isLoading: isLoadingCounts,
  } = useCoursesList(baseFiltersForCounts, {
    enabled: !isLoadingFilters, // Wait for filter options to load first
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (counts don't change often)
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false, // Don't refetch counts on focus
  });

  // Memoize courses array to prevent unnecessary re-renders
  const allCoursesForCounts = useMemo(() => {
    return allCoursesData?.courses || [];
  }, [allCoursesData]);

  // Build filters for API
  const apiFilters = useMemo(() => {
    const filters = {
      page: currentPage + 1, // API uses 1-based indexing
      limit: limit,
      sortBy: mapSortToAPI(sortInput),
    };

    // Add search
    if (searchString && !isSearch) {
      filters.search = searchString;
    }

    // Add category filter from URL (priority - overrides other category filters)
    // This ensures only courses from the specified category are shown
    if (category) {
      // Decode and normalize category name for exact matching
      const decodedCategory = decodeURIComponent(category).trim();
      const categoryObj = categories.find(
        (c) => c.name.toLowerCase() === decodedCategory.toLowerCase()
      );
      if (categoryObj) {
        // Override any other category filters - only show this category
        filters.categoryIds = [categoryObj.id];
      }
    } else if (currentCategories.length > 0) {
      // Only apply currentCategories if no URL category is specified
      // Map category names to IDs
      const categoryIds = currentCategories
        .map((catName) => {
          const category = categories.find((c) => c.name === catName);
          return category?.id;
        })
        .filter(Boolean);
      if (categoryIds.length > 0) {
        filters.categoryIds = categoryIds;
      }
    }

    // Add organization filter (superadmin only)
    // Note: When filtering by category, we still respect organization boundaries
    if (isSuperadmin && selectedOrganizationId) {
      filters.organizationId = selectedOrganizationId;
    }

    // Add tag filter (if implemented)
    if (currentTags.length > 0) {
      filters.tag = currentTags[0]; // API might support single tag
    }

    // Add level filter
    if (currentSkillLevel.length > 0 && !currentSkillLevel.includes("All")) {
      const level = currentSkillLevel[0];
      const levelObj = courseLevels.find((l) => l.name === level);
      if (levelObj) {
        filters.level = levelObj.id;
      }
    }

    return filters;
  }, [
    currentPage,
    limit,
    sortInput,
    searchString,
    isSearch,
    currentCategories,
    currentTags,
    currentSkillLevel,
    selectedOrganizationId,
    isSuperadmin,
    categories,
    courseLevels,
    category,
  ]);

  // Fetch courses from API
  const {
    data: coursesData,
    isLoading: isLoadingCourses,
    error: coursesError,
    refetch,
  } = useCoursesList(apiFilters, {
    enabled: true,
  });

  const courses = coursesData?.courses || [];
  const pagination = coursesData?.pagination || {};
  const totalCourses = pagination.totalItems || courses.length;
  const totalPages = pagination.totalPages || Math.ceil(totalCourses / limit);

  // Client-side pagination for current page display
  const currentCourses = useMemo(() => {
    if (!courses || courses.length === 0) return null;
    // Since API handles pagination, we just use the courses directly
    return courses;
  }, [courses]);

  // Bulk enrollment status check for all courses in currentCourses
  const courseIds = useMemo(() => {
    return currentCourses?.map(c => c.id).filter(Boolean) || [];
  }, [currentCourses]);

  // Use existing user from line 52, get userRole and check if student
  const userRole = user?.role || null;
  const allowedRoles = ['student', 'alumni'];
  const isStudent = allowedRoles.includes(userRole);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data: bulkEnrollmentData } = useBulkEnrollmentStatus(courseIds, {
    enabled: isStudent && isAuthenticated && courseIds.length > 0,
  });

  const enrollmentStatusMap = bulkEnrollmentData?.enrollmentStatus || {};

  // Handle pagination - updated for advanced pagination (memoized)
  const handlePagination = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  // Handle page size change (memoized)
  const handlePageSizeChange = useCallback((newLimit) => {
    setLimit(newLimit);
    setCurrentPage(0); // Reset to first page when changing page size
  }, []);

  // Reset to first page when filters change (but not when page is already 0)
  useEffect(() => {
    if (currentPage !== 0) {
      setCurrentPage(0);
    }
  }, [currentCategories, currentTags, currentSkillLevel, selectedOrganizationId, sortInput, searchString, currentPage]);

  // Handle filters
  const getCurrentFilterInputs = (input, ps) => {
    return input === "All" && !ps.includes("All")
      ? ["All"]
      : ![...ps]?.includes(input)
      ? [...ps.filter((pInput) => pInput !== "All"), input]
      : [...ps?.filter((pInput) => pInput !== input && pInput !== "All")];
  };

  // Memoize filter handler to prevent unnecessary re-renders
  const handleFilters = useCallback((name, input) => {
    setIsSearch(false);
    setSearchString("");
    switch (name) {
      case "Categories":
        return setCurrentCategories((ps) => getCurrentFilterInputs(input, ps));
      case "Tag":
        return setCurrentTags((ps) => getCurrentFilterInputs(input, ps));
      case "Skill Level":
        return setCurrentSkillLevel((ps) => getCurrentFilterInputs(input, ps));
      case "Organization":
        return setSelectedOrganizationId(input === "All" ? null : input);
    }
  }, []);

  // Handle search input with debouncing
  const handleSearchProducts = (e) => {
    setIsBlog(true);
    const value = e.target.value;
    setSearchString(value);
    
    // Clear filters when searching
    if (value.length > 0) {
      setCurrentCategories([]);
      setCurrentTags([]);
      setCurrentSkillLevel([]);
    }
  };

  // Advanced search with debouncing (300ms delay)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchString && searchString.length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        // Search from all available courses for better suggestions
        const searchText = new RegExp(escapeRegExp(searchString), "i");
        const suggestions = allCoursesForCounts
          ?.filter((course) => {
            // Search in title, category, tags, etc.
            return (
              searchText.test(course.title || "") ||
              searchText.test(course.categoryName || "") ||
              searchText.test(course.tag || "") ||
              searchText.test(course.instructors?.[0]?.name || "")
            );
          })
          .slice(0, 5) || [];
        setSearchCourses(suggestions);
      }, 300); // 300ms debounce
    } else {
      setSearchCourses([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchString, allCoursesForCounts.length]); // Use length instead of array reference to prevent infinite loops

  // Escape regex special characters
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchString.trim()) {
      addRecentSearch(searchString.trim());
      setIsSearch(true);
      setIsBlog(false);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion) => {
    if (typeof suggestion === 'string') {
      // Selected from recent/popular searches
      setSearchString(suggestion);
      addRecentSearch(suggestion);
      setIsSearch(true);
      setIsBlog(false);
    } else {
      // Selected a course
      // Navigate to course details page
      window.location.href = `/course-details-3?courseId=${suggestion.id}`;
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchString("");
    setSearchCourses([]);
    setIsBlog(false);
    setIsSearch(false);
    searchInputRef.current?.focus();
  };

  // Handle click outside search container
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsBlog(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Tab buttons
  const tapButtons = [
    {
      name: <i className="icofont-layout"></i>,
      content: (
        <CoursesGrid 
          isNotSidebar={isNotSidebar} 
          courses={currentCourses}
          enrollmentStatusMap={enrollmentStatusMap}
        />
      ),
    },
    {
      name: <i className="icofont-listine-dots"></i>,
      content: (
        <CoursesList
          isNotSidebar={isNotSidebar}
          isList={isList}
          courses={currentCourses}
          card={card}
          enrollmentStatusMap={enrollmentStatusMap}
        />
      ),
    },
  ];

  useEffect(() => {
    if (isList) {
      setCurrentIdx(1);
    }
  }, [isList, setCurrentIdx]);

  // Calculate filter counts from ALL courses (without current filters)
  // This gives accurate counts for each filter option
  const filterCounts = useMemo(() => {
    if (!allCoursesForCounts || allCoursesForCounts.length === 0) {
      return {
        categories: {},
        organizations: {},
        tags: {},
        levels: {},
      };
    }

    const counts = {
      categories: {},
      organizations: {},
      tags: {},
      levels: {},
    };

    // Count courses by each filter type from all available courses
    allCoursesForCounts.forEach((course) => {
      // Count by category (prefer categoryName, fallback to categoryId lookup)
      const categoryName = course.categoryName || (() => {
        if (course.categoryId) {
          const category = categories.find((c) => c.id === course.categoryId);
          return category?.name;
        }
        return null;
      })();
      if (categoryName) {
        counts.categories[categoryName] = (counts.categories[categoryName] || 0) + 1;
      }

      // Count by organization (prefer organizationName, fallback to organizationId)
      const orgKey = course.organizationName || (() => {
        if (course.organizationId) {
          const org = organizations.find((o) => o.id === course.organizationId);
          return org?.id || course.organizationId;
        }
        return null;
      })();
      if (orgKey) {
        counts.organizations[orgKey] = (counts.organizations[orgKey] || 0) + 1;
        // Also store by organization ID for lookup
        if (course.organizationId) {
          counts.organizations[course.organizationId] = (counts.organizations[course.organizationId] || 0) + 1;
        }
      }

      // Count by tag (if available in course data)
      if (course.tag) {
        counts.tags[course.tag] = (counts.tags[course.tag] || 0) + 1;
      }

      // Count by level (prefer levelName, fallback to levelId lookup)
      const levelName = course.levelName || (() => {
        if (course.levelId) {
          const level = courseLevels.find((l) => l.id === course.levelId);
          return level?.name;
        }
        return null;
      })();
      if (levelName) {
        counts.levels[levelName] = (counts.levels[levelName] || 0) + 1;
      }
    });

    return counts;
  }, [allCoursesForCounts, categories, courseLevels]);

  // Use skills from database instead of extracting from courses
  const skillInputs = useMemo(() => {
    if (!skills || skills.length === 0) return [];
    return skills.map((skill) => ({
      name: skill.name,
      id: skill.id,
      totalCount: filterCounts.tags[skill.name] || 0,
    }));
  }, [skills, filterCounts]);

  // Prepare filter inputs from API data with counts
  const filterInputs = useMemo(() => {
    const categoryInputs = categories.map((cat) => ({
      name: cat.name,
      id: cat.id,
      totalCount: filterCounts.categories[cat.name] || 0,
    }));

    const levelInputs = ["All", ...courseLevels.map((level) => level.name)];

    // Use skills from database, show "Not Available" if no skills found
    const tagInputs = skillInputs.length > 0 
      ? skillInputs.map(skill => skill.name)
      : (isLoadingFilters ? [] : ["Not Available"]);

    const organizationInputs = isSuperadmin
      ? [
          { name: "All", id: "All", totalCount: allCoursesForCounts.length || 0 },
          ...organizations.map((org) => ({
            name: org.name,
            id: org.id,
            totalCount: filterCounts.organizations[org.id] || filterCounts.organizations[org.name] || 0,
          })),
        ]
      : [];

    return [
      {
        name: "Categories",
        inputs: categoryInputs,
      },
      {
        name: "Tag",
        inputs: tagInputs,
      },
      {
        name: "Skill Level",
        inputs: levelInputs,
      },
      ...(isSuperadmin && organizationInputs.length > 1
        ? [
            {
              name: "Organization",
              inputs: organizationInputs,
            },
          ]
        : []),
    ];
  }, [categories, skills, courseLevels, organizations, isSuperadmin, filterCounts, skillInputs, allCoursesForCounts.length]);

  // Removed paginationItems - not needed with AdvancedPagination

  // Calculate showing range
  const showingFrom = currentPage * limit + 1;
  const showingTo = Math.min((currentPage + 1) * limit, totalCourses);

  // Loading state with enhanced skeletons
  if (isLoadingCourses || isLoadingFilters) {
    return (
      <div className="container tab py-10 md:py-50px lg:py-60px 2xl:py-100px">
        {currentIdx === 0 ? (
          // Grid view skeletons
          <CoursesGrid
            courses={Array.from({ length: limit || 12 }).map((_, idx) => ({ id: `skeleton-${idx}` }))}
            isNotSidebar={isNotSidebar}
          />
        ) : (
          // List view skeletons
          <div className="flex flex-col gap-y-30px">
            {Array.from({ length: limit || 12 }).map((_, idx) => (
              <CourseListCardSkeleton key={idx} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (coursesError) {
    return (
      <div className="container tab py-10 md:py-50px lg:py-60px 2xl:py-100px">
        <NoData message="Error loading courses. Please try again." />
      </div>
    );
  }

  return (
    <div>
      <div
        className="container tab py-10 md:py-50px lg:py-60px 2xl:py-100px"
        ref={coursesRef}
      >
        {/* courses header  */}
        <div
          className="courses-header flex justify-between items-center flex-wrap px-13px py-5px border border-borderColor dark:border-borderColor-dark mb-30px gap-y-5"
          data-aos="fade-up"
        >
          <div>
            {currentCourses ? (
              <p className="text-blackColor dark:text-blackColor-dark">
                Showing {showingFrom} - {showingTo} of {totalCourses} Results
              </p>
            ) : (
              ""
            )}
          </div>
          <div className="flex items-center">
            <div className="tab-links transition-all duraton-300 text-contentColor dark:text-contentColor-dark flex gap-11px">
              {tapButtons?.map(({ name, content }, idx) => (
                <TabButtonSecondary
                  key={idx}
                  name={name}
                  button={"icon"}
                  currentIdx={currentIdx}
                  handleTabClick={handleTabClick}
                  idx={idx}
                />
              ))}
            </div>
            <div className="pl-50px sm:pl-20 pr-10px">
              <select
                className="text-blackColor bg-whiteColor py-2 pr-2 pl-3 rounded-md outline-none border-4 border-transparent focus:border-blue-light box-border"
                onChange={(e) => setSortInput(e.target.value)}
                value={sortInput}
              >
                {sortInputs.map((input, idx) => (
                  <option key={idx} value={input}>
                    {input}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div
          className={`grid grid-cols-1 ${
            isNotSidebar || category ? "" : "md:grid-cols-12"
          } gap-30px`}
        >
          {/* courses sidebar  */}
          {isNotSidebar ? (
            ""
          ) : !category ? (
            <div className="md:col-start-1 md:col-span-4 lg:col-span-3">
              <div className="flex flex-col ">
                {/* search input  */}
                <div
                  className="pt-30px pr-15px pl-10px pb-23px 2xl:pt-10 2xl:pr-25px 2xl:pl-5 2xl:pb-33px mb-30px border border-borderColor dark:border-borderColor-dark "
                  data-aos="fade-up"
                >
                  <h4 className="text-size-22 text-blackColor dark:text-blackColor-dark font-bold leading-30px mb-25px">
                    Search here
                  </h4>
                  <div ref={searchContainerRef} className="relative">
                    <form
                      onSubmit={handleSearchSubmit}
                      className="w-full px-4 py-10px text-sm text-blackColor dark:text-blackColor-dark bg-placeholder bg-opacity-5 dark:bg-lightGrey10-dark flex justify-center items-center leading-26px dark:border dark:border-whiteColor relative"
                    >
                      <input
                        ref={searchInputRef}
                        onChange={handleSearchProducts}
                        onFocus={() => {
                          if (searchString || searchCourses.length > 0) {
                            setIsBlog(true);
                          }
                        }}
                        type="text"
                        value={searchString}
                        placeholder="Search Courses"
                        className="placeholder:text-placeholder dark:placeholder:text-[rgb(183, 183, 183)] bg-transparent focus:outline-none placeholder:opacity-80 w-full placeholder:font-medium pr-8"
                      />
                      {searchString && (
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          className="absolute right-12 text-contentColor hover:text-primaryColor dark:text-contentColor-dark dark:hover:text-primaryColor transition-colors"
                          aria-label="Clear search"
                        >
                          <i className="icofont-close text-base"></i>
                        </button>
                      )}
                      <button type="submit" className="ml-2">
                        <i className="icofont-search-1 text-base"></i>
                      </button>
                    </form>
                    
                    {/* Advanced Search Suggestions Component */}
                    <CourseSearchSuggestions
                      searchTerm={searchString}
                      suggestions={searchCourses}
                      isVisible={isBlock}
                      onSelectSuggestion={handleSelectSuggestion}
                      onClose={() => setIsBlog(false)}
                    />
                  </div>
                </div>
                {/* filters  */}
                {filterInputs?.map(({ name, inputs }, idx) => (
                  <div
                    key={idx}
                    className="pt-30px pr-15px pl-10px pb-23px 2xl:pt-10 2xl:pr-25px 2xl:pl-5 2xl:pb-33px mb-30px border border-borderColor dark:border-borderColor-dark"
                    data-aos="fade-up"
                  >
                    <h4 className="text-size-22 text-blackColor dark:text-blackColor-dark font-bold leading-30px mb-15px">
                      {name}
                    </h4>
                    <ul
                      className={`flex flex-col  ${
                        name === "Categories"
                          ? "gap-y-4"
                          : name === "Tag"
                          ? "gap-y-23px"
                          : "gap-y-10px"
                      }`}
                    >
                      {name === "Categories"
                        ? inputs?.map(({ name: name2, totalCount }, idx1) => (
                            <li key={idx1}>
                              {" "}
                              <button
                                onClick={() => handleFilters(name, name2)}
                                className={`${
                                  currentCategories.includes(name2)
                                    ? "bg-primaryColor text-contentColor-dark "
                                    : "text-contentColor  dark:text-contentColor-dark hover:text-contentColor-dark hover:bg-primaryColor "
                                } text-sm font-medium px-13px py-2 border border-borderColor dark:border-borderColor-dark flex justify-between leading-7 transition-all duration-300 w-full`}
                              >
                                <span>
                                  {name2?.length > 18
                                    ? name2.slice(0, 12) + "."
                                    : name2}
                                </span>{" "}
                                <span>
                                  {totalCount < 10 ? `0${totalCount}` : totalCount}
                                </span>
                              </button>
                            </li>
                          ))
                        : name === "Tag"
                        ? inputs?.length > 0 && inputs[0] === "Not Available"
                          ? (
                              <li className="text-contentColor dark:text-contentColor-dark text-size-15 font-medium leading-26px">
                                <span className="opacity-60">Not Available</span>
                              </li>
                            )
                          : inputs?.map((input, idx1) => {
                            const tagCount = filterCounts.tags[input] || 0;
                            return (
                              <li
                                key={idx + input}
                                className={`${
                                  currentTags.includes(input)
                                    ? "text-primaryColor"
                                    : "text-contentColor hover:text-primaryColor dark:hover:text-primaryColor  dark:text-contentColor-dark"
                                }  text-size-15 font-medium  flex justify-between leading-26px group`}
                              >
                                <button
                                  onClick={() => handleFilters(name, input)}
                                  className="w-full flex items-center gap-11px justify-between"
                                  disabled={input === "Not Available"}
                                >
                                  <div className="flex items-center gap-11px">
                                    <span
                                      className={`w-14px h-15px border  ${
                                        currentTags.includes(input)
                                          ? "bg-primaryColor border-primaryColor"
                                          : "border-darkdeep6  group-hover:bg-primaryColor group-hover:border-primaryColor"
                                      }  `}
                                    ></span>
                                    <span>{input}</span>
                                  </div>
                                  {tagCount > 0 && (
                                    <span className="text-xs text-contentColor dark:text-contentColor-dark">
                                      ({tagCount})
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })
                        : name === "Organization"
                        ? inputs?.map(({ name: name2, id: orgId, totalCount }, idx1) => (
                            <li key={idx1}>
                              <button
                                onClick={() => handleFilters(name, orgId)}
                                className={`${
                                  (orgId === "All" && !selectedOrganizationId) ||
                                  selectedOrganizationId === orgId
                                    ? "bg-primaryColor text-contentColor-dark "
                                    : "text-contentColor  dark:text-contentColor-dark hover:text-contentColor-dark hover:bg-primaryColor "
                                } text-sm font-medium px-13px py-2 border border-borderColor dark:border-borderColor-dark flex justify-between leading-7 transition-all duration-300 w-full`}
                              >
                                <span>
                                  {name2?.length > 18
                                    ? name2.slice(0, 12) + "."
                                    : name2}
                                </span>
                                {totalCount !== undefined && (
                                  <span>
                                    {totalCount < 10 ? `0${totalCount}` : totalCount}
                                  </span>
                                )}
                              </button>
                            </li>
                          ))
                        : inputs?.map((input, idx1) => (
                            <li
                              key={idx1 + input}
                              className={`${
                                currentSkillLevel.includes(input)
                                  ? "text-primaryColor "
                                  : "text-contentColor dark:text-contentColor-dark  hover:text-primaryColor dark:hover:text-primaryColor "
                              } text-size-15 font-medium leading-26px`}
                            >
                              <button
                                onClick={() => handleFilters(name, input)}
                                className="w-full text-start "
                              >
                                {input}
                              </button>
                            </li>
                          ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            ""
          )}
          {/* courses main  */}
          <div
            className={`${
              isNotSidebar || category
                ? ""
                : "md:col-start-5 md:col-span-8 lg:col-start-4 lg:col-span-9"
            } space-y-[30px]`}
          >
            {currentCourses && currentCourses.length > 0 ? (
              <>
                <div className="tab-contents">
                  {tapButtons?.map(({ content }, idx) => (
                    <TabContentWrapper
                      key={idx}
                      isShow={idx === currentIdx ? true : false}
                    >
                      {content}
                    </TabContentWrapper>
                  ))}
                </div>

                {/* Advanced Pagination */}
                {totalCourses > 0 && totalPages > 1 && (
                  <AdvancedPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalCourses}
                    limit={limit}
                    pageSizes={[12, 24, 48, 96]}
                    onPageChange={handlePagination}
                    onPageSizeChange={handlePageSizeChange}
                    scrollToRef={coursesRef}
                    showPageSizeSelector={true}
                    showResultsCount={true}
                    updateUrlParams={true}
                  />
                )}
              </>
            ) : (
              <NoData message={"No Course"} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursesPrimary;
