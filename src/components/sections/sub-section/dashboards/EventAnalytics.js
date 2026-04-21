"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import Chart from "chart.js/auto";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";

export default function EventAnalytics() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  const lineChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const statusPieChartRef = useRef(null);
  const barChartRef = useRef(null);

  // Fetch analytics
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['brandEventAnalytics', userId],
    queryFn: async () => {
      const response = await apiClient.get('/brand/analytics/events');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch analytics');
      }
      return response.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const analytics = analyticsData || {};

  // Line Chart: Events Created Over Time
  useEffect(() => {
    if (lineChartRef.current && analytics.eventsOverTime) {
      const ctx = lineChartRef.current;
      let chartInstance = null;

      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const labels = analytics.eventsOverTime.map((item) => {
        const date = new Date(item.date);
        return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      });
      const data = analytics.eventsOverTime.map((item) => item.count);

      chartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Events Created",
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
              text: "Events Created Over Time",
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
  }, [analytics.eventsOverTime]);

  // Pie Chart: Event Status Distribution
  useEffect(() => {
    if (pieChartRef.current && analytics.statusDistribution) {
      const ctx = pieChartRef.current;
      let chartInstance = null;

      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const labels = analytics.statusDistribution.map((item) => item.status);
      const data = analytics.statusDistribution.map((item) => item.count);
      const colors = [
        'rgba(95, 45, 237, 0.8)',
        'rgba(34, 197, 94, 0.8)',
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
              text: "Event Status Distribution",
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
  }, [analytics.statusDistribution]);

  // Pie Chart: Registration Status Distribution
  useEffect(() => {
    if (statusPieChartRef.current && analytics.registrationStatusDistribution) {
      const ctx = statusPieChartRef.current;
      let chartInstance = null;

      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const labels = analytics.registrationStatusDistribution.map((item) => item.status);
      const data = analytics.registrationStatusDistribution.map((item) => item.count);
      const colors = [
        'rgba(34, 197, 94, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(251, 191, 36, 0.8)',
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
              text: "Registration Status Distribution",
            },
          },
        },
      });
      ctx.chart = chartInstance;
    }

    return () => {
      if (statusPieChartRef.current?.chart) {
        statusPieChartRef.current.chart.destroy();
        statusPieChartRef.current.chart = null;
      }
    };
  }, [analytics.registrationStatusDistribution]);

  // Bar Chart: Top Events by Registrations
  useEffect(() => {
    if (barChartRef.current && analytics.topEvents) {
      const ctx = barChartRef.current;
      let chartInstance = null;

      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const labels = analytics.topEvents.map((item) => item.title.length > 30 ? item.title.substring(0, 30) + '...' : item.title);
      const data = analytics.topEvents.map((item) => item.registrationCount);

      chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Registrations",
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
              text: "Top Events by Registrations",
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
  }, [analytics.topEvents]);

  if (isLoading) {
    return (
      <div>
        <SkeletonLoader count={4} />
      </div>
    );
  }

  if (!analytics || (!analytics.eventsOverTime && !analytics.statusDistribution)) {
    return (
      <NoData message="No event analytics data available." />
    );
  }

  return (
    <div className="w-full">
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        {/* Header */}
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
            Event Analytics
          </h2>
          <p className="text-contentColor dark:text-contentColor-dark">
            Insights and statistics about your events
          </p>
        </div>

        {/* Performance Metrics */}
        {analytics.performance && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Total Events</p>
              <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                {analytics.performance.totalEvents}
              </p>
            </div>
            <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Total Registrations</p>
              <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                {analytics.performance.totalRegistrations}
              </p>
            </div>
            <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Unique Participants</p>
              <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                {analytics.performance.uniqueParticipants}
              </p>
            </div>
            <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Avg. Registrations/Event</p>
              <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                {analytics.performance.avgRegistrationsPerEvent.toFixed(1)}
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Events Over Time */}
          {analytics.eventsOverTime && analytics.eventsOverTime.length > 0 && (
            <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
              <div className="h-64">
                <canvas ref={lineChartRef}></canvas>
              </div>
            </div>
          )}

          {/* Event Status Distribution */}
          {analytics.statusDistribution && analytics.statusDistribution.length > 0 && (
            <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
              <div className="h-64">
                <canvas ref={pieChartRef}></canvas>
              </div>
            </div>
          )}

          {/* Registration Status Distribution */}
          {analytics.registrationStatusDistribution && analytics.registrationStatusDistribution.length > 0 && (
            <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
              <div className="h-64">
                <canvas ref={statusPieChartRef}></canvas>
              </div>
            </div>
          )}

          {/* Top Events */}
          {analytics.topEvents && analytics.topEvents.length > 0 && (
            <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
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
