"use client";

import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const SubmissionsAnalytics = ({ analytics, role = "admin" }) => {
  const lineChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);
  const histogramRef = useRef(null);

  // Line Chart: Submission Rate Over Time
  useEffect(() => {
    if (lineChartRef.current && analytics?.submissionRateOverTime) {
      const ctx = lineChartRef.current;
      let chartInstance = null;
      
      // Destroy existing chart if it exists
      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const labels = analytics.submissionRateOverTime.map((item) => {
        const date = new Date(item.date);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      });
      const data = analytics.submissionRateOverTime.map((item) => item.count);

      chartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Submissions",
              data,
              tension: 0.4,
              backgroundColor: "rgba(95, 45, 237, 0.1)",
              borderColor: "#5F2DED",
              borderWidth: 2,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "top",
            },
            title: {
              display: true,
              text: "Submission Rate Over Time",
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
              },
            },
          },
        },
      });
      ctx.chart = chartInstance;
    }

    return () => {
      if (lineChartRef.current?.chart) {
        lineChartRef.current.chart.destroy();
        lineChartRef.current.chart = null;
      }
    };
  }, [analytics?.submissionRateOverTime]);

  // Pie Chart: Pass/Fail Ratio
  useEffect(() => {
    if (pieChartRef.current && analytics?.passFail) {
      const ctx = pieChartRef.current;
      let chartInstance = null;
      
      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const { passed, failed, notGraded } = analytics.passFail;
      const total = passed + failed + notGraded;

      if (total > 0) {
        chartInstance = new Chart(ctx, {
          type: "pie",
          data: {
            labels: ["Passed", "Failed", "Not Graded"],
            datasets: [
              {
                data: [passed, failed, notGraded],
                backgroundColor: ["#10b981", "#ef4444", "#6b7280"],
                hoverBackgroundColor: ["#059669", "#dc2626", "#4b5563"],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
              },
              title: {
                display: true,
                text: "Pass/Fail Ratio",
              },
            },
          },
        });
        ctx.chart = chartInstance;
      }
    }

    return () => {
      if (pieChartRef.current?.chart) {
        pieChartRef.current.chart.destroy();
        pieChartRef.current.chart = null;
      }
    };
  }, [analytics?.passFail]);

  // Bar Chart: Organization Comparison (Superadmin only)
  useEffect(() => {
    if (barChartRef.current && analytics?.orgComparison && role === "superadmin" && analytics.orgComparison.length > 0) {
      const ctx = barChartRef.current;
      let chartInstance = null;
      
      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const labels = analytics.orgComparison.map((org) => org.orgName);
      const data = analytics.orgComparison.map((org) => org.attemptCount);

      chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Attempts",
              data,
              backgroundColor: "#5F2DED",
              borderColor: "#5F2DED",
              borderWidth: 1,
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
            title: {
              display: true,
              text: "Organization Comparison",
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
              },
            },
          },
        },
      });
      ctx.chart = chartInstance;
    }

    return () => {
      if (barChartRef.current?.chart) {
        barChartRef.current.chart.destroy();
        barChartRef.current.chart = null;
      }
    };
  }, [analytics?.orgComparison, role]);

  // Histogram: Marks Distribution
  useEffect(() => {
    if (histogramRef.current && analytics?.marksDistribution) {
      const ctx = histogramRef.current;
      let chartInstance = null;
      
      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const sortedData = [...analytics.marksDistribution].sort((a, b) => {
        const aStart = parseInt(a.range.split("-")[0]);
        const bStart = parseInt(b.range.split("-")[0]);
        return aStart - bStart;
      });

      const labels = sortedData.map((item) => item.range);
      const data = sortedData.map((item) => item.count);

      chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Students",
              data,
              backgroundColor: "rgba(95, 45, 237, 0.6)",
              borderColor: "#5F2DED",
              borderWidth: 1,
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
            title: {
              display: true,
              text: "Marks Distribution",
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
              },
            },
          },
        },
      });
      ctx.chart = chartInstance;
    }

    return () => {
      if (histogramRef.current?.chart) {
        histogramRef.current.chart.destroy();
        histogramRef.current.chart = null;
      }
    };
  }, [analytics?.marksDistribution]);

  if (!analytics) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-gray-500 mb-1">Total Attempts</p>
          <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            {analytics.totalAttempts || 0}
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-gray-500 mb-1">Submitted</p>
          <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            {analytics.submittedAttempts || 0}
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-gray-500 mb-1">Average Score</p>
          <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            {analytics.averageMarks?.avgPercentage
              ? `${analytics.averageMarks.avgPercentage.toFixed(1)}%`
              : "N/A"}
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-gray-500 mb-1">Pass Rate</p>
          <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            {analytics.passFail && analytics.submittedAttempts > 0
              ? `${((analytics.passFail.passed / analytics.submittedAttempts) * 100).toFixed(1)}%`
              : "0%"}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Rate Over Time */}
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <div className="h-64">
            <canvas ref={lineChartRef}></canvas>
          </div>
        </div>

        {/* Pass/Fail Ratio */}
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <div className="h-64">
            <canvas ref={pieChartRef}></canvas>
          </div>
        </div>

        {/* Marks Distribution */}
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <div className="h-64">
            <canvas ref={histogramRef}></canvas>
          </div>
        </div>

        {/* Organization Comparison (Superadmin only) */}
        {role === "superadmin" && analytics.orgComparison && analytics.orgComparison.length > 0 && (
          <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
            <div className="h-64">
              <canvas ref={barChartRef}></canvas>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionsAnalytics;

