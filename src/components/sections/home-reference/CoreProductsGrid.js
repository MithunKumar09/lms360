import {
    Briefcase,
    Rocket,
    GraduationCap,
    Users,
    MessageSquare,
    Presentation,
} from "lucide-react";
import Image from "next/image";

const products = [
    { title: "Job-Ready Career Skills", image: "/products/1.jpg", icon: Briefcase },
    { title: "Intern Labs", image: "/products/2.jpg", icon: Rocket },
    { title: "Masterclasses", image: "/products/3.jpg", icon: GraduationCap },
    { title: "Campuspreneurs", image: "/products/4.jpg", icon: Users },
    { title: "CareerTalk", image: "/products/5.jpg", icon: MessageSquare },
    { title: "Workshops and Seminars", image: "/products/6.jpg", icon: Presentation },
];

export default function CoreProductsGrid() {
    return (
        <section className="pt-2 py-24 bg-[linear-gradient(90deg,#EDF2FF_0%,#F5F0FF_50%,#F7F8FC_100%)] dark:bg-[linear-gradient(90deg,#0F172A_0%,#1A1330_50%,#111827_100%)] transition-colors duration-300">
            <div className="container">
                <div className="text-center mb-14">
                    <span className="inline-block text-xs px-3 py-1 rounded-full bg-purple-200 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold mb-3 transition-colors duration-300">
                        Our Products
                    </span>

                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                        Core Products
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 auto-rows-[220px]">
                    {products.map((item, index) => {
                        const dynamicClass =
                            index === 0
                                ? "md:col-span-1 md:row-span-2"
                                : index === 1
                                ? "md:col-span-2"
                                : "";

                        const Icon = item.icon;

                        return (
                            <div
                                key={item.title}
                                className={`${dynamicClass} group relative overflow-hidden rounded-3xl shadow-sm dark:shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition-all duration-300`}
                            >
                                <Image
                                    src={item.image}
                                    alt={item.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />

                                {/* cinematic overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                                {/* glassy product pill */}
                                <div className="absolute bottom-4 left-4 right-4">
                                    <div className="flex items-center gap-3 rounded-2xl">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
                                            <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                                        </div>

                                        <span className="text-sm md:text-base font-semibold text-white">
                                            {item.title}
                                        </span>
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