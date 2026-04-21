import HeroPrimary from "@/components/sections/hero-banners/HeroPrimary";
import LessonPrimary from "@/components/sections/lessons/LessonPrimary";
import React from "react";

const LessonMain = ({ id, courseId, lessonId }) => {
  return (
    <>
      <HeroPrimary type={1} />
      <LessonPrimary 
        id={id} 
        courseId={courseId} 
        lessonId={lessonId}
      />
    </>
  );
};

export default LessonMain;
