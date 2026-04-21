'use client';

import ThemeController from "@/components/shared/others/ThemeController";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import LessonMain from "@/components/layout/main/LessonMain";
import CourseAccessGuard from "@/components/shared/guards/CourseAccessGuard";
import { useSearchParams } from "next/navigation";

export default function Lesson({ params }) {
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId');
  const lessonIdParam = searchParams.get('lessonId');
  
  // Use lessonId from query param if available, otherwise use id from route
  const lessonId = lessonIdParam || params?.id;

  return (
    <PageWrapper>
      <main>
        <CourseAccessGuard courseId={courseId}>
          <LessonMain 
            id={params?.id} 
            courseId={courseId} 
            lessonId={lessonId}
          />
          <ThemeController />
        </CourseAccessGuard>
      </main>
    </PageWrapper>
  );
}
