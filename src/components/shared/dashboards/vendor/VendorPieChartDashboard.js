"use client";

import Chart from "chart.js/auto";
import { useEffect, useRef, useState } from "react";
import { useVendorDistribution } from "@/hooks/api/useVendorStatistics";

const VendorPieChartDashboard = () => {
  const pieChartRef = useRef(null);
  const [selectedType, setSelectedType] = useState('enrollment_status');
  const chartInstanceRef = useRef(null);

  const { data: distributionData, isLoading } = useVendorDistribution({
    distributionType: selectedType,
    enabled: true,
  });

  useEffect(() => {
    const ctx = pieChartRef?.current;
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    // Wait for data to load
    if (isLoading || !distributionData?.data || typeof distributionData.data !== 'object') {
      return;
    }

    const { labels, data } = distributionData.data;

    // Validate labels and data are arrays
    if (!Array.isArray(labels) || !Array.isArray(data)) {
      return;
    }

    // Check if there's any data
    const total = data.reduce((sum, val) => {
      const numVal = typeof val === 'number' ? val : 0;
      return sum + numVal;
    }, 0);
    if (total === 0) {
      return;
    }

    // Color schemes for different distribution types
    const colorSchemes = {
      enrollment_status: {
        colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'], // green, blue, orange, red
        hoverColors: ['#059669', '#2563eb', '#d97706', '#dc2626'],
      },
      revenue_sources: {
        colors: ['#5F2DED', '#8b5cf6'], // purple variants
        hoverColors: ['#4c1d95', '#7c3aed'],
      },
      course_distribution: {
        colors: ['#10b981', '#6b7280', '#9ca3af'], // green, gray variants
        hoverColors: ['#059669', '#4b5563', '#6b7280'],
      },
    };

    const scheme = colorSchemes[selectedType] || colorSchemes.enrollment_status;

    chartInstanceRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            label: "#",
            data,
            backgroundColor: scheme.colors,
            hoverBackgroundColor: scheme.hoverColors,
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
                const value = typeof context.parsed === 'number' ? context.parsed : 0;
                const total = Array.isArray(context.dataset.data)
                  ? context.dataset.data.reduce((a, b) => {
                      const numA = typeof a === 'number' ? a : 0;
                      const numB = typeof b === 'number' ? b : 0;
                      return numA + numB;
                    }, 0)
                  : 0;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                
                if (selectedType === 'revenue_sources') {
                  return `${label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`;
                }
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
      },
    });

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [distributionData, isLoading, selectedType]);

  // Get title based on selected type
  const getTitle = () => {
    const titles = {
      enrollment_status: 'Enrollment Status',
      revenue_sources: 'Revenue Sources',
      course_distribution: 'Course Distribution',
    };
    return titles[selectedType] || 'Distribution';
  };

  // Get time period options (for future use)
  const timeOptions = ['Today', 'Weekly', 'Monthly', 'Yearly'];

  return (
    <div className="w-full md:w-35%">
      <div className="md:px-5 py-10px md:py-0">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark flex justify-between items-center gap-2">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            {getTitle()}
          </h2>
          <div className="bg-whiteColor rounded-md relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-darkBlue w-42.5 px-3 py-6px focus:outline-none block appearance-none leading-1.5 relative z-20 focus:shadow-select border border-borderColor6 rounded-md"
            >
              <option value="enrollment_status">Enrollment Status</option>
              <option value="revenue_sources">Revenue Sources</option>
              <option value="course_distribution">Course Distribution</option>
            </select>
            <i className="icofont-simple-down absolute top-1/2 right-3 -translate-y-1/2 block text-lg z-10"></i>
          </div>
        </div>
        <div className="h-64">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-contentColor dark:text-contentColor-dark">Loading chart data...</div>
            </div>
          ) : !distributionData?.data || !Array.isArray(distributionData.data.data) || distributionData.data.data.reduce((a, b) => {
            const numA = typeof a === 'number' ? a : 0;
            const numB = typeof b === 'number' ? b : 0;
            return numA + numB;
          }, 0) === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-contentColor dark:text-contentColor-dark">No data available</div>
            </div>
          ) : (
            <canvas id="vendorPieChart" ref={pieChartRef}></canvas>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorPieChartDashboard;
