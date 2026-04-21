//components/layout/main/dashboards/UnifiedCoursesPlaceholderMain.js
const courses = [
  {
    title: "Advanced Digital Marketing",
    author: "Jemmy Anderson",
    role: "Marketing Lead • 12+ Yrs Exp",
    image: "/courses/courses-1.png",
    avatar: "/courses/instructors/instructor-1.jpg",
    tags: ["SEO", "Ads", "Analytics"],
    rating: "4.7",
    duration: "12 weeks",
    price: "₹4,999",
  },
  {
    title: "Full Stack Web Development",
    author: "Rahul Mehta",
    role: "Marketing Lead • 12+ Yrs Exp",
    image: "/courses/courses-2.png",
    avatar: "/courses/instructors/instructor-2.jpg",
    tags: ["React", "Node", "MongoDB"],
    rating: "4.5",
    duration: "12 weeks",
    price: "₹4,999",
  },
  {
    title: "Data Science Masterclass",
    author: "Dr. Priya Sharma",
    role: "Marketing Lead • 12+ Yrs Exp",
    image: "/courses/courses-3.png",
    avatar: "/courses/instructors/instructor-3.jpg",
    tags: ["Python", "ML", "Stats"],
    rating: "4.2",
    duration: "12 weeks",
    price: "₹4,999",
  },
  {
    title: "UI/UX Design Bootcamp",
    author: "Alex Chen",
    role: "Marketing Lead • 12+ Yrs Exp",
    image: "/courses/courses-5.jpg",
    avatar: "/courses/instructors/instructor-4.jpg",
    tags: ["Figma", "UI", "Analytics"],
    rating: "4.7",
    duration: "12 weeks",
    price: "₹4,999",
  },
];

const sections = [
  "Trending Courses",
  "Beginner Friendly",
  "Recommended Courses",
  "Career Paths",
];

