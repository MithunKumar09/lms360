import Image from "next/image";
import { ArrowRight } from "lucide-react";

const steps = [
    {
        number: "01",
        title: "Psychometric Test",
        image: "/enroll/1.png",
        desc: "Unlock your potential with personalized skill mapping and career guidance.",
    },
    {
        number: "02",
        title: "Career Guidance Session",
        image: "/enroll/2.png",
        desc: "Connect with mentors and experts to choose the right growth path for your career.",
    },
    {
        number: "03",
        title: "Personalized Learning Roadmap",
        image: "/enroll/3.png",
        desc: "Receive a structured roadmap tailored to your strengths, role, and long-term aspirations.",
    },
];

export default function HowToEnroll() {
    return (
        <section className="pt-2 py-24 bg-[#f8f8fc] dark:bg-darkdeep1 transition-colors duration-300">
            <div className="container mx-auto px-4 lg:px-6">
                {/* Heading */}
                <div className="mb-12 text-center">
                    <span className="mb-4 inline-flex rounded-full bg-purple-200 dark:bg-purple-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300 transition-colors duration-300">
                        Your Journey
                    </span>

                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white transition-colors duration-300">
                        How to Enroll
                    </h2>

                    <p className="mx-auto mt-4 max-w-2xl text-gray-500 dark:text-gray-300 transition-colors duration-300">
                        Follow a guided step-by-step learning journey designed to align your
                        skills, career path, and personalized learning goals.
                    </p>
                </div>

                {/* Step Flow */}
                <div className="grid gap-10 md:grid-cols-3">
                    {steps.map((step) => (
                        <div
                            key={step.number}
                            className="group transition-all duration-300"
                        >
                            {/* Image */}
                            <div className="overflow-hidden rounded-[28px] shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-300">
                                <Image
                                    src={step.image}
                                    alt={step.title}
                                    width={500}
                                    height={260}
                                    className="h-60 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            </div>

                            {/* Content */}
                            <div className="mt-4">
                                {/* Step + Title Row */}
                                <div className="flex items-center gap-3">
                                    <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white shadow-sm">
                                        {step.number}
                                    </div>

                                    <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white leading-tight transition-colors duration-300">
                                        {step.title}
                                    </h3>
                                </div>

                                {/* Description */}
                                <p className="mt-2 max-w-[340px] text-[14px] leading-6 text-gray-500 dark:text-gray-300 transition-colors duration-300">
                                    {step.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="mt-16 text-center">
                    <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl">
                        Start Your Journey <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </section>
    );
}