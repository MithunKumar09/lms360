/**
 * Finance Analytics Main Component
 * 
 * Comprehensive payment analytics dashboard with charts and trends
 */

"use client";

import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const FinanceAnalyticsMain = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [selectedGroupBy, setSelectedGroupBy] = useState('day');

  // Chart refs
  const revenueTrendChartRef = useRef(null);
  const revenueTrendChartInstanceRef = useRef(null);
  const paymentMethodChartRef = useRef(null);
  const paymentMethodChartInstanceRef = useRef(null);
  const refundRateChartRef = useRef(null);
  const refundRateChartInstanceRef = useRef(null);
  const orderStatusChartRef = useRef(null);
  const orderStatusChartInstanceRef = useRef(null);
  const avgOrderValueChartRef = useRef(null);
  const avgOrderValueChartInstanceRef = useRef(null);
  const paymentSuccessChartRef = useRef(null);
  const paymentSuccessChartInstanceRef = useRef(null);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod, selectedGroupBy]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/admin/finance/analytics?period=${selectedPeriod}&groupBy=${selectedGroupBy}`
      );
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (err) {
      console.error("Fetch analytics error:", err);
      setError("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  // Render revenue trends chart
  useEffect(() => {
    if (!analytics?.revenueTrends || analytics.revenueTrends.length === 0) return;

    const ctx = revenueTrendChartRef.current;
    if (!ctx) return;

    // Destroy existing chart
    if (revenueTrendChartInstanceRef.current) {
      revenueTrendChartInstanceRef.current.destroy();
      revenueTrendChartInstanceRef.current = null;
    }

    const trends = analytics.revenueTrends;
    const labels = trends.map((t) => {
      const date = new Date(t.period);
      if (selectedGroupBy === 'month') {
        return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      } else if (selectedGroupBy === 'week') {
        return `Week ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      }
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });

    revenueTrendChartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Revenue",
            data: trends.map((t) => t.revenue),
            borderColor: "#10B981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            tension: 0.4,
            fill: true,
            yAxisID: "y",
          },
          {
            label: "Orders",
            data: trends.map((t) => t.orderCount),
            borderColor: "#3B82F6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.4,
            fill: true,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
          },
          title: {
            display: true,
            text: "Revenue & Orders Trends",
          },
        },
        scales: {
          y: {
            type: "linear",
            display: true,
            position: "left",
            beginAtZero: true,
            title: {
              display: true,
              text: "Revenue (INR)",
            },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            beginAtZero: true,
            title: {
              display: true,
              text: "Orders",
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    });

    return () => {
      if (revenueTrendChartInstanceRef.current) {
        revenueTrendChartInstanceRef.current.destroy();
      }
    };
  }, [analytics?.revenueTrends, selectedGroupBy]);

  // Render payment method distribution chart
  useEffect(() => {
    if (!analytics?.paymentMethods || analytics.paymentMethods.length === 0) return;

    const ctx = paymentMethodChartRef.current;
    if (!ctx) return;

    // Destroy existing chart
    if (paymentMethodChartInstanceRef.current) {
      paymentMethodChartInstanceRef.current.destroy();
      paymentMethodChartInstanceRef.current = null;
    }

    const methods = analytics.paymentMethods;
    const colors = ['#5F2DED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899'];

    paymentMethodChartInstanceRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: methods.map((m) => m.method.toUpperCase()),
        datasets: [
          {
            data: methods.map((m) => m.totalAmount),
            backgroundColor: colors.slice(0, methods.length),
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
            text: "Payment Method Distribution",
          },
        },
      },
    });

    return () => {
      if (paymentMethodChartInstanceRef.current) {
        paymentMethodChartInstanceRef.current.destroy();
      }
    };
  }, [analytics?.paymentMethods]);

  // Render refund rate chart
  useEffect(() => {
    if (!analytics?.revenueTrends || analytics.revenueTrends.length === 0) return;

    const ctx = refundRateChartRef.current;
    if (!ctx) return;

    // Destroy existing chart
    if (refundRateChartInstanceRef.current) {
      refundRateChartInstanceRef.current.destroy();
      refundRateChartInstanceRef.current = null;
    }

    const trends = analytics.revenueTrends;
    const labels = trends.map((t) => {
      const date = new Date(t.period);
      if (selectedGroupBy === 'month') {
        return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      } else if (selectedGroupBy === 'week') {
        return `Week ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      }
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });

    // Calculate refund rate per period (simplified - actual refund data would be better)
    const refundRates = trends.map((t) => {
      // This is a simplified calculation - ideally we'd have refund data per period
      return analytics.summary.refundRate || 0;
    });

    refundRateChartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Refund Rate (%)",
            data: refundRates,
            borderColor: "#EF4444",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          title: {
            display: true,
            text: "Refund Rate Trend",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function (value) {
                return value + "%";
              },
            },
            title: {
              display: true,
              text: "Refund Rate (%)",
            },
          },
        },
      },
    });

    return () => {
      if (refundRateChartInstanceRef.current) {
        refundRateChartInstanceRef.current.destroy();
      }
    };
  }, [analytics, selectedGroupBy]);

  // Render order status distribution chart
  useEffect(() => {
    if (!analytics?.orderStatusDistribution || analytics.orderStatusDistribution.length === 0) return;

    const ctx = orderStatusChartRef.current;
    if (!ctx) return;

    // Destroy existing chart
    if (orderStatusChartInstanceRef.current) {
      orderStatusChartInstanceRef.current.destroy();
      orderStatusChartInstanceRef.current = null;
    }

    const statuses = analytics.orderStatusDistribution;
    const statusColors = {
      paid: "#10B981",
      created: "#F59E0B",
      failed: "#EF4444",
      cancelled: "#6B7280",
      expired: "#9CA3AF",
    };

    orderStatusChartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: statuses.map((s) => s.status.toUpperCase()),
        datasets: [
          {
            label: "Order Count",
            data: statuses.map((s) => s.orderCount),
            backgroundColor: statuses.map((s) => statusColors[s.status] || "#6B7280"),
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
            text: "Order Status Distribution",
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

    return () => {
      if (orderStatusChartInstanceRef.current) {
        orderStatusChartInstanceRef.current.destroy();
      }
    };
  }, [analytics?.orderStatusDistribution]);

  // Render average order value chart
  useEffect(() => {
    if (!analytics?.avgOrderValueTrends || analytics.avgOrderValueTrends.length === 0) return;

    const ctx = avgOrderValueChartRef.current;
    if (!ctx) return;

    // Destroy existing chart
    if (avgOrderValueChartInstanceRef.current) {
      avgOrderValueChartInstanceRef.current.destroy();
      avgOrderValueChartInstanceRef.current = null;
    }

    const trends = analytics.avgOrderValueTrends;
    const labels = trends.map((t) => {
      const date = new Date(t.period);
      if (selectedGroupBy === 'month') {
        return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      } else if (selectedGroupBy === 'week') {
        return `Week ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      }
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });

    avgOrderValueChartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Average Order Value",
            data: trends.map((t) => t.avgOrderValue),
            borderColor: "#8B5CF6",
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          title: {
            display: true,
            text: "Average Order Value Trend",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Amount (INR)",
            },
          },
        },
      },
    });

    return () => {
      if (avgOrderValueChartInstanceRef.current) {
        avgOrderValueChartInstanceRef.current.destroy();
      }
    };
  }, [analytics?.avgOrderValueTrends, selectedGroupBy]);

  // Render payment success rate chart
  useEffect(() => {
    if (!analytics?.paymentSuccessTrends || analytics.paymentSuccessTrends.length === 0) return;

    const ctx = paymentSuccessChartRef.current;
    if (!ctx) return;

    // Destroy existing chart
    if (paymentSuccessChartInstanceRef.current) {
      paymentSuccessChartInstanceRef.current.destroy();
      paymentSuccessChartInstanceRef.current = null;
    }

    const trends = analytics.paymentSuccessTrends;
    const labels = trends.map((t) => {
      const date = new Date(t.period);
      if (selectedGroupBy === 'month') {
        return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      } else if (selectedGroupBy === 'week') {
        return `Week ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      }
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });

    paymentSuccessChartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Success Rate (%)",
            data: trends.map((t) => parseFloat(t.successRate)),
            borderColor: "#10B981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          title: {
            display: true,
            text: "Payment Success Rate Trend",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function (value) {
                return value + "%";
              },
            },
            title: {
              display: true,
              text: "Success Rate (%)",
            },
          },
        },
      },
    });

    return () => {
      if (paymentSuccessChartInstanceRef.current) {
        paymentSuccessChartInstanceRef.current.destroy();
      }
    };
  }, [analytics?.paymentSuccessTrends, selectedGroupBy]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-40px text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-primaryColor border-t-transparent rounded-full mb-15px"></div>
          <p className="text-contentColor dark:text-contentColor-dark">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px">
          <div className="text-center py-20px">
            <p className="text-red-500 text-14px mb-10px">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="px-20px py-10px bg-primaryColor text-whiteColor rounded-5 text-14px font-semibold hover:bg-primaryColor/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px overflow-hidden">
        <div className="p-20px md:p-30px lg:p-40px">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-20px">
            <div className="flex-1">
              <h1 className="text-24px md:text-28px lg:text-32px font-bold text-blackColor dark:text-blackColor-dark mb-10px leading-tight">
                Payment Analytics
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                Comprehensive payment analytics, revenue trends, and insights
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-15px">
            <div>
              <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Time Period
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="1year">Last year</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div>
              <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Group By
              </label>
              <select
                value={selectedGroupBy}
                onChange={(e) => setSelectedGroupBy(e.target.value)}
                className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-30px mb-30px">
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px border-l-4 border-l-greencolor">
          <div className="text-14px text-contentColor dark:text-contentColor-dark mb-5px">
            Total Revenue
          </div>
          <div className="text-24px font-bold text-blackColor dark:text-blackColor-dark">
            {formatCurrency(analytics.summary.totalRevenue)}
          </div>
        </div>
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px border-l-4 border-l-blue-500">
          <div className="text-14px text-contentColor dark:text-contentColor-dark mb-5px">
            Total Orders
          </div>
          <div className="text-24px font-bold text-blackColor dark:text-blackColor-dark">
            {analytics.summary.totalOrders.toLocaleString()}
          </div>
        </div>
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px border-l-4 border-l-red-500">
          <div className="text-14px text-contentColor dark:text-contentColor-dark mb-5px">
            Refund Rate
          </div>
          <div className="text-24px font-bold text-blackColor dark:text-blackColor-dark">
            {parseFloat(analytics.summary.refundRate).toFixed(2)}%
          </div>
        </div>
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px border-l-4 border-l-purple-500">
          <div className="text-14px text-contentColor dark:text-contentColor-dark mb-5px">
            Avg Order Value
          </div>
          <div className="text-24px font-bold text-blackColor dark:text-blackColor-dark">
            {formatCurrency(analytics.summary.averageOrderValue)}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-30px mb-30px">
        {/* Revenue Trends */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
          <div className="h-64">
            <canvas ref={revenueTrendChartRef}></canvas>
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
          <div className="h-64">
            <canvas ref={paymentMethodChartRef}></canvas>
          </div>
        </div>

        {/* Payment Success Rate */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
          <div className="h-64">
            <canvas ref={paymentSuccessChartRef}></canvas>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
          <div className="h-64">
            <canvas ref={avgOrderValueChartRef}></canvas>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
          <div className="h-64">
            <canvas ref={orderStatusChartRef}></canvas>
          </div>
        </div>

        {/* Refund Rate Trend */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
          <div className="h-64">
            <canvas ref={refundRateChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* Payment Methods Table */}
      {analytics.paymentMethods && analytics.paymentMethods.length > 0 && (
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px mb-30px">
          <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-20px">
            Payment Methods Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Total Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Payments</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Successful</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Failed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor dark:divide-borderColor-dark">
                {analytics.paymentMethods.map((method) => (
                  <tr key={method.method} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-semibold">{method.method.toUpperCase()}</td>
                    <td className="px-4 py-3">{formatCurrency(method.totalAmount)}</td>
                    <td className="px-4 py-3">{method.paymentCount}</td>
                    <td className="px-4 py-3 text-greencolor">{method.successfulCount}</td>
                    <td className="px-4 py-3 text-red-500">{method.failedCount}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${parseFloat(method.successRate) >= 90 ? 'text-greencolor' : parseFloat(method.successRate) >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {parseFloat(method.successRate).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Customers */}
      {analytics.topCustomers && analytics.topCustomers.length > 0 && (
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px mb-30px">
          <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-20px">
            Top Customers
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor dark:divide-borderColor-dark">
                {analytics.topCustomers.map((customer) => (
                  <tr key={customer.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-semibold">{customer.name}</td>
                    <td className="px-4 py-3 text-contentColor dark:text-contentColor-dark">{customer.email}</td>
                    <td className="px-4 py-3">{customer.orderCount}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(customer.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refund Statistics */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px">
        <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-20px">
          Refund Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-20px">
          <div className="text-center p-15px bg-lightGrey5 dark:bg-darkdeep1 rounded-5">
            <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
              Total Refunds
            </div>
            <div className="text-20px font-bold text-blackColor dark:text-blackColor-dark">
              {analytics.refundStats.totalRefunds}
            </div>
          </div>
          <div className="text-center p-15px bg-lightGrey5 dark:bg-darkdeep1 rounded-5">
            <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
              Total Refund Amount
            </div>
            <div className="text-20px font-bold text-red-500">
              {formatCurrency(analytics.refundStats.totalRefundAmount)}
            </div>
          </div>
          <div className="text-center p-15px bg-lightGrey5 dark:bg-darkdeep1 rounded-5">
            <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
              Processed
            </div>
            <div className="text-20px font-bold text-greencolor">
              {analytics.refundStats.processedRefunds}
            </div>
          </div>
          <div className="text-center p-15px bg-lightGrey5 dark:bg-darkdeep1 rounded-5">
            <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
              Pending
            </div>
            <div className="text-20px font-bold text-yellow-500">
              {analytics.refundStats.pendingRefunds}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceAnalyticsMain;
