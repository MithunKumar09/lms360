import { Users, BookOpen, Briefcase, Building2 } from "lucide-react";

const stats = [
    { icon: Users, value: "80,000+", label: "Students Enrolled" },
    { icon: BookOpen, value: "200+", label: "Courses" },
    { icon: Briefcase, value: "1,000+", label: "Learning Hours" },
    { icon: Building2, value: "50+", label: "Knowledge Partners" },
];

export default function StatsTrust() {
    return (
        <section className="pt-2 py-24 bg-white dark:bg-darkdeep1 transition-colors duration-300">
            <div className="container">
                <div className="text-center mb-12">
                    <span className="inline-block text-xs px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300 mb-3 transition-colors duration-300">
                        What Trust Us
                    </span>

                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                        Numbers That Speak
                    </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {stats.map((item) => {
                        const Icon = item.icon;

                        return (
                            <div
                                key={item.label}
                                className="rounded-2xl bg-[linear-gradient(135deg,#7E22CE_0%,#9333EA_45%,#C084FC_100%)] p-[1px] shadow-sm dark:shadow-[0_10px_35px_rgba(0,0,0,0.3)] transition-all duration-300"
                            >
                                <div className="rounded-2xl bg-white dark:bg-darkdeep2 p-6 text-center transition-colors duration-300">
                                    <Icon
                                        className="mx-auto mb-3 text-purple-600 dark:text-purple-300 transition-colors duration-300"
                                        size={32}
                                    />

                                    <div className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                                        {item.value}
                                    </div>

                                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-300 transition-colors duration-300">
                                        {item.label}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}