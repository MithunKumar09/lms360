"use client";

import { useEffect } from "react";
import CountDashboard from "./CountDashboard";
import counterUp from "@/libs/counterup";

const CounterDashboard = ({ counts, children }) => {
  useEffect(() => {
    counterUp();
  }, []);

  return (
    <section
      className="
        rounded-3xl border border-gray-200/70 dark:border-white/10
        bg-white dark:bg-darkdeep1
        p-4 md:p-6 xl:p-8
        shadow-sm
      "
    >
      {children && <div className="mb-6">{children}</div>}

      <div
        className="
          counter
          grid grid-cols-1
          sm:grid-cols-2
          xl:grid-cols-3
          gap-4 md:gap-5
        "
      >
        {counts?.map((count, idx) => (
          <CountDashboard key={idx} count={count} />
        ))}
      </div>
    </section>
  );
};

export default CounterDashboard;