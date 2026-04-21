"use client";

import React from "react";
import { useAuthStore } from "@/store/index.js";
import PieChartDashboard from "./PieChartDashboard";
import LineChartDashboard from "./LineChartDashboard";
import VendorPieChartDashboard from "./vendor/VendorPieChartDashboard";
import VendorLineChartDashboard from "./vendor/VendorLineChartDashboard";
import BrandPieChartDashboard from "./brand/BrandPieChartDashboard";
import BrandLineChartDashboard from "./brand/BrandLineChartDashboard";

const ChartDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const isVendor = user?.role === 'vendor';
  const isBrand = user?.role === 'brand';

  return (
    <div className="py-10 px-5 mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <div className="flex flex-wrap">
        {/* Conditionally render role-specific charts or default charts */}
        {isVendor ? (
          <>
            {/* Vendor line chart with dynamic data */}
            <VendorLineChartDashboard />
            {/* Vendor pie chart with dynamic data */}
            <VendorPieChartDashboard />
          </>
        ) : isBrand ? (
          <>
            {/* Brand line chart with dynamic data */}
            <BrandLineChartDashboard />
            {/* Brand pie chart with dynamic data */}
            <BrandPieChartDashboard />
          </>
        ) : (
          <>
            {/* Default line chart (used for admin, superadmin, etc.) */}
            <LineChartDashboard />
            {/* Default pie chart (used for admin, superadmin, etc.) */}
            <PieChartDashboard />
          </>
        )}
      </div>
    </div>
  );
};

export default ChartDashboard;
