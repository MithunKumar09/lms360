"use client";

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const ScoreDistributionPieChart = ({ data, className = '' }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || !data.distribution || data.distribution.length === 0) {
      return;
    }

    const ctx = chartRef.current.getContext('2d');

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const distribution = data.distribution;
    const labels = distribution.map(d => d.range);
    const values = distribution.map(d => d.count);
    const total = values.reduce((sum, val) => sum + val, 0);

    // Color palette for score ranges (green for high, red for low)
    const colors = [
      'rgba(34, 197, 94, 0.8)',   // 90-100: Green
      'rgba(74, 222, 128, 0.8)',  // 80-89: Light green
      'rgba(163, 230, 53, 0.8)',  // 70-79: Yellow-green
      'rgba(234, 179, 8, 0.8)',   // 60-69: Yellow
      'rgba(251, 146, 60, 0.8)',  // 50-59: Orange
      'rgba(249, 115, 22, 0.8)',  // 40-49: Dark orange
      'rgba(239, 68, 68, 0.8)',   // 30-39: Red
      'rgba(220, 38, 38, 0.8)',   // 20-29: Dark red
      'rgba(185, 28, 28, 0.8)',   // 10-19: Very dark red
      'rgba(127, 29, 29, 0.8)',   // 0-9: Darkest red
    ];

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Score Distribution',
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
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
                  const value = values[index];
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                  label.text = `${label.text}: ${value} (${percentage}%)`;
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
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value} attempts (${percentage}%)`;
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

  if (!data || !data.distribution || data.distribution.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No score distribution data available</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <canvas ref={chartRef} className="w-full h-64"></canvas>
    </div>
  );
};

export default ScoreDistributionPieChart;

