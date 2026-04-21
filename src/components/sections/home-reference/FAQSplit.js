"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import Image from "next/image";

const faqs = [
    {
        q: "What happens when I invite friends using my referral code?",
        a: "When a friend signs up or purchases a course using your referral code, you earn bonus Skill Points. These points directly help fill your tiles faster, bringing you closer to unlocking free workshops and premium rewards.",
    },
    {
        q: "Why can’t I redeem the workshop yet?",
        a: "Workshop redemption unlocks after reaching the required Skill Points milestone shown in your dashboard.",
    },
    {
        q: "How are Skill Points calculated?",
        a: "Skill Points are calculated from referrals, course completion, and workshop engagement.",
    },
    {
        q: "Do Skill Points or unlocked rewards expire?",
        a: "No, points remain active unless explicitly mentioned in a challenge.",
    },
    {
        q: "When do referral rewards get credited?",
        a: "Rewards are credited once the referred user completes signup or purchase.",
    },
    {
        q: "Can I transfer rewards to another account?",
        a: "Currently rewards are linked only to your account for security reasons.",
    },
    {
        q: "Can I combine rewards with offers?",
        a: "Yes, eligible offers can stack with unlocked reward benefits.",
    },
];

export default function FAQSplit() {
    const [openIndex, setOpenIndex] = useState(0);
    const [expanded, setExpanded] = useState(false);

    const visibleFaqs = useMemo(
        () => (expanded ? faqs : faqs.slice(0, 5)),
        [expanded]
    );

    return (
        <section className="pt-2 py-24 bg-[#FCFCFF] dark:bg-darkdeep2 transition-colors duration-300">
            <div className="container mx-auto px-4 lg:px-8">
                {/* centered heading */}
                <div className="mb-14 text-center">
                    <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white transition-colors duration-300">
                        Frequently Asked Questions
                    </h2>
                </div>

                {/* split layout */}
                <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                    {/* left faq */}
                    <div>
                        <div className="space-y-4">
                            {visibleFaqs.map((faq, idx) => {
                                const isOpen = openIndex === idx;

                                return (
                                    <div
                                        key={faq.q + idx}
                                        className={`overflow-hidden rounded-2xl border bg-white dark:bg-darkdeep1 transition-all duration-300 ${
                                            isOpen
                                                ? "border-purple-100 dark:border-purple-400/20 shadow-[0_6px_20px_rgba(147,51,234,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
                                                : "border-gray-200 dark:border-white/10"
                                        }`}
                                    >
                                        <button
                                            onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                                            className="flex w-full items-center justify-between px-6 py-5 text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white transition-colors duration-300">
                                                    {faq.q}
                                                </span>

                                                {idx === 0 && (
                                                    <Info
                                                        size={16}
                                                        className="text-gray-900 dark:text-white transition-colors duration-300"
                                                    />
                                                )}
                                            </div>

                                            <ChevronDown
                                                size={18}
                                                className={`text-gray-500 dark:text-gray-300 transition-all duration-300 ${
                                                    isOpen ? "rotate-180" : ""
                                                }`}
                                            />
                                        </button>

                                        {isOpen && (
                                            <div className="px-6 pb-6 text-sm leading-6 text-gray-600 dark:text-gray-300 transition-colors duration-300">
                                                {faq.a}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* expand more */}
                        {faqs.length > 5 && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => setExpanded((prev) => !prev)}
                                    className="inline-flex items-center gap-2 rounded-full border border-purple-200 dark:border-purple-400/20 bg-white dark:bg-darkdeep1 px-5 py-2.5 text-sm font-medium text-purple-700 dark:text-purple-300 shadow-sm dark:shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition-all duration-300 hover:bg-purple-50 dark:hover:bg-purple-500/10"
                                >
                                    {expanded ? "Show Less" : "Expand More"}

                                    <ChevronDown
                                        size={16}
                                        className={`transition-transform duration-300 ${
                                            expanded ? "rotate-180" : ""
                                        }`}
                                    />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* right image square */}
                    <div className="relative aspect-square w-full overflow-hidden rounded-[24px] shadow-sm dark:shadow-[0_12px_36px_rgba(0,0,0,0.3)] transition-all duration-300">
                        <Image
                            src="/FAQ/faq.jpg"
                            alt="faq"
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}