"use client";

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const OverallPerformancePieChart = ({ data, className = '' }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    const ctx = chartRef.current.getContext('2d');

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const {
      totalPassed = 0,
      totalFailed = 0,
      totalPending = 0,
      totalAttempted = 0,
    } = data;

    // Calculate total (excluding pending from the pie)
    const total = totalPassed + totalFailed;

    const chartData = {
      labels: ['Passed', 'Failed', 'Pending'],
      datasets: [
        {
          label: 'Quiz Performance',
          data: [totalPassed, totalFailed, totalPending],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)', // Green for passed
            'rgba(239, 68, 68, 0.8)', // Red for failed
            'rgba(156, 163, 175, 0.8)', // Gray for pending
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(156, 163, 175, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };

    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 12,
              },
              generateLabels: (chart) => {
                const original = Chart.defaults.plugins.legend.labels.generateLabels;
                const labels = original(chart);
                labels.forEach((label, index) => {
                  const value = chartData.datasets[0].data[index];
                  label.text = `${label.text}: ${value}`;
                });
                return labels;
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
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

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data]);

  if (!data) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <canvas ref={chartRef} className="w-full h-64"></canvas>
    </div>
  );
};

export default OverallPerformancePieChart;

