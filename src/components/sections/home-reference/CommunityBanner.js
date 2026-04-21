import { ArrowRight } from "lucide-react";

const miniCards = [
  { title: "Learn in-demand skills", image: "/blog/blog_1.png" },
  { title: "Hands-on Experience", image: "/blog/blog_2.png" },
  { title: "Job Ready Curriculum", image: "/blog/blog_3.png" },
  { title: "Mentor-led Experience", image: "/blog/blog_4.png" },
];

export default function CommunityBanner() {
  return (
    <section className="pt-0 py-24 bg-white dark:bg-darkdeep1 transition-colors duration-300">
      <div className="container space-y-6">
        <div className="relative overflow-hidden rounded-[28px] min-h-[340px] shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-all duration-300">
          <img
            src="/blog/blog_1.png"
            alt="community"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/20" />

          <div className="relative z-10 max-w-xl p-10 text-white">
            <h2 className="text-4xl font-bold leading-tight">
              Why Choose ProConnect360
            </h2>

            <p className="mt-4 text-white/80 leading-7">
              Learn from industry leaders, build portfolio-ready projects, and accelerate your placement journey.
            </p>

            <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-white dark:bg-darkdeep2 text-gray-900 dark:text-white px-5 py-3 font-medium shadow-sm dark:shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition-all duration-300 hover:scale-[1.02]">
              Learn More <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {miniCards.map((card) => (
            <div
              key={card.title}
              className="relative overflow-hidden rounded-2xl h-32 shadow-sm dark:shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition-all duration-300"
            >
              <img
                src={card.image}
                alt={card.title}
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

              <div className="absolute bottom-3 left-3 text-sm font-medium text-white">
                {card.title}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}