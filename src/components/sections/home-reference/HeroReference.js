import { ArrowRight, ArrowLeft } from "lucide-react";
import Image from "next/image";

export default function HeroReference() {
    return (
        <section className="bg-gradient-to-r from-[#F8F5FF] via-[#F3EEFF] to-[#E9DEFF] dark:from-[#140F24] dark:via-[#1A1330] dark:to-[#22173D] py-16 lg:py-20 transition-colors duration-300">
            <div className="container grid lg:grid-cols-2 gap-12 items-center">
                <div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-purple-200/80 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300 font-bold text-sm px-4 py-2 mb-4 transition-colors duration-300">
                        <ArrowLeft size={14} /> Career-Focused Learning Platform
                    </span>

                    <h1 className="text-5xl font-bold leading-tight text-gray-900 dark:text-white max-w-xl transition-colors duration-300">
                        Learn Future Skills
                        <br />
                        Skills.
                        <br />
                        <span className="bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] bg-clip-text text-transparent">
                            Build Your Career.
                        </span>
                    </h1>

                    <p className="text-gray-500 dark:text-gray-300 mt-6 max-w-lg leading-7 transition-colors duration-300">
                        Industry-aligned programs designed to make you job-ready through
                        hands-on learning and placement support from experienced professionals.
                    </p>

                    <div className="flex gap-4 mt-8">
                        <button className="inline-flex items-center gap-2 rounded-full bg-purple-700 hover:bg-purple-800 text-white px-6 py-3 shadow-md transition-all duration-300">
                            Explore Courses <ArrowRight size={16} />
                        </button>

                        <button className="rounded-full border border-[#A855F7] dark:border-purple-400/40 bg-white dark:bg-darkdeep1 px-8 py-3 text-[#5B21B6] dark:text-purple-300 font-medium shadow-[0_1px_2px_rgba(168,85,247,0.08)] dark:shadow-[0_4px_20px_rgba(139,92,246,0.12)] transition-all duration-300">
                            View Programs
                        </button>
                    </div>
                </div>

                <div className="relative flex justify-center lg:justify-end">
                    <div className="w-full max-w-[620px] rounded-[26px] bg-white dark:bg-darkdeep1 p-3 shadow-[0_20px_60px_rgba(109,40,217,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-all duration-300">
                        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[22px]">
                            <Image
                                src="/hero/hero.jpg"
                                alt="student"
                                fill
                                priority
                                className="object-cover object-[center_right]"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}