"use client";

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const TimeSpentBarChart = ({ data, className = '' }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || !data.questions || data.questions.length === 0) {
      return;
    }

    const ctx = chartRef.current.getContext('2d');

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Filter questions with time data
    const questionsWithTime = data.questions.filter(q => q.avgTimePerQuestion !== null && q.avgTimePerQuestion !== undefined);
    
    if (questionsWithTime.length === 0) {
      return;
    }

    const labels = questionsWithTime.map((q, index) => `Q${q.orderIndex || index + 1}`);
    const timeData = questionsWithTime.map(q => q.avgTimePerQuestion);

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Average Time (seconds)',
          data: timeData,
          backgroundColor: 'rgba(168, 85, 247, 0.8)',
          borderColor: 'rgba(168, 85, 247, 1)',
          borderWidth: 2,
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
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const question = questionsWithTime[context.dataIndex];
                const minutes = Math.floor(context.parsed.y / 60);
                const seconds = Math.round(context.parsed.y % 60);
                return [
                  `Average Time: ${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`,
                  `Total Attempts: ${question.totalAttempts}`,
                ];
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                const minutes = Math.floor(value / 60);
                const seconds = Math.round(value % 60);
                return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
              },
            },
            title: {
              display: true,
              text: 'Average Time per Question',
            },
          },
          x: {
            title: {
              display: true,
              text: 'Questions',
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

  if (!data || !data.questions || data.questions.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No time spent data available</p>
      </div>
    );
  }

  const questionsWithTime = data.questions.filter(q => q.avgTimePerQuestion !== null && q.avgTimePerQuestion !== undefined);
  if (questionsWithTime.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No time spent data available</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <canvas ref={chartRef} className="w-full h-64"></canvas>
    </div>
  );
};

export default TimeSpentBarChart;

