"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import Chart from "chart.js/auto";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";

export default function CertificateAnalytics() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  const lineChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);

  // Fetch analytics
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['brandCertificateAnalytics', userId],
    queryFn: async () => {
      const response = await apiClient.get('/brand/analytics/certificates');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch analytics');
      }
      return response.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const analytics = analyticsData || {};

  // Line Chart: Certificates Issued Over Time
  useEffect(() => {
    if (lineChartRef.current && analytics.issuedOverTime) {
      const ctx = lineChartRef.current;
      let chartInstance = null;

      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const labels = analytics.issuedOverTime.map((item) => {
        const date = new Date(item.date);
        return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      });
      const data = analytics.issuedOverTime.map((item) => item.count);

      chartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Certificates Issued",
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
              text: "Certificates Issued Over Time",
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
  }, [analytics.issuedOverTime]);

  // Pie Chart: Generation Status Distribution
  useEffect(() => {
    if (pieChartRef.current && analytics.generationStatusDistribution) {
      const ctx = pieChartRef.current;
      let chartInstance = null;

      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const labels = analytics.generationStatusDistribution.map((item) => {
        const statusMap = {
          'completed': 'Completed',
          'processing': 'Processing',
          'pending': 'Pending',
          'failed': 'Failed',
          'not_started': 'Not Started',
        };
        return statusMap[item.status] || item.status;
      });
      const data = analytics.generationStatusDistribution.map((item) => item.count);
      const colors = [
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(156, 163, 175, 0.8)',
      ];

      chartInstance = new Chart(ctx, {
        type: "pie",
        data: {
          labels,
          datasets: [
            {
              data,
              backgroundColor: colors.slice(0, labels.length),
              borderWidth: 2,
              borderColor: "#fff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "right",
            },
            title: {
              display: true,
              text: "Certificate Generation Status",
            },
          },
        },
      });
      ctx.chart = chartInstance;
    }

    return () => {
      if (pieChartRef.current?.chart) {
        pieChartRef.current.chart.destroy();
        pieChartRef.current.chart = null;
      }
    };
  }, [analytics.generationStatusDistribution]);

  // Bar Chart: Certificate Templates Usage
  useEffect(() => {
    if (barChartRef.current && analytics.templatesDistribution) {
      const ctx = barChartRef.current;
      let chartInstance = null;

      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const labels = analytics.templatesDistribution.map((item) => 
        item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name
      );
      const data = analytics.templatesDistribution.map((item) => item.issuedCount);

      chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Issued Count",
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
              text: "Certificate Templates Usage",
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
  }, [analytics.templatesDistribution]);

  if (isLoading) {
    return (
      <div>
        <SkeletonLoader count={4} />
      </div>
    );
  }

  if (!analytics || (!analytics.issuedOverTime && !analytics.templatesDistribution)) {
    return (
      <NoData message="No certificate analytics data available." />
    );
  }

  return (
    <div className="w-full">
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        {/* Header */}
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
            Certificate Analytics
          </h2>
          <p className="text-contentColor dark:text-contentColor-dark">
            Insights and statistics about your certificates
          </p>
        </div>

        {/* Performance Metrics */}
        {analytics.performance && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Total Templates</p>
              <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                {analytics.performance.totalTemplates}
              </p>
            </div>
            <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Total Issued</p>
              <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                {analytics.performance.totalIssued}
              </p>
            </div>
            <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Unique Students</p>
              <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                {analytics.performance.uniqueStudents}
              </p>
            </div>
            <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Generated</p>
              <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                {analytics.performance.generatedCount}
              </p>
            </div>
            <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Failed</p>
              <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                {analytics.performance.failedCount}
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Certificates Issued Over Time */}
          {analytics.issuedOverTime && analytics.issuedOverTime.length > 0 && (
            <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
              <div className="h-64">
                <canvas ref={lineChartRef}></canvas>
              </div>
            </div>
          )}

          {/* Generation Status Distribution */}
          {analytics.generationStatusDistribution && analytics.generationStatusDistribution.length > 0 && (
            <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
              <div className="h-64">
                <canvas ref={pieChartRef}></canvas>
              </div>
            </div>
          )}

          {/* Certificate Templates Usage */}
          {analytics.templatesDistribution && analytics.templatesDistribution.length > 0 && (
            <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark lg:col-span-2">
              <div className="h-64">
                <canvas ref={barChartRef}></canvas>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
