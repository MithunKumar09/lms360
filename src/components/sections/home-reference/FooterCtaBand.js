import { ArrowRight } from "lucide-react";

export default function FooterCtaBand() {
  return (
    <section className="bg-[#140033] text-white pt-24 pb-16">
      <div className="container text-center">
        <span className="inline-block rounded-full bg-white/10 px-4 py-2 text-xs">Trusted by learners worldwide</span>

        <h2 className="mt-8 text-5xl font-bold leading-tight max-w-3xl mx-auto">
          Find your path with clarity, <br /> not confusion.
        </h2>

        <p className="mt-6 text-white/70 max-w-2xl mx-auto leading-7">
          Discover careers aligned with who you truly are — your personality, strengths, and aspirations.
        </p>

        <button className="mt-8 inline-flex items-center gap-2 rounded-full bg-purple-600 px-6 py-3 font-medium">
          Explore Careers <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}