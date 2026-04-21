const categories = [
  {
    title: "Graphics & Media",
    image: "/categories/ai_1.jpg",
    desc: "Create stunning visual content and designs",
    tags: ["Design Tools", "Video", "Creative Assets"],
  },
  {
    title: "Courses (Tech)",
    image: "/categories/ai_2.jpg",
    desc: "Learn programming and modern tech skills",
    tags: ["100+ Courses", "Certificates", "Beginner → Advanced"],
  },
  {
    title: "Companies & Startups",
    image: "/categories/ai_3.jpg",
    desc: "Learn from real startup journeys and strategies",
    tags: ["Founders", "Case Studies", "Funding"],
  },
  {
    title: "Soft Skills",
    image: "/categories/ai_4.jpg",
    desc: "Master communication and leadership abilities",
    tags: ["Communication", "Leadership", "Teamwork"],
  },
  {
    title: "Seminars",
    image: "/categories/ai_5.jpg",
    desc: "Attend expert-led talks and live sessions",
    tags: ["Live Events", "Industry Experts", "Q&A"],
  },
];

export default function BrowseCategories() {
  return (
    <section className="pt-2 py-24 bg-[#FCFCFE] dark:bg-darkdeep2 transition-colors duration-300">
      <div className="container mx-auto px-4 lg:px-8">
        {/* heading */}
        <div className="mb-14 text-center">
          <span className="mb-4 inline-flex rounded-full bg-purple-100 dark:bg-purple-500/15 px-4 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-300 transition-colors duration-300">
            Explore
          </span>

          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white transition-colors duration-300">
            Browse Categories
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm text-gray-500 dark:text-gray-300 transition-colors duration-300">
            Explore curated learning paths designed to accelerate your career
          </p>
        </div>

        {/* cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((item) => (
            <div
              key={item.title}
              className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-darkdeep1 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <img
                src={item.image}
                alt={item.title}
                className="h-32 w-full object-cover"
              />

              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                  {item.title}
                </h3>

                <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-300 transition-colors duration-300">
                  {item.desc}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-purple-200 dark:border-purple-400/20 bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium text-purple-600 dark:text-purple-300 transition-colors duration-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}