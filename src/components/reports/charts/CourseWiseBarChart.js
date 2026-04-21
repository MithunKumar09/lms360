"use client";

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const CourseWiseBarChart = ({ data, className = '' }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) {
      return;
    }

    const ctx = chartRef.current.getContext('2d');

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const labels = data.map(c => c.courseTitle || 'Standalone Quiz');
    const averageScores = data.map(c => c.averageScore || 0);
    const passRates = data.map(c => c.passRate || 0);

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Average Score (%)',
          data: averageScores,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          yAxisID: 'y',
        },
        {
          label: 'Pass Rate (%)',
          data: passRates,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
          yAxisID: 'y1',
        },
      ],
    };

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const course = data[context.dataIndex];
                if (context.datasetIndex === 0) {
                  return [
                    `Average Score: ${context.parsed.y.toFixed(1)}%`,
                    `Total Attempts: ${course.totalAttempts}`,
                    `Unique Students: ${course.uniqueStudents}`,
                  ];
                } else {
                  return [
                    `Pass Rate: ${context.parsed.y.toFixed(1)}%`,
                    `Passed: ${course.passedCount} | Failed: ${course.failedCount}`,
                  ];
                }
              },
            },
          },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
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
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            max: 100,
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              callback: (value) => `${value}%`,
            },
            title: {
              display: true,
              text: 'Pass Rate (%)',
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
        <p className="text-gray-500 dark:text-gray-400">No course-wise data available</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <canvas ref={chartRef} className="w-full h-64"></canvas>
    </div>
  );
};

export default CourseWiseBarChart;

