"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import Chart from "chart.js/auto";
import { format } from "date-fns";
import ExportButtonSimple from "@/components/shared/export/ExportButtonSimple";
import { formatDateForCSV } from "@/lib/utils/export/csvExporter.js";

export default function MentorApplicationAnalyticsMain() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [period, setPeriod] = useState("30");

  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);
  const hourChartRef = useRef(null);
  const dayChartRef = useRef(null);
  const pieChartRef = useRef(null);

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['application-analytics', period],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: period.toString(),
      });
      const response = await apiClient.get(`/mentors/analytics/applications?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch analytics');
      }
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const analytics = analyticsData || {
    overview: {},
    trends: { daily: [] },
    popular: { jobs: [] },
    patterns: { hour_of_day: [], day_of_week: [] },
    status_distribution: [],
  };

  // Line Chart: Application Trends Over Time
  useEffect(() => {
    if (lineChartRef.current && analytics.trends?.daily) {
      const ctx = lineChartRef.current;
      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const trends = analytics.trends.daily;
      const labels = trends.map(t => format(new Date(t.date), 'MMM dd'));
      const data = trends.map(t => t.count);

      ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Applications',
            data,
            borderColor: '#5F2DED',
            backgroundColor: 'rgba(95, 45, 237, 0.1)',
            tension: 0.4,
            fill: true,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
            title: {
              display: true,
              text: 'Application Trends Over Time',
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
    }

    return () => {
      if (lineChartRef.current?.chart) {
        lineChartRef.current.chart.destroy();
        lineChartRef.current.chart = null;
      }
    };
  }, [analytics.trends]);

  // Bar Chart: Popular Jobs
  useEffect(() => {
    if (barChartRef.current && analytics.popular?.jobs) {
      const ctx = barChartRef.current;
      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const popular = analytics.popular.jobs.slice(0, 10);
      const labels = popular.map(item => {
        const title = item.title.length > 25 ? item.title.substring(0, 25) + '...' : item.title;
        return `${title} (${item.company})`;
      });
      const data = popular.map(item => item.application_count);

      ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Applications',
            data,
            backgroundColor: '#5F2DED',
            borderColor: '#5F2DED',
            borderWidth: 1,
          }],
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
              text: 'Popular Jobs',
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
    }

    return () => {
      if (barChartRef.current?.chart) {
        barChartRef.current.chart.destroy();
        barChartRef.current.chart = null;
      }
    };
  }, [analytics.popular]);

  // Bar Chart: Peak Application Hours
  useEffect(() => {
    if (hourChartRef.current && analytics.patterns?.hour_of_day) {
      const ctx = hourChartRef.current;
      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const patterns = analytics.patterns.hour_of_day;
      const hours = Array.from({ length: 24 }, (_, i) => i);
      const data = hours.map(hour => {
        const pattern = patterns.find(p => p.hour_of_day === hour);
        return pattern ? pattern.count : 0;
      });

      ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: hours.map(h => `${h}:00`),
          datasets: [{
            label: 'Applications',
            data,
            backgroundColor: 'rgba(95, 45, 237, 0.6)',
            borderColor: '#5F2DED',
            borderWidth: 1,
          }],
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
              text: 'Peak Application Hours',
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
    }

    return () => {
      if (hourChartRef.current?.chart) {
        hourChartRef.current.chart.destroy();
        hourChartRef.current.chart = null;
      }
    };
  }, [analytics.patterns]);

  // Bar Chart: Peak Application Days
  useEffect(() => {
    if (dayChartRef.current && analytics.patterns?.day_of_week) {
      const ctx = dayChartRef.current;
      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const patterns = analytics.patterns.day_of_week;
      const days = Array.from({ length: 7 }, (_, i) => i);
      const data = days.map(day => {
        const pattern = patterns.find(p => p.day_of_week === day);
        return pattern ? pattern.count : 0;
      });

      ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: dayNames,
          datasets: [{
            label: 'Applications',
            data,
            backgroundColor: 'rgba(95, 45, 237, 0.6)',
            borderColor: '#5F2DED',
            borderWidth: 1,
          }],
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
              text: 'Peak Application Days',
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
    }

    return () => {
      if (dayChartRef.current?.chart) {
        dayChartRef.current.chart.destroy();
        dayChartRef.current.chart = null;
      }
    };
  }, [analytics.patterns]);

  // Pie Chart: Status Distribution
  useEffect(() => {
    if (pieChartRef.current && analytics.status_distribution) {
      const ctx = pieChartRef.current;
      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const statusDist = analytics.status_distribution;
      const labels = statusDist.map(s => s.status);
      const data = statusDist.map(s => s.count);
      const colors = {
        pending: 'rgba(234, 179, 8, 0.6)',
        reviewed: 'rgba(59, 130, 246, 0.6)',
        shortlisted: 'rgba(168, 85, 247, 0.6)',
        rejected: 'rgba(239, 68, 68, 0.6)',
        accepted: 'rgba(16, 185, 129, 0.6)',
        withdrawn: 'rgba(107, 114, 128, 0.6)',
      };

      ctx.chart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: labels.map(label => colors[label] || 'rgba(156, 163, 175, 0.6)'),
            borderColor: '#fff',
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'right',
            },
            title: {
              display: true,
              text: 'Application Status Distribution',
            },
          },
        },
      });
    }

    return () => {
      if (pieChartRef.current?.chart) {
        pieChartRef.current.chart.destroy();
        pieChartRef.current.chart = null;
      }
    };
  }, [analytics.status_distribution]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Application Analytics</h1>
              <p className="text-muted mb-0 small">
                View application trends, patterns, and statistics
              </p>
            </div>
            {analytics.popular.jobs.length > 0 && (
              <ExportButtonSimple
                data={analytics.popular.jobs.map(job => ({
                  title: job.title,
                  company: job.company,
                  location: job.location || '',
                  job_type: job.job_type?.replace('_', ' ') || '',
                  applications: job.application_count,
                  pending: job.pending_count || 0,
                  shortlisted: job.shortlisted_count || 0,
                  accepted: job.accepted_count || 0,
                }))}
                headers={[
                  { key: 'title', label: 'Job Title' },
                  { key: 'company', label: 'Company' },
                  { key: 'location', label: 'Location' },
                  { key: 'job_type', label: 'Job Type' },
                  { key: 'applications', label: 'Total Applications' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'shortlisted', label: 'Shortlisted' },
                  { key: 'accepted', label: 'Accepted' },
                ]}
                filename={`application-analytics-${new Date().toISOString().split('T')[0]}`}
                variant="outline"
              />
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 mb-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Time Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Total Applications</p>
          <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
            {analytics.overview.total_applications || 0}
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Unique Applicants</p>
          <p className="text-2xl font-bold text-primaryColor">
            {analytics.overview.unique_applicants || 0}
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Jobs with Applications</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {analytics.overview.jobs_with_applications || 0}
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Avg. per Job</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {analytics.overview.avg_applications_per_job?.toFixed(1) || '0.0'}
          </p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {analytics.overview.status_breakdown?.pending || 0}
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark">
            {analytics.overview.status_percentages?.pending || '0.0'}%
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Reviewed</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {analytics.overview.status_breakdown?.reviewed || 0}
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark">
            {analytics.overview.status_percentages?.reviewed || '0.0'}%
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Shortlisted</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {analytics.overview.status_breakdown?.shortlisted || 0}
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark">
            {analytics.overview.status_percentages?.shortlisted || '0.0'}%
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Rejected</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {analytics.overview.status_breakdown?.rejected || 0}
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark">
            {analytics.overview.status_percentages?.rejected || '0.0'}%
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Accepted</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {analytics.overview.status_breakdown?.accepted || 0}
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark">
            {analytics.overview.status_percentages?.accepted || '0.0'}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Application Trends */}
        <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
          <HeadingDashboard>Application Trends</HeadingDashboard>
          <div className="h-64 mt-4">
            <canvas ref={lineChartRef}></canvas>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
          <HeadingDashboard>Status Distribution</HeadingDashboard>
          <div className="h-64 mt-4">
            <canvas ref={pieChartRef}></canvas>
          </div>
        </div>

        {/* Popular Jobs */}
        <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
          <HeadingDashboard>Popular Jobs</HeadingDashboard>
          <div className="h-64 mt-4">
            <canvas ref={barChartRef}></canvas>
          </div>
        </div>

        {/* Peak Application Hours */}
        <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
          <HeadingDashboard>Peak Application Hours</HeadingDashboard>
          <div className="h-64 mt-4">
            <canvas ref={hourChartRef}></canvas>
          </div>
        </div>

        {/* Peak Application Days */}
        <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
          <HeadingDashboard>Peak Application Days</HeadingDashboard>
          <div className="h-64 mt-4">
            <canvas ref={dayChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* Popular Jobs List */}
      {analytics.popular.jobs.length > 0 && (
        <div className="p-6 mb-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
          <HeadingDashboard>Top Jobs</HeadingDashboard>
          <div className="space-y-2 mt-4">
            {analytics.popular.jobs.slice(0, 10).map((job, idx) => (
              <div
                key={job.id}
                className="p-3 bg-lightGrey5 dark:bg-whiteColor-dark rounded-md border border-borderColor dark:border-borderColor-dark"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-blackColor dark:text-whiteColor">
                      {idx + 1}. {job.title}
                    </p>
                    <p className="text-sm text-contentColor dark:text-contentColor-dark">
                      {job.company}
                      {job.location && ` • ${job.location}`}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-bold text-primaryColor">
                      {job.application_count}
                    </p>
                    <p className="text-xs text-contentColor dark:text-contentColor-dark">
                      Applications
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
