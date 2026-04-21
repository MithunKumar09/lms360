import { ArrowRight, Clock3, Sparkles } from "lucide-react";
import Image from "next/image";

const articles = [
    {
        title: "Why Collaborative Skills Define the Future of Work",
        image: "/articles/article1.jpg",
        tag: "Career Growth",
        desc: "Teams that embrace psychological safety outperform by 40%.",
        accent: "from-amber-500 to-orange-400",
    },
    {
        title: "Building a Growth Mindset That Sticks",
        image: "/articles/article2.jpg",
        tag: "Growth Mindset",
        desc: '"ENFJs thrive when combining structured learning with social accountability"',
        accent: "from-pink-500 to-fuchsia-500",
    },
    {
        title: "Why Collaborative Skills Define the Future of Work",
        image: "/articles/article3.jpg",
        tag: "Career Growth",
        desc: "Teams that embrace psychological safety outperform by 40%.",
        accent: "from-emerald-500 to-green-400",
    },
];

export default function LatestArticles() {
    return (
        <section className="pt-0 py-24 bg-[#FCFCFF] dark:bg-darkdeep2 transition-colors duration-300">
            <div className="container mx-auto px-4 lg:px-8">
                {/* heading */}
                <div className="mb-14 text-center">
                    <span className="mb-4 inline-flex rounded-full bg-purple-100 dark:bg-purple-500/15 px-4 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-300 transition-colors duration-300">
                        Blogs
                    </span>

                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white transition-colors duration-300">
                        Latest News And Articles
                    </h2>
                </div>

                {/* premium cards */}
                <div className="grid gap-6 md:grid-cols-3">
                    {articles.map((article) => (
                        <div
                            key={article.title}
                            className="group relative h-[420px] overflow-hidden rounded-[28px] shadow-sm dark:shadow-[0_12px_36px_rgba(0,0,0,0.35)] transition-all duration-300"
                        >
                            {/* full background image */}
                            <Image
                                src={article.image}
                                alt={article.title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />

                            {/* dark soft overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

                            {/* top tag */}
                            <div className="absolute left-4 top-4 z-10">
                                <span
                                    className={`inline-flex rounded-full bg-gradient-to-r ${article.accent} px-4 py-2 text-xs font-semibold text-white shadow-sm`}
                                >
                                    {article.tag}
                                </span>
                            </div>

                            {/* premium warm overlay panel */}
                            <div className="absolute bottom-4 left-4 right-4 z-10 rounded-[28px] border border-white/10 bg-[rgba(104,86,63,0.68)] p-5 backdrop-blur-md">
                                <h3 className="text-[22px] font-bold leading-8 text-white">
                                    {article.title}
                                </h3>

                                <p className="mt-2 text-base leading-6 text-white/90">
                                    {article.desc}
                                </p>

                                {/* metadata */}
                                <div className="mt-5 flex items-center justify-between">
                                    <div className="flex items-center gap-5 text-sm text-white/95">
                                        <span className="inline-flex items-center gap-1">
                                            <Clock3 size={16} />
                                            4 min
                                        </span>

                                        <span className="inline-flex items-center gap-1">
                                            <Sparkles size={16} />
                                            For you
                                        </span>
                                    </div>

                                    {/* circular CTA */}
                                    <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-darkdeep1 text-amber-500 shadow-sm dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition-transform duration-300 group-hover:scale-105">
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}