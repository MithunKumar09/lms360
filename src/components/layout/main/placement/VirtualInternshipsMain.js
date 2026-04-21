"use client";

import React, { useState } from "react";
import { useVirtualInternships } from "@/hooks/api/useVirtualInternships";
import { useRouter } from "next/navigation";

const VirtualInternshipsMain = () => {
  const router = useRouter();
  const { programs, isLoading } = useVirtualInternships({ status: 'published' });

  return (
    <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px">
      <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-4">
        Available Virtual Internship Programs
      </h2>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-contentColor dark:text-contentColor-dark">Loading programs...</p>
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-contentColor dark:text-contentColor-dark">No virtual internship programs available at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
            <div
              key={program.id}
              className="border border-borderColor dark:border-borderColor-dark rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboards/student-virtual-internships/${program.id}`)}
            >
              <h3 className="text-lg font-semibold mb-2 text-blackColor dark:text-blackColor-dark">{program.title}</h3>
              {program.description && (
                <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3 line-clamp-2">{program.description}</p>
              )}
              <div className="flex justify-between items-center text-sm text-contentColor dark:text-contentColor-dark">
                {program.industry && <span>{program.industry}</span>}
                {program.durationWeeks && <span>{program.durationWeeks} weeks</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VirtualInternshipsMain;
