"use client";

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const HistoricalPerformanceLineChart = ({ data, className = '' }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const ctx = chartRef.current.getContext('2d');

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Sort data by date to ensure chronological order
    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(a.date || a.submittedAt);
      const dateB = new Date(b.date || b.submittedAt);
      return dateA - dateB;
    });

    const labels = sortedData.map((item, index) => {
      if (item.date || item.submittedAt) {
        const date = new Date(item.date || item.submittedAt);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return `Attempt ${item.attemptNumber || index + 1}`;
    });

    const scores = sortedData.map((item) => item.score || item.percentageScore || 0);

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Score (%)',
            data: scores,
            borderColor: 'rgba(95, 45, 237, 1)', // primaryColor
            backgroundColor: 'rgba(95, 45, 237, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: 'rgba(95, 45, 237, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
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
              label: (context) => {
                const value = context.parsed.y;
                const item = sortedData[context.dataIndex];
                let label = `Score: ${value.toFixed(2)}%`;
                if (item.quizTitle) {
                  label += `\nQuiz: ${item.quizTitle}`;
                }
                return label;
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
              text: 'Score (%)',
            },
          },
          x: {
            title: {
              display: true,
              text: 'Attempt Timeline',
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
        <p className="text-gray-500 dark:text-gray-400">No historical data available</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <canvas ref={chartRef} className="w-full h-64"></canvas>
    </div>
  );
};

export default HistoricalPerformanceLineChart;

