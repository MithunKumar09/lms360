"use client";

import React from "react";

const QuizFilter = ({ filters = {}, onFilterChange, courses = [] }) => {
  // If no filters provided, render static version (for backward compatibility)
  if (!filters || !onFilterChange) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 md:gap-6">
        <div className="md:col-span-2 xl:col-start-1 xl:col-span-6 min-w-0">
          <p className="text-xs leading-1.8 tracking-[.5px] uppercase text-bodyColor dark:text-bodyColor-dark mb-6px font-semibold opacity-50">
            COURSES
          </p>
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-md relative">
            <select className="bg-transparent text-darkBlue dark:text-darkBlue-dark w-full p-13px focus:outline-none block appearance-none leading-1.5 relative z-20 focus:shadow-select rounded-md">
              <option defaultValue="All">All</option>
            </select>
            <i className="icofont-simple-down absolute top-1/2 right-3 -translate-y-1/2 block text-lg z-10"></i>
          </div>
        </div>
        <div className="md:col-span-1 xl:col-start-7 xl:col-span-3 min-w-0">
          <p className="text-xs leading-1.8 tracking-[.5px] uppercase text-bodyColor dark:text-bodyColor-dark mb-6px font-semibold opacity-50">
            SORT BY
          </p>
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-md relative">
            <select className="bg-transparent text-darkBlue dark:text-darkBlue-dark w-full p-13px focus:outline-none block appearance-none leading-1.5 relative z-20 focus:shadow-select rounded-md">
              <option defaultValue="Default">Default</option>
            </select>
            <i className="icofont-simple-down absolute top-1/2 right-3 -translate-y-1/2 block text-lg z-10"></i>
          </div>
        </div>
        <div className="md:col-span-1 xl:col-start-10 xl:col-span-3 min-w-0">
          <p className="text-xs leading-1.8 tracking-[.5px] uppercase text-bodyColor dark:text-bodyColor-dark mb-6px font-semibold opacity-50">
            STATUS
          </p>
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-md relative">
            <select className="bg-transparent text-darkBlue dark:text-darkBlue-dark w-full p-13px focus:outline-none block appearance-none leading-1.5 relative z-20 focus:shadow-select rounded-md">
              <option defaultValue="All">All</option>
            </select>
            <i className="icofont-simple-down absolute top-1/2 right-3 -translate-y-1/2 block text-lg z-10"></i>
          </div>
        </div>
      </div>
    );
  }

  const handleCourseChange = (e) => {
    const value = e.target.value === "all" ? null : e.target.value;
    onFilterChange({ courseId: value });
  };

  const handleStatusChange = (e) => {
    const value = e.target.value === "all" ? null : e.target.value;
    onFilterChange({ status: value });
  };

  const handleSortByChange = (e) => {
    onFilterChange({ sortBy: e.target.value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 md:gap-6">
      <div className="md:col-span-2 xl:col-start-1 xl:col-span-6 min-w-0">
        <p className="text-xs leading-1.8 tracking-[.5px] uppercase text-bodyColor dark:text-bodyColor-dark mb-6px font-semibold opacity-50">
          COURSES
        </p>
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-md relative">
          <select
            value={filters.courseId || "all"}
            onChange={handleCourseChange}
            className="bg-transparent text-darkBlue dark:text-darkBlue-dark w-full p-13px focus:outline-none block appearance-none leading-1.5 relative z-20 focus:shadow-select rounded-md"
          >
            <option value="all">All Courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <i className="icofont-simple-down absolute top-1/2 right-3 -translate-y-1/2 block text-lg z-10"></i>
        </div>
      </div>
      <div className="md:col-span-1 xl:col-start-7 xl:col-span-3 min-w-0">
        <p className="text-xs leading-1.8 tracking-[.5px] uppercase text-bodyColor dark:text-bodyColor-dark mb-6px font-semibold opacity-50">
          SORT BY
        </p>
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-md relative">
          <select
            value={filters.sortBy || "deadline"}
            onChange={handleSortByChange}
            className="bg-transparent text-darkBlue dark:text-darkBlue-dark w-full p-13px focus:outline-none block appearance-none leading-1.5 relative z-20 focus:shadow-select rounded-md"
          >
            <option value="deadline">Deadline</option>
            <option value="submitted_at">Submitted At</option>
            <option value="title">Title</option>
          </select>
          <i className="icofont-simple-down absolute top-1/2 right-3 -translate-y-1/2 block text-lg z-10"></i>
        </div>
      </div>
      <div className="md:col-span-1 xl:col-start-10 xl:col-span-3 min-w-0">
        <p className="text-xs leading-1.8 tracking-[.5px] uppercase text-bodyColor dark:text-bodyColor-dark mb-6px font-semibold opacity-50">
          STATUS
        </p>
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-md relative">
          <select
            value={filters.status || "all"}
            onChange={handleStatusChange}
            className="bg-transparent text-darkBlue dark:text-darkBlue-dark w-full p-13px focus:outline-none block appearance-none leading-1.5 relative z-20 focus:shadow-select rounded-md"
          >
            <option value="all">All</option>
            <option value="not_submitted">Not Submitted</option>
            <option value="submitted">Submitted</option>
            <option value="graded">Graded</option>
          </select>
          <i className="icofont-simple-down absolute top-1/2 right-3 -translate-y-1/2 block text-lg z-10"></i>
        </div>
      </div>
    </div>
  );
};

export default QuizFilter;
