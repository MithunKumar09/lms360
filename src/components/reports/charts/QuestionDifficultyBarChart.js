"use client";

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const QuestionDifficultyBarChart = ({ data, className = '' }) => {
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

    const questions = data.questions;
    const labels = questions.map((q, index) => `Q${q.orderIndex || index + 1}`);
    const correctnessData = questions.map(q => q.correctnessPercentage || 0);

    // Color based on difficulty
    const backgroundColor = questions.map(q => {
      if (q.difficulty === 'easy') return 'rgba(34, 197, 94, 0.8)';
      if (q.difficulty === 'hard') return 'rgba(239, 68, 68, 0.8)';
      return 'rgba(234, 179, 8, 0.8)'; // medium
    });

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Correctness Percentage',
          data: correctnessData,
          backgroundColor,
          borderColor: backgroundColor.map(c => c.replace('0.8', '1')),
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
                const question = questions[context.dataIndex];
                return [
                  `Correctness: ${context.parsed.y.toFixed(1)}%`,
                  `Difficulty: ${question.difficulty}`,
                  `Total Attempts: ${question.totalAttempts}`,
                  `Correct: ${question.correctAttempts} | Incorrect: ${question.incorrectAttempts}`,
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
              text: 'Correctness Percentage (%)',
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
        <p className="text-gray-500 dark:text-gray-400">No question difficulty data available</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <canvas ref={chartRef} className="w-full h-64"></canvas>
    </div>
  );
};

export default QuestionDifficultyBarChart;

