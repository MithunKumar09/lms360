import { ArrowRight, Clock3, Star } from "lucide-react";
import Image from "next/image";

const courses = [
  {
    title: "Advanced Digital Marketing",
    image: "/courses/courses-1.png",
    price: "₹4,999",
    rating: "4.7",
    duration: "12 weeks",
    instructor: "James Anderson",
    role: "Marketing Lead • 12+ Yrs Exp",
    avatar: "/courses/instructor-1.jpg",
    tags: ["SEO", "Ads", "Analytics"],
  },
  {
    title: "Full Stack Web Development",
    image: "/courses/courses-2.png",
    price: "₹4,999",
    rating: "4.5",
    duration: "12 weeks",
    instructor: "Rahul Mehta",
    role: "Senior Developer • 10+ Yrs Exp",
    avatar: "/courses/instructor-2.jpg",
    tags: ["React", "Node", "MongoDB"],
  },
  {
    title: "Data Science Masterclass",
    image: "/courses/courses-3.png",
    price: "₹4,999",
    rating: "4.2",
    duration: "12 weeks",
    instructor: "Dr. Priya Sharma",
    role: "Full Stack Developer • 12+ Yrs Exp",
    avatar: "/courses/instructor-3.jpg",
    tags: ["Python", "ML", "Stats"],
  },
  {
    title: "UI/UX Design Bootcamp",
    image: "/courses/courses-4.jpg",
    price: "₹4,999",
    rating: "4.7",
    duration: "12 weeks",
    instructor: "Alex Chen",
    role: "Product Designer • 8+ Yrs Exp",
    avatar: "/courses/instructor-4.jpg",
    tags: ["SEO", "Ads", "Analytics"],
  },
];

export default function FeaturedCourses() {
  return (
    <section className="pt-0 py-24 bg-[#FCFCFF] dark:bg-darkdeep2 transition-colors duration-300">
      <div className="container mx-auto px-4 lg:px-8">
        {/* heading */}
        <div className="mb-14 text-center">
          <span className="mb-4 inline-flex rounded-full bg-purple-100 dark:bg-purple-500/15 px-4 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-300 transition-colors duration-300">
            Courses
          </span>

          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white transition-colors duration-300">
            Featured Courses
          </h2>
        </div>

        {/* cards */}
        <div className="grid gap-6 md:grid-cols-4">
          {courses.map((course) => (
            <div
              key={course.title}
              className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-darkdeep1 shadow-sm dark:shadow-[0_10px_35px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative h-44 w-full overflow-hidden">
                <Image
                  src={course.image}
                  alt={course.title}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="p-4">
                {/* title */}
                <h3 className="min-h-[20px] text-[14px] font-bold leading-5 text-gray-900 dark:text-white transition-colors duration-300">
                  {course.title}
                </h3>

                {/* instructor */}
                <div className="mt-4 flex items-center gap-3">
                  <Image
                    src={course.avatar}
                    alt={course.instructor}
                    width={28}
                    height={28}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-purple-100 dark:ring-purple-400/20"
                  />

                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                      {course.instructor}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-300 transition-colors duration-300">
                      {course.role}
                    </p>
                  </div>
                </div>

                {/* tags */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {course.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-purple-200 dark:border-purple-400/20 bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium text-purple-600 dark:text-purple-300 transition-colors duration-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* divider */}
                <div className="my-4 h-px bg-gray-100 dark:bg-white/10 transition-colors duration-300" />

                {/* rating row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
                    <span className="inline-flex items-center gap-1 font-semibold text-gray-900 dark:text-white">
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                      {course.rating}
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={14} />
                      {course.duration}
                    </span>
                  </div>

                  <span className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                    {course.price}
                  </span>
                </div>

                {/* CTA */}
                <button className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#7C1EE6_0%,#9333EA_55%,#EDE9FE_100%)] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(124,30,230,0.18)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_10px_30px_rgba(124,30,230,0.28)]">
                  Enroll Now
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}