import CourseGridMain from "@/components/layout/main/CourseGridMain";
import ThemeController from "@/components/shared/others/ThemeController";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Course Categories | Edurock - Education LMS Template",
  description: "Course Categories | Edurock - Education LMS Template",
};

const Course_Categories = async () => {
  return (
    <PageWrapper>
      <main>
        <CourseGridMain headerPath="course-categories" headerTitle="course-categories" showCategories={true} />
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default Course_Categories;

