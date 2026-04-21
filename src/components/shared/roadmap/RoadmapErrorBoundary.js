"use client";

import React from "react";
import ErrorBoundary from "@/components/shared/errors/ErrorBoundary";
import ErrorDisplay from "@/components/shared/errors/ErrorDisplay";

/**
 * RoadmapErrorBoundary Component
 * 
 * Error boundary specifically for roadmap components
 * Provides roadmap-specific error recovery
 */
const RoadmapErrorBoundary = ({ children }) => {
  const fallback = (errorMessage, resetError) => (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <ErrorDisplay
        title="Roadmap Error"
        message={errorMessage || "An error occurred while loading your roadmap"}
        onRetry={resetError}
        showRetry={true}
      />
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
};

export default RoadmapErrorBoundary;
