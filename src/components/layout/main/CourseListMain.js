"use client";
import { useSearchParams } from "next/navigation";
import CoursesPrimary from "@/components/sections/courses/CoursesPrimary";
import HeroPrimary from "@/components/sections/hero-banners/HeroPrimary";

const CourseListMain = () => {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  
  // If category is provided, use it as the title, otherwise use default
  const headerTitle = category ? category : "Courses List";
  const headerPath = category ? category : "Courses List";

  return (
    <>
      <HeroPrimary path={headerPath} title={headerTitle} />
      <CoursesPrimary isNotSidebar={true} isList={true} />
    </>
  );
};

export default CourseListMain;
