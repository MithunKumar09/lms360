"use client";

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const CourseWiseBreakdownChart = ({ data, className = '' }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const ctx = chartRef.current.getContext('2d');

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Sort data by average score (descending)
    const sortedData = [...data].sort((a, b) => {
      const scoreA = a.averageScore || 0;
      const scoreB = b.averageScore || 0;
      return scoreB - scoreA;
    });

    const labels = sortedData.map((item) => {
      const title = item.courseTitle || 'Unknown Course';
      // Truncate long titles
      return title.length > 20 ? title.substring(0, 20) + '...' : title;
    });

    const averageScores = sortedData.map((item) => item.averageScore || 0);
    const totalAttempts = sortedData.map((item) => item.totalAttempts || 0);

    // Use bar chart for better readability
    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Average Score (%)',
            data: averageScores,
            backgroundColor: 'rgba(95, 45, 237, 0.6)', // primaryColor
            borderColor: 'rgba(95, 45, 237, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            callbacks: {
              afterLabel: (context) => {
                const index = context.dataIndex;
                const item = sortedData[index];
                return [
                  `Total Attempts: ${item.totalAttempts || 0}`,
                  `Passed: ${item.passedCount || 0}`,
                  `Failed: ${item.failedCount || 0}`,
                ];
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`,
            },
            title: {
              display: true,
              text: 'Average Score (%)',
            },
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45,
            },
            title: {
              display: true,
              text: 'Course',
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No course data available</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <canvas ref={chartRef} className="w-full h-64"></canvas>
    </div>
  );
};

export default CourseWiseBreakdownChart;