function CourseCard({ course }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[#E7E4EF] dark:border-white/10 bg-white dark:bg-darkdeep1 shadow-[0_1px_3px_rgba(16,24,40,0.06)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition-all duration-300">
      <img
        src={course.image}
        alt={course.title}
        className="h-[140px] w-full object-cover"
      />
      <div className="p-3">
        <h3 className="line-clamp-1 text-[13px] font-semibold text-[#1F172A] dark:text-white transition-colors duration-300">
          {course.title}
        </h3>
        <div className="mt-2 flex items-center gap-2">
  <img
    src={course.avatar}
    alt={course.author}
    className="h-7 w-7 rounded-full border border-[#7C3AED]/30 object-cover"
  />
  <div>
    <p className="text-[11px] font-medium leading-none text-[#111827] dark:text-white transition-colors duration-300">
      {course.author}
    </p>
    <p className="mt-1 text-[9px] text-[#7C748D] dark:text-gray-300 transition-colors duration-300">
      {course.role}
    </p>
  </div>
</div>

        <div className="mt-2 flex flex-wrap gap-1">
          {course.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#F3E8FF] dark:bg-purple-500/10 px-2 py-[2px] text-[9px] font-medium text-[#7C3AED] dark:text-purple-300 transition-colors duration-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-3 border-t border-[#ECE8F3] dark:border-white/10 transition-colors duration-300" />

<div className="mt-3 flex items-center justify-between text-[11px]">
  <div className="flex items-center gap-12 text-[#6B7280] dark:text-gray-300 transition-colors duration-300">
    <span className="flex items-center gap-1">
      ⭐
      <span>{course.rating}</span>
    </span>

    <span className="flex items-center gap-1">
      <svg
        className="h-3.5 w-3.5 text-[#6B7280]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span>{course.duration}</span>
    </span>
  </div>

  <span className="font-bold text-[#111827] dark:text-white transition-colors duration-300">{course.price}</span>
</div>

<button className="mt-2 h-10 w-full rounded-[12px] bg-gradient-to-r from-[#7C00F5] via-[#6D28D9] to-[#4F46E5] text-[12px] font-semibold text-white shadow-sm transition hover:opacity-95">
  Enroll Now
</button>
      </div>
    </div>
  );
}

function PricingCard({ title, price, active = false }) {
  return (
    <div
      className={`rounded-[20px] border bg-white dark:bg-darkdeep1 p-6 text-center shadow-sm dark:shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition-all duration-300 ${
        active
          ? "border-[#7C3AED] shadow-[0_8px_30px_rgba(124,58,237,0.15)]"
          : "border-[#E5E7EB]"
      }`}
    >
      {active && (
        <span className="mb-3 inline-block rounded-full bg-[#EDE9FE] px-3 py-1 text-[10px] font-semibold text-[#7C3AED]">
          Most Popular
        </span>
      )}
      <h3 className="text-[28px] font-bold text-[#111827] dark:text-white transition-colors duration-300">{title}</h3>
      <p className="mt-2 text-[30px] font-bold text-[#111827] dark:text-white transition-colors duration-300">{price}</p>
      <p className="text-sm text-[#6B7280] dark:text-gray-300 transition-colors duration-300">/month</p>
      <ul className="mt-5 space-y-2 text-left text-sm text-[#6B7280] dark:text-gray-300 transition-colors duration-300">
        <li>✓ All Courses</li>
        <li>✓ 1-on-1 Mentorship</li>
        <li>✓ Career Guidance</li>
        <li>✓ Priority Support</li>
      </ul>
      <button
        className={`mt-6 h-11 w-full rounded-xl text-sm font-semibold ${
          active
            ? "bg-[#6D28D9] text-white"
            : "border border-[#C4B5FD] text-[#6D28D9]"
        }`}
      >
        Get Started
      </button>
    </div>
  );
}

export default function UnifiedCoursesPlaceholderMain() {
  return (
    <main className="min-h-screen bg-[#F3F1F8] dark:bg-darkdeep2 px-8 py-8 xl:px-12 transition-colors duration-300">
      <div className="mx-auto max-w-[1220px]">
        {/* Hero Banner */}
        <section className="relative overflow-hidden rounded-[22px] shadow-sm">
          <img
            src="/herobanner/hero.jpg"
            alt="Product Manager"
            className="h-[338px] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent backdrop-blur-[1px]" />
          <div className="absolute left-8 top-3/4 max-w-[400px] -translate-y-1/2 text-white">
            <h1 className="text-[36px] font-bold leading-[1.05]">Product Manager</h1>
            <p className="mt-2 text-[14px] leading-6 text-white/90">
              Lead product strategy and cross-functional teams to deliver impactful solutions.
            </p>
            <button className="mt-5 rounded-[12px] bg-white px-5 py-[11px] text-[12px] font-semibold text-[#111827] shadow-sm">
              Explore now →
            </button>
          </div>
        </section>

<section className="mt-2 rounded-[18px] bg-white dark:bg-darkdeep1 px-6 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition-all duration-300">
  <div className="flex w-full items-center gap-4">
    
    {/* Search Group */}
    <div className="flex h-[42px] flex-1 overflow-hidden rounded-full border border-[#D9D4E5] dark:border-white/10 bg-white dark:bg-darkdeep1 text-[#111827] dark:text-white transition-colors duration-300">
      <div className="relative flex flex-1 items-center">
        <span className="absolute left-4 text-[#8B849A]">⌕</span>
        <input
          placeholder="Search any courses you want..."
          className="h-full w-full bg-transparent pl-10 pr-4 text-[12px] outline-none"
        />
      </div>

      <button className="h-full min-w-[120px] bg-[#6D28D9] px-6 text-[12px] font-semibold text-white">
        Search
      </button>
    </div>

    {/* Filters */}
    <select className="h-[42px] min-w-[140px] rounded-full border border-[#D9D4E5] dark:border-white/10 bg-white dark:bg-darkdeep1 text-[#111827] dark:text-white transition-colors duration-300 px-4 text-[12px]">
      <option>Category</option>
    </select>

    <select className="h-[42px] min-w-[120px] rounded-full border border-[#D9D4E5] dark:border-white/10 bg-white dark:bg-darkdeep1 text-[#111827] dark:text-white transition-colors duration-300 px-4 text-[12px]">
      <option>Level</option>
    </select>

    <select className="h-[42px] min-w-[110px] rounded-full border border-[#D9D4E5] dark:border-white/10 bg-white dark:bg-darkdeep1 text-[#111827] dark:text-white transition-colors duration-300 px-4 text-[12px]">
      <option>Price</option>
    </select>
  </div>
</section>

        {/* Course Sections */}
        {sections.map((section) => (
          <section key={section} className="mt-4">
            <h2 className="mb-4 text-[18px] font-semibold tracking-[-0.02em] text-[#111827] dark:text-white transition-colors duration-300">
              {section}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {courses.map((course) => (
                <CourseCard key={`${section}-${course.title}`} course={course} />
              ))}
            </div>
          </section>
        ))}

        {/* Pricing */}
        <section className="mt-12 pb-6 border-t border-[#ECE8F3] dark:border-white/10 pt-10 transition-colors duration-300">
          <div className="text-center">
            <span className="rounded-full bg-[#EDE9FE] px-3 py-1 text-[11px] font-semibold text-[#7C3AED]">
              Our Subscriptions
            </span>
            <h2 className="mt-2 text-[28px] font-bold tracking-[-0.03em] text-[#111827] dark:text-white transition-colors duration-300">
              Choose Right Plan for Your Success
            </h2>
          </div>

          <div className="mx-auto mt-8 grid max-w-[920px] gap-6 md:grid-cols-3">
            <PricingCard title="Starter" price="₹1,499" />
            <PricingCard title="Starter" price="₹1,499" active />
            <PricingCard title="Professional" price="₹14,999" />
          </div>
        </section>
      </div>
    </main>
  );
}