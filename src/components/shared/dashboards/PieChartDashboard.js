"use client";

import Chart from "chart.js/auto";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/index.js";
import { useAdminDistribution } from "@/hooks/api/useAdminStatistics";
import { useSuperadminDistribution } from "@/hooks/api/useSuperadminStatistics";

const PieChartDashboard = () => {
  const pieChartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'orgadmin';
  const isSuperadmin = user?.role === 'superadmin';
  const isAuthorized = isAdmin || isSuperadmin;
  
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(null);
  const [selectedDistributionType, setSelectedDistributionType] = useState('course_categories');

  // Fetch distribution data - use appropriate hook based on role
  const { data: adminDistributionData, isLoading: isAdminLoading } = useAdminDistribution({
    distributionType: selectedDistributionType,
    timePeriod: selectedTimePeriod,
    enabled: isAdmin,
  });

  const { data: superadminDistributionData, isLoading: isSuperadminLoading } = useSuperadminDistribution({
    distributionType: selectedDistributionType,
    timePeriod: selectedTimePeriod,
    enabled: isSuperadmin,
  });

  // Use appropriate data based on role
  const distributionData = isSuperadmin ? superadminDistributionData : adminDistributionData;
  const isLoading = isSuperadmin ? isSuperadminLoading : isAdminLoading;

  useEffect(() => {
    const ctx = pieChartRef?.current;
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    // Wait for data to load or if not authorized, use static data
    if (isAuthorized) {
      if (isLoading || !distributionData?.data) {
        return;
      }

      const { labels, data } = distributionData.data;

      // Check if there's any data - validate arrays exist
      if (!Array.isArray(labels) || !Array.isArray(data) || labels.length === 0 || data.length === 0) {
        return;
      }

      const total = data.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
      if (total === 0) {
        return;
      }

      // Color scheme for different distribution types
      const colorSchemes = {
        course_categories: {
          colors: ['#5F2DED', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
          hoverColors: ['#4c1d95', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd'],
        },
        enrollment_status: {
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
          hoverColors: ['#059669', '#2563eb', '#d97706', '#dc2626'],
        },
        course_status: {
          colors: ['#10b981', '#6b7280', '#9ca3af', '#d1d5db'],
          hoverColors: ['#059669', '#4b5563', '#6b7280', '#9ca3af'],
        },
      };

      const scheme = colorSchemes[selectedDistributionType] || colorSchemes.course_categories;

      // Ensure data arrays are valid numbers
      const safeData = data.map(val => typeof val === 'number' ? val : 0);
      const safeLabels = labels.map(label => label || 'Unknown');

      chartInstanceRef.current = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: safeLabels,
          datasets: [
            {
              label: "#",
              data: safeData,
              backgroundColor: scheme.colors.slice(0, safeLabels.length),
              hoverBackgroundColor: scheme.hoverColors.slice(0, safeLabels.length),
              borderWidth: 0,
            },
          ],
        },
        options: {
          cutout: "75%",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "left",
              labels: {
                padding: 15,
                usePointStyle: true,
                font: {
                  size: 12,
                },
              },
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                  return `${label}: ${value} (${percentage}%)`;
                },
              },
            },
          },
        },
      });
    } else {
      // Static data for non-admin users (fallback)
      chartInstanceRef.current = new Chart(ctx, {
        type: "pie",
        data: {
          labels: ["Direct", "Referal", "Organic"],
          datasets: [
            {
              label: "#",
              data: [40, 28, 32],
            },
          ],
        },
        options: {
          cutout: "75%",
          plugins: {
            legend: {
              position: "left",
            },
          },
          elements: {
            arc: {
              backgroundColor: "#5F2DED",
              hoverBackgroundColor: "#5F2DED",
            },
          },
        },
      });
    }

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [distributionData, isLoading, selectedTimePeriod, selectedDistributionType, isAuthorized]);

  // Get title based on selected type
  const getTitle = () => {
    if (!isAuthorized) return 'Traffic';
    const titles = {
      course_categories: 'Course Categories',
      enrollment_status: 'Enrollment Status',
      course_status: 'Course Status',
    };
    return titles[selectedDistributionType] || 'Distribution';
  };

  return (
    <div className="w-full xl:w-[35%] min-w-0">
      <div className="md:px-5 py-10px md:py-0">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 min-w-0">
          <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
            {getTitle()}
          </h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto">
            {isAuthorized && (
              <div className="bg-whiteColor rounded-md relative">
                <select
                  value={selectedDistributionType}
                  onChange={(e) => setSelectedDistributionType(e.target.value)}
                  className="bg-transparent text-darkBlue w-full sm:min-w-[180px] px-3 py-2 focus:outline-none block appearance-none leading-1.5 relative z-20 focus:shadow-select border border-borderColor6 rounded-md"
                >
                  <option value="course_categories">Categories</option>
                  <option value="enrollment_status">Enrollment Status</option>
                  <option value="course_status">Course Status</option>
                </select>
                <i className="icofont-simple-down absolute top-1/2 right-3 -translate-y-1/2 block text-lg z-10"></i>
              </div>
            )}
            <div className="bg-whiteColor rounded-md relative">
              <select
                value={selectedTimePeriod || ''}
                onChange={(e) => setSelectedTimePeriod(e.target.value || null)}
                className="bg-transparent text-darkBlue w-full sm:min-w-[180px] px-3 py-2 focus:outline-none block appearance-none leading-1.5 relative z-20 focus:shadow-select border border-borderColor6 rounded-md"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <i className="icofont-simple-down absolute top-1/2 right-3 -translate-y-1/2 block text-lg z-10"></i>
            </div>
          </div>
        </div>
        <div className="h-[260px] sm:h-[300px] lg:h-64 xl:h-[320px] min-w-0">
          {isAuthorized && isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-contentColor dark:text-contentColor-dark">Loading chart data...</div>
            </div>
          ) : isAuthorized && distributionData?.data && Array.isArray(distributionData.data?.data) && distributionData.data.data.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0) === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-contentColor dark:text-contentColor-dark">No data available</div>
            </div>
          ) : (
            <canvas id="pieChart" ref={pieChartRef}></canvas>
          )}
        </div>
      </div>
    </div>
  );
};

export default PieChartDashboard;
