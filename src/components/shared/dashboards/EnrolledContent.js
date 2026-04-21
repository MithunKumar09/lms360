import CourseCard from "../courses/CourseCard";

const EnrolledContent = ({ courses }) => {
  if (!Array.isArray(courses)) {
    return null;
  }
  return courses
    .filter(course => course && typeof course === 'object')
    .map((course, idx) => (
      <CourseCard key={course.id || idx} course={course} type={"primary"} />
    ));
};

export default EnrolledContent;
