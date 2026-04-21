"use client";

import Chart from "chart.js/auto";
import { useEffect, useRef, useState } from "react";
import { useVendorMonthlyTrends } from "@/hooks/api/useVendorStatistics";

const VendorLineChartDashboard = () => {
  const lineChartRef = useRef(null);
  const [selectedMetric, setSelectedMetric] = useState('enrollments');
  const chartInstanceRef = useRef(null);

  const { data: trendsData, isLoading } = useVendorMonthlyTrends({
    metric: selectedMetric,
    enabled: true,
  });

  useEffect(() => {
    const ctx = lineChartRef?.current;
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    // Wait for data to load
    if (isLoading || !trendsData?.data || !Array.isArray(trendsData.data)) {
      return;
    }

    const labels = trendsData.data
      .filter(item => item && typeof item === 'object')
      .map((item) => item?.label || '');
    const data = trendsData.data
      .filter(item => item && typeof item === 'object')
      .map((item) => typeof item?.value === 'number' ? item.value : 0);

    // Determine max value for y-axis (round up to nearest 50)
    const maxValue = data.length > 0 ? Math.max(...data, 0) : 0;
    const yMax = maxValue > 0 ? Math.ceil(maxValue / 50) * 50 : 300;
    const stepSize = yMax <= 100 ? 10 : yMax <= 300 ? 50 : 100;

    // Get metric label
    const metricLabels = {
      enrollments: 'Enrollments',
      registrations: 'Registrations',
      revenue: 'Revenue',
    };
    const metricLabel = metricLabels[selectedMetric] || 'Count';

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: metricLabel,
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
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            callbacks: {
              label: function(context) {
                if (selectedMetric === 'revenue') {
                  return `₹${context.parsed.y.toLocaleString('en-IN')}`;
                }
                return `${context.parsed.y} ${metricLabel.toLowerCase()}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            min: 0,
            max: yMax,
            ticks: {
              stepSize: stepSize,
              callback: function(value) {
                if (selectedMetric === 'revenue') {
                  return `₹${value.toLocaleString('en-IN')}`;
                }
                return value;
              },
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
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

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [trendsData, isLoading, selectedMetric]);

  return (
    <div className="w-full md:w-65%">
      <div className="md:px-5 py-10px md:py-0">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark flex justify-between items-center gap-2">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Dashboard
          </h2>
          <div className="bg-whiteColor rounded-md relative">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-transparent text-darkBlue w-42.5 px-3 py-6px focus:outline-none block appearance-none leading-1.5 relative z-20 focus:shadow-select border border-borderColor6 rounded-md"
            >
              <option value="enrollments">Enrollments</option>
              <option value="registrations">Registrations</option>
              <option value="revenue">Revenue</option>
            </select>
            <i className="icofont-simple-down absolute top-1/2 right-3 -translate-y-1/2 block text-lg z-10"></i>
          </div>
        </div>
        <div className="h-64">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-contentColor dark:text-contentColor-dark">Loading chart data...</div>
            </div>
          ) : (
            <canvas id="vendorLineChart" ref={lineChartRef}></canvas>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorLineChartDashboard;
