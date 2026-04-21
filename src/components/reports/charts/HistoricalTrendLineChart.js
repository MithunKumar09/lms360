"use client";

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const HistoricalTrendLineChart = ({ data, className = '' }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || !data.trendByDate || data.trendByDate.length === 0) {
      return;
    }

    const ctx = chartRef.current.getContext('2d');

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const trendData = data.trendByDate;
    const labels = trendData.map(t => {
      const date = new Date(t.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const scores = trendData.map(t => t.averageScore || 0);
    const attemptCounts = trendData.map(t => t.count || 0);

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Average Score (%)',
          data: scores,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y',
        },
        {
          label: 'Attempts',
          data: attemptCounts,
          borderColor: 'rgba(168, 85, 247, 1)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.4,
          fill: false,
          yAxisID: 'y1',
          type: 'line',
        },
      ],
    };

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (context.datasetIndex === 0) {
                  return `Average Score: ${context.parsed.y.toFixed(1)}%`;
                } else {
                  return `Attempts: ${context.parsed.y}`;
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
            grid: {
              drawOnChartArea: false,
            },
            title: {
              display: true,
              text: 'Number of Attempts',
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

  if (!data || !data.trendByDate || data.trendByDate.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No historical trend data available</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <canvas ref={chartRef} className="w-full h-64"></canvas>
    </div>
  );
};

export default HistoricalTrendLineChart;

