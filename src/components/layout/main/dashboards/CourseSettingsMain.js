/**
 * Course Settings Main Component
 * 
 * Main component with tabs for all course settings modules
 */

"use client";

import { useState } from "react";
import useTab from "@/hooks/useTab";
import TabButtonSecondary from "@/components/shared/buttons/TabButtonSecondary";
import TabContentWrapper from "@/components/shared/wrappers/TabContentWrapper";
import CategoryManager from "@/components/shared/course-settings/CategoryManager";
import SubCategoryManager from "@/components/shared/course-settings/SubCategoryManager";
import CourseTypeManager from "@/components/shared/course-settings/CourseTypeManager";
import ProgramTypeManager from "@/components/shared/course-settings/ProgramTypeManager";
import CourseLevelManager from "@/components/shared/course-settings/CourseLevelManager";
import CourseSkillManager from "@/components/shared/course-settings/CourseSkillManager";
import TestimonialManager from "@/components/shared/course-settings/TestimonialManager";

const CourseSettingsMain = () => {
  const { currentIdx, handleTabClick } = useTab();

  const tabbuttons = [
    {
      name: "CATEGORIES",
      content: <CategoryManager />,
    },
    {
      name: "SUBCATEGORIES",
      content: <SubCategoryManager />,
    },
    {
      name: "COURSE TYPES",
      content: <CourseTypeManager />,
    },
    {
      name: "PROGRAM TYPES",
      content: <ProgramTypeManager />,
    },
    {
      name: "COURSE LEVELS",
      content: <CourseLevelManager />,
    },
    {
      name: "COURSE SKILLS",
      content: <CourseSkillManager />,
    },
    {
      name: "TESTIMONIALS",
      content: <TestimonialManager />,
    },
  ];

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      {/* Heading */}
      <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
        <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
          Course Settings
        </h2>
        <p className="text-sm text-contentColor dark:text-contentColor-dark mt-2">
          Manage course categories, types, levels, and other settings
        </p>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex flex-wrap mb-10px lg:mb-50px rounded gap-10px">
          {tabbuttons?.map(({ name }, idx) => (
            <TabButtonSecondary
              key={idx}
              name={name}
              currentIdx={currentIdx}
              idx={idx}
              handleTabClick={handleTabClick}
              button={"small"}
            />
          ))}
        </div>
        <div>
          {tabbuttons?.map(({ content }, idx) => (
            <TabContentWrapper
              key={idx}
              isShow={currentIdx === idx ? true : false}
            >
              {content}
            </TabContentWrapper>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseSettingsMain;

