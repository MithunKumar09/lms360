"use client";

import Chart from "chart.js/auto";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/index.js";
import { useAdminMonthlyTrends } from "@/hooks/api/useAdminStatistics";
import { useSuperadminMonthlyTrends } from "@/hooks/api/useSuperadminStatistics";
import { useCategories } from "@/hooks/api/useCourseSettings";

const LineChartDashboard = () => {
  const lineChartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'orgadmin';
  const isSuperadmin = user?.role === 'superadmin';
  const isAuthorized = isAdmin || isSuperadmin;
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('enrollments');
  
  // Fetch categories for dropdown
  const { data: categoriesData } = useCategories({ status: 1 }, { enabled: isAuthorized });
  const categories = categoriesData?.categories || [];
  
  // Fetch monthly trends data - use appropriate hook based on role
  const { data: adminTrendsData, isLoading: isAdminLoading } = useAdminMonthlyTrends({
    metric: selectedMetric,
    period: '12months',
    categoryId: selectedCategory,
    enabled: isAdmin,
  });

  const { data: superadminTrendsData, isLoading: isSuperadminLoading } = useSuperadminMonthlyTrends({
    metric: selectedMetric,
    period: '12months',
    categoryId: selectedCategory,
    enabled: isSuperadmin,
  });

  // Use appropriate data based on role
  const trendsData = isSuperadmin ? superadminTrendsData : adminTrendsData;
  const isLoading = isSuperadmin ? isSuperadminLoading : isAdminLoading;

  useEffect(() => {
    const ctx = lineChartRef?.current;
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    // Wait for data to load or if not authorized, use static data
    if (isAuthorized) {
      if (isLoading || !trendsData?.data || !Array.isArray(trendsData.data)) {
        return;
      }

      const labels = trendsData.data.map((item) => item?.label || '');
      const data = trendsData.data.map((item) => (typeof item?.value === 'number' ? item.value : 0));

      // Determine max value for y-axis (round up to nearest 50)
      // Ensure data array is valid and not empty
      const validData = data.filter(val => typeof val === 'number' && !isNaN(val));
      const maxValue = validData.length > 0 ? Math.max(...validData, 0) : 0;
      const yMax = maxValue > 0 ? Math.ceil(maxValue / 50) * 50 : 300;
      const stepSize = yMax <= 100 ? 10 : yMax <= 300 ? 50 : 100;

      chartInstanceRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "#",
              data,
              tension: 0.4,
              backgroundColor: "rgba(95, 45, 237, 0.1)",
              borderColor: "#5F2DED",
              borderWidth: 2,
              fill: true,
              pointBackgroundColor: "#5F2DED",
              pointBorderColor: "#ffffff",
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              min: 0,
              max: yMax,
              ticks: {
                stepSize: stepSize,
              },
            },
            x: {
              grid: {
                display: false,
              },
            },
          },
        },
      });
    } else {
      // Static data for non-admin users (fallback)
      chartInstanceRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: [
            "Jan",
            "Feb",
            "Marc",
            "April",
            "May",
            "Jun",
            "July",
            "Agust",
            "Sept",
            "Oct",
            "Now",
            "Dec",
          ],
          datasets: [
            {
              label: "#",
              data: [
                148, 100, 205, 110, 165, 145, 180, 156, 148, 220, 180, 245,
              ],
              tension: 0.4,
              backgroundColor: "#5F2DED",
              borderColor: "#5F2DED",
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              min: 0,
              max: 300,
              ticks: {
                stepSize: 50,
              },
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
  }, [trendsData, isLoading, selectedCategory, selectedMetric, isAuthorized]);

  return (
    <div className="w-full xl:w-[65%] min-w-0">
      <div className="md:px-5 py-10px md:py-0">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 min-w-0">
          <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
            Dashboard
          </h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto">
            {isAuthorized && (
              <div className="bg-whiteColor rounded-md relative">
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="bg-transparent text-darkBlue w-full sm:min-w-[180px] px-3 py-2 focus:outline-none block appearance-none leading-1.5 relative z-20 focus:shadow-select border border-borderColor6 rounded-md"
                >
                  <option value="enrollments">Enrollments</option>
                  <option value="courses">Courses</option>
                  <option value="students">Students</option>
                </select>
                <i className="icofont-simple-down absolute top-1/2 right-3 -translate-y-1/2 block text-lg z-10"></i>
              </div>
            )}
            <div className="bg-whiteColor rounded-md relative">
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="bg-transparent text-darkBlue w-full sm:min-w-[180px] px-3 py-2 focus:outline-none block appearance-none leading-1.5 relative z-20 focus:shadow-select border border-borderColor6 rounded-md"
              >
                <option value="">All Categories</option>
                {Array.isArray(categories) && categories.map((cat) => {
                  if (!cat || typeof cat !== 'object') return null;
                  return (
                    <option key={cat.id || ''} value={cat.id || ''}>
                      {cat.name || 'Unnamed Category'}
                    </option>
                  );
                })}
              </select>
              <i className="icofont-simple-down absolute top-1/2 right-3 -translate-y-1/2 block text-lg z-10"></i>
            </div>
          </div>
        </div>
        <div className="h-[260px] sm:h-[320px] lg:h-64 xl:h-[360px] min-w-0">
          {isAuthorized && isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-contentColor dark:text-contentColor-dark">Loading chart data...</div>
            </div>
          ) : (
            <canvas id="lineChart" ref={lineChartRef}></canvas>
          )}
        </div>
      </div>
    </div>
  );
};

export default LineChartDashboard;
