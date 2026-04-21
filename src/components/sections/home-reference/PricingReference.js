import { Check } from "lucide-react";

const plans = [
    { name: "Starter", price: "₹1,499", featured: false },
    { name: "Starter", price: "₹4,499", featured: true },
    { name: "Professional", price: "₹14,999", featured: false },
];

export default function PricingReference() {
    return (
        <section className="pt-0 pb-24 bg-[#FCFCFF] dark:bg-darkdeep2 transition-colors duration-300">
            <div className="container">
                <div className="text-center mb-14">
                    <span className="inline-block text-xs px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300 mb-3 transition-colors duration-300">
                        Our Subscription
                    </span>

                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                        Choose Right Plan for Your Success
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {plans.map((plan) => (
                        <div
                            key={plan.name + plan.price}
                            className={`rounded-3xl border p-8 bg-white dark:bg-darkdeep1 transition-all duration-300 ${
                                plan.featured
                                    ? "border-purple-500 dark:border-purple-400 shadow-lg dark:shadow-[0_12px_36px_rgba(124,58,237,0.18)] scale-[1.02]"
                                    : "border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
                            }`}
                        >
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                                {plan.name}
                            </h3>

                            <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                                {plan.price}
                                <span className="text-base font-normal text-gray-500 dark:text-gray-300">
                                    {" "}
                                    / month
                                </span>
                            </div>

                            <ul className="mt-6 space-y-3 text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
                                <li className="flex items-center gap-2">
                                    <Check size={16} className="text-purple-600 dark:text-purple-300" />
                                    5 Courses
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check size={16} className="text-purple-600 dark:text-purple-300" />
                                    Community Access
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check size={16} className="text-purple-600 dark:text-purple-300" />
                                    Certificate
                                </li>
                            </ul>

                            <button
                                className={`mt-8 w-full rounded-full py-3 font-medium transition-all duration-300 ${
                                    plan.featured
                                        ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                                        : "border border-purple-300 dark:border-purple-400/20 text-purple-600 dark:text-purple-300 dark:bg-purple-500/10 hover:bg-purple-50 dark:hover:bg-purple-500/15"
                                }`}
                            >
                                Get Started
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}