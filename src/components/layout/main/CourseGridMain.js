import CoursesPrimary from "@/components/sections/courses/CoursesPrimary";
import CategoriesPrimary from "@/components/sections/categories/CategoriesPrimary";
import HeroPrimary from "@/components/sections/hero-banners/HeroPrimary";

const CourseGridMain = ({ headerPath, headerTitle, showCategories = false }) => {
  // Default to "course-categories" if not provided (for backward compatibility)
  const path = headerPath || "course-categories";
  const title = headerTitle || "course-categories";
  
  // If showCategories is true or path/title indicates categories page, show categories
  const isCategoriesPage = showCategories || path === "course-categories" || title === "course-categories";
  
  return (
    <>
      <HeroPrimary path={path} title={title} />
      {isCategoriesPage ? (
        <CategoriesPrimary />
      ) : (
        <CoursesPrimary isNotSidebar={true} />
      )}
    </>
  );
};

export default CourseGridMain;
