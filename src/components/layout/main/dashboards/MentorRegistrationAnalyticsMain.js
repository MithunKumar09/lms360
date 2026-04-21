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

export default function MentorRegistrationAnalyticsMain() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [period, setPeriod] = useState("30");
  const [type, setType] = useState("all"); // 'events', 'workshops', 'all'

  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);
  const hourChartRef = useRef(null);
  const dayChartRef = useRef(null);

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['registration-analytics', period, type],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: period.toString(),
        type: type,
      });
      const response = await apiClient.get(`/mentors/analytics/registrations?${params.toString()}`);
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
    popular: { events: [], workshops: [] },
    patterns: { hour_of_day: [], day_of_week: [] },
    capacity_utilization: {
      avg_event_utilization: null,
      avg_workshop_utilization: null,
      events_with_capacity: 0,
      workshops_with_capacity: 0,
    },
  };

  // Line Chart: Registration Trends Over Time
  useEffect(() => {
    if (lineChartRef.current && analytics.trends?.daily) {
      const ctx = lineChartRef.current;
      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const trends = analytics.trends.daily;
      const labels = [...new Set(trends.map(t => t.date))].sort();
      
      const eventData = labels.map(date => {
        const eventTrend = trends.find(t => t.date === date && t.type === 'event');
        return eventTrend ? eventTrend.count : 0;
      });
      
      const workshopData = labels.map(date => {
        const workshopTrend = trends.find(t => t.date === date && t.type === 'workshop');
        return workshopTrend ? workshopTrend.count : 0;
      });

      const datasets = [];
      if (type === 'all' || type === 'events') {
        datasets.push({
          label: 'Events',
          data: eventData,
          borderColor: '#5F2DED',
          backgroundColor: 'rgba(95, 45, 237, 0.1)',
          tension: 0.4,
          fill: true,
        });
      }
      if (type === 'all' || type === 'workshops') {
        datasets.push({
          label: 'Workshops',
          data: workshopData,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true,
        });
      }

      ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels.map(date => format(new Date(date), 'MMM dd')),
          datasets,
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
              text: 'Registration Trends Over Time',
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
  }, [analytics.trends, type]);

  // Bar Chart: Popular Events/Workshops
  useEffect(() => {
    if (barChartRef.current && analytics.popular) {
      const ctx = barChartRef.current;
      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const popular = type === 'events' 
        ? analytics.popular.events.slice(0, 10)
        : type === 'workshops'
        ? analytics.popular.workshops.slice(0, 10)
        : [...analytics.popular.events.slice(0, 5), ...analytics.popular.workshops.slice(0, 5)];

      const labels = popular.map(item => item.title.length > 30 ? item.title.substring(0, 30) + '...' : item.title);
      const data = popular.map(item => item.registration_count);

      ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Registrations',
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
              text: 'Popular Events & Workshops',
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
  }, [analytics.popular, type]);

  // Bar Chart: Peak Registration Hours
  useEffect(() => {
    if (hourChartRef.current && analytics.patterns?.hour_of_day) {
      const ctx = hourChartRef.current;
      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const patterns = analytics.patterns.hour_of_day;
      const hours = Array.from({ length: 24 }, (_, i) => i);
      const eventData = hours.map(hour => {
        const pattern = patterns.find(p => p.hour_of_day === hour && p.type === 'event');
        return pattern ? pattern.count : 0;
      });
      const workshopData = hours.map(hour => {
        const pattern = patterns.find(p => p.hour_of_day === hour && p.type === 'workshop');
        return pattern ? pattern.count : 0;
      });

      const datasets = [];
      if (type === 'all' || type === 'events') {
        datasets.push({
          label: 'Events',
          data: eventData,
          backgroundColor: 'rgba(95, 45, 237, 0.6)',
          borderColor: '#5F2DED',
          borderWidth: 1,
        });
      }
      if (type === 'all' || type === 'workshops') {
        datasets.push({
          label: 'Workshops',
          data: workshopData,
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: '#10B981',
          borderWidth: 1,
        });
      }

      ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: hours.map(h => `${h}:00`),
          datasets,
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
              text: 'Peak Registration Hours',
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
  }, [analytics.patterns, type]);

  // Bar Chart: Peak Registration Days
  useEffect(() => {
    if (dayChartRef.current && analytics.patterns?.day_of_week) {
      const ctx = dayChartRef.current;
      if (ctx.chart) {
        ctx.chart.destroy();
      }

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const patterns = analytics.patterns.day_of_week;
      const days = Array.from({ length: 7 }, (_, i) => i);
      const eventData = days.map(day => {
        const pattern = patterns.find(p => p.day_of_week === day && p.type === 'event');
        return pattern ? pattern.count : 0;
      });
      const workshopData = days.map(day => {
        const pattern = patterns.find(p => p.day_of_week === day && p.type === 'workshop');
        return pattern ? pattern.count : 0;
      });

      const datasets = [];
      if (type === 'all' || type === 'events') {
        datasets.push({
          label: 'Events',
          data: eventData,
          backgroundColor: 'rgba(95, 45, 237, 0.6)',
          borderColor: '#5F2DED',
          borderWidth: 1,
        });
      }
      if (type === 'all' || type === 'workshops') {
        datasets.push({
          label: 'Workshops',
          data: workshopData,
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: '#10B981',
          borderWidth: 1,
        });
      }

      ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: dayNames,
          datasets,
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
              text: 'Peak Registration Days',
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
  }, [analytics.patterns, type]);

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
              <h1 className="h3 mb-2 fw-bold text-dark">Registration Analytics</h1>
              <p className="text-muted mb-0 small">
                View registration trends, patterns, and statistics
              </p>
            </div>
            <ExportButtonSimple
              data={[
                ...analytics.popular.events.map(e => ({
                  type: 'Event',
                  title: e.title,
                  start_date: e.start_date ? formatDateForCSV(e.start_date) : '',
                  registrations: e.registration_count,
                  utilization: e.utilization_percentage ? `${e.utilization_percentage}%` : 'N/A',
                })),
                ...analytics.popular.workshops.map(w => ({
                  type: 'Workshop',
                  title: w.title,
                  start_date: w.start_date ? formatDateForCSV(w.start_date) : '',
                  registrations: w.registration_count,
                  utilization: w.utilization_percentage ? `${w.utilization_percentage}%` : 'N/A',
                })),
              ]}
              headers={[
                { key: 'type', label: 'Type' },
                { key: 'title', label: 'Title' },
                { key: 'start_date', label: 'Start Date' },
                { key: 'registrations', label: 'Registrations' },
                { key: 'utilization', label: 'Utilization %' },
              ]}
              filename={`registration-analytics-${new Date().toISOString().split('T')[0]}`}
              variant="outline"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 mb-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="all">All (Events & Workshops)</option>
              <option value="events">Events Only</option>
              <option value="workshops">Workshops Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Total Registrations</p>
          <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
            {analytics.overview.total_registrations || 0}
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Unique Registrants</p>
          <p className="text-2xl font-bold text-primaryColor">
            {analytics.overview.unique_registrants || 0}
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Active Registrations</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {analytics.overview.active_registrations || 0}
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Paid Registrations</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {analytics.overview.paid_registrations || 0}
          </p>
        </div>
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Avg. Event Registrations</p>
          <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
            {analytics.overview.avg_event_registrations?.toFixed(1) || '0.0'}
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Avg. Workshop Registrations</p>
          <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
            {analytics.overview.avg_workshop_registrations?.toFixed(1) || '0.0'}
          </p>
        </div>
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Avg. Capacity Utilization</p>
          <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
            {analytics.capacity_utilization?.avg_event_utilization != null && 
             typeof analytics.capacity_utilization.avg_event_utilization === 'number'
              ? `${analytics.capacity_utilization.avg_event_utilization.toFixed(1)}%`
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Registration Trends */}
        <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
          <HeadingDashboard>Registration Trends</HeadingDashboard>
          <div className="h-64 mt-4">
            <canvas ref={lineChartRef}></canvas>
          </div>
        </div>

        {/* Popular Events/Workshops */}
        <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
          <HeadingDashboard>Popular Events & Workshops</HeadingDashboard>
          <div className="h-64 mt-4">
            <canvas ref={barChartRef}></canvas>
          </div>
        </div>

        {/* Peak Registration Hours */}
        <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
          <HeadingDashboard>Peak Registration Hours</HeadingDashboard>
          <div className="h-64 mt-4">
            <canvas ref={hourChartRef}></canvas>
          </div>
        </div>

        {/* Peak Registration Days */}
        <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
          <HeadingDashboard>Peak Registration Days</HeadingDashboard>
          <div className="h-64 mt-4">
            <canvas ref={dayChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* Popular Events/Workshops List */}
      {(analytics.popular.events.length > 0 || analytics.popular.workshops.length > 0) && (
        <div className="p-6 mb-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
          <HeadingDashboard>Top Events & Workshops</HeadingDashboard>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {type === 'all' || type === 'events' ? (
              <div>
                <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor mb-3">
                  Top Events
                </h3>
                <div className="space-y-2">
                  {analytics.popular.events.slice(0, 5).map((event, idx) => (
                    <div
                      key={event.id}
                      className="p-3 bg-lightGrey5 dark:bg-whiteColor-dark rounded-md border border-borderColor dark:border-borderColor-dark"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-blackColor dark:text-whiteColor">
                            {idx + 1}. {event.title}
                          </p>
                          {event.start_date && (
                            <p className="text-xs text-contentColor dark:text-contentColor-dark">
                              {format(new Date(event.start_date), 'PPP')}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-bold text-primaryColor">
                            {event.registration_count}
                          </p>
                          <p className="text-xs text-contentColor dark:text-contentColor-dark">
                            Registrations
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {type === 'all' || type === 'workshops' ? (
              <div>
                <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor mb-3">
                  Top Workshops
                </h3>
                <div className="space-y-2">
                  {analytics.popular.workshops.slice(0, 5).map((workshop, idx) => (
                    <div
                      key={workshop.id}
                      className="p-3 bg-lightGrey5 dark:bg-whiteColor-dark rounded-md border border-borderColor dark:border-borderColor-dark"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-blackColor dark:text-whiteColor">
                            {idx + 1}. {workshop.title}
                          </p>
                          {workshop.start_date && (
                            <p className="text-xs text-contentColor dark:text-contentColor-dark">
                              {format(new Date(workshop.start_date), 'PPP')}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-bold text-primaryColor">
                            {workshop.registration_count}
                          </p>
                          <p className="text-xs text-contentColor dark:text-contentColor-dark">
                            Registrations
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
