/**
 * Finance Reconciliation Main Component
 * 
 * Displays reconciliation mismatches and exceptions
 */

"use client";

import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { useSettlements } from "@/hooks/api/useFinance.js";
import FinanceTable from "@/components/shared/finance/FinanceTable.js";
import SettlementStatusBadge from "@/components/shared/finance/SettlementStatusBadge.js";
import ReconciliationExceptionModal from "@/components/shared/finance/ReconciliationExceptionModal.js";

const FinanceReconciliationMain = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: "",
  });
  const [exceptions, setExceptions] = useState([]);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);
  const [selectedException, setSelectedException] = useState(null);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reportsData, setReportsData] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30days');

  // Chart refs
  const trendsChartRef = useRef(null);
  const trendsChartInstanceRef = useRef(null);
  const successRateChartRef = useRef(null);
  const successRateChartInstanceRef = useRef(null);
  const exceptionStatusChartRef = useRef(null);
  const exceptionStatusChartInstanceRef = useRef(null);

  const { data, isLoading, refetch } = useSettlements({ filters });

  useEffect(() => {
    fetchExceptions();
    fetchReports();
  }, [filters.page, selectedPeriod]);

  // Fetch reports data
  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const response = await fetch(
        `/api/admin/finance/reconciliation/reports?period=${selectedPeriod}`
      );
      const data = await response.json();
      if (data.success) {
        setReportsData(data.report);
      }
    } catch (err) {
      console.error("Fetch reports error:", err);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchExceptions = async () => {
    try {
      setExceptionsLoading(true);
      const response = await fetch(
        `/api/admin/finance/reconciliation/exceptions?page=${filters.page}&limit=${filters.limit}&status=open`
      );
      const data = await response.json();
      if (data.success) {
        setExceptions(data.exceptions || []);
      }
    } catch (err) {
      console.error("Fetch exceptions error:", err);
    } finally {
      setExceptionsLoading(false);
    }
  };

  const handleRunReconciliation = async () => {
    if (!confirm("Run reconciliation for latest settlements?")) {
      return;
    }

    setReconciling(true);
    try {
      const response = await fetch(`/api/admin/finance/reconciliation/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.success) {
        alert(
          `Reconciliation completed: ${data.summary.total} settlements processed, ${data.summary.mismatches} mismatches found`
        );
        refetch();
        fetchExceptions();
      } else {
        alert(data.error || "Failed to run reconciliation");
      }
    } catch (err) {
      console.error("Reconciliation error:", err);
      alert("Failed to run reconciliation");
    } finally {
      setReconciling(false);
    }
  };

  const handleViewException = async (exceptionId) => {
    try {
      const response = await fetch(
        `/api/admin/finance/reconciliation/exceptions/${exceptionId}`
      );
      const data = await response.json();
      if (data.success) {
        setSelectedException(data.exception);
        setShowExceptionModal(true);
      }
    } catch (err) {
      console.error("Fetch exception error:", err);
      alert("Failed to load exception details");
    }
  };

  const handleExceptionResolved = () => {
    fetchExceptions();
    refetch();
  };

  // Filter settlements with mismatches (those not reconciled or with issues)
  const mismatches = (data?.settlements || []).filter(
    (settlement) =>
      !settlement.reconciledAt ||
      settlement.status === "failed" ||
      Math.abs(settlement.amount - settlement.totalSplitAmount) > 1.0
  );

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Render trends chart
  useEffect(() => {
    if (!reportsData?.trends || reportsData.trends.length === 0) return;

    const ctx = trendsChartRef.current;
    if (!ctx) return;

    // Destroy existing chart
    if (trendsChartInstanceRef.current) {
      trendsChartInstanceRef.current.destroy();
      trendsChartInstanceRef.current = null;
    }

    const trends = [...reportsData.trends].reverse(); // Reverse to show chronological order
    const labels = trends.map((t) => {
      const date = new Date(t.date);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });

    trendsChartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Total Settlements",
            data: trends.map((t) => t.totalSettlements),
            borderColor: "#5F2DED",
            backgroundColor: "rgba(95, 45, 237, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Reconciled",
            data: trends.map((t) => t.reconciledCount),
            borderColor: "#10B981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Mismatches",
            data: trends.map((t) => t.mismatchCount),
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
            text: "Reconciliation Trends",
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
      if (trendsChartInstanceRef.current) {
        trendsChartInstanceRef.current.destroy();
      }
    };
  }, [reportsData?.trends]);

  // Render success rate chart
  useEffect(() => {
    if (!reportsData?.trends || reportsData.trends.length === 0) return;

    const ctx = successRateChartRef.current;
    if (!ctx) return;

    // Destroy existing chart
    if (successRateChartInstanceRef.current) {
      successRateChartInstanceRef.current.destroy();
      successRateChartInstanceRef.current = null;
    }

    const trends = [...reportsData.trends].reverse();
    const labels = trends.map((t) => {
      const date = new Date(t.date);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });

    successRateChartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Success Rate (%)",
            data: trends.map((t) => parseFloat(t.successRate)),
            borderColor: "#3B82F6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
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
            text: "Reconciliation Success Rate",
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
          },
        },
      },
    });

    return () => {
      if (successRateChartInstanceRef.current) {
        successRateChartInstanceRef.current.destroy();
      }
    };
  }, [reportsData?.trends]);

  // Render exception status pie chart
  useEffect(() => {
    if (!reportsData?.exceptionStatusDistribution || reportsData.exceptionStatusDistribution.length === 0) return;

    const ctx = exceptionStatusChartRef.current;
    if (!ctx) return;

    // Destroy existing chart
    if (exceptionStatusChartInstanceRef.current) {
      exceptionStatusChartInstanceRef.current.destroy();
      exceptionStatusChartInstanceRef.current = null;
    }

    const statusColors = {
      open: "#F59E0B",
      resolved: "#10B981",
      ignored: "#6B7280",
    };

    exceptionStatusChartInstanceRef.current = new Chart(ctx, {
      type: "pie",
      data: {
        labels: reportsData.exceptionStatusDistribution.map((s) => s.status.toUpperCase()),
        datasets: [
          {
            data: reportsData.exceptionStatusDistribution.map((s) => s.count),
            backgroundColor: reportsData.exceptionStatusDistribution.map(
              (s) => statusColors[s.status] || "#6B7280"
            ),
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
            text: "Exception Status Distribution",
          },
        },
      },
    });

    return () => {
      if (exceptionStatusChartInstanceRef.current) {
        exceptionStatusChartInstanceRef.current.destroy();
      }
    };
  }, [reportsData?.exceptionStatusDistribution]);

  const columns = [
    {
      key: "razorpaySettlementId",
      label: "Settlement ID",
      sortable: false,
      render: (value) => (
        <span className="font-mono text-12px">{value?.slice(0, 20)}...</span>
      ),
    },
    {
      key: "settledOn",
      label: "Settled On",
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: "amount",
      label: "Settlement Amount",
      sortable: true,
      render: (value) => (
        <span className="font-semibold">{formatCurrency(value)}</span>
      ),
    },
    {
      key: "totalSplitAmount",
      label: "Expected Amount",
      sortable: true,
      render: (value, row) => {
        const difference = row.amount - (value || 0);
        return (
          <div>
            <div>{formatCurrency(value || 0)}</div>
            {Math.abs(difference) > 1.0 && (
              <div className={`text-12px ${difference > 0 ? "text-red-500" : "text-greencolor"}`}>
                {difference > 0 ? "+" : ""}
                {formatCurrency(difference)} difference
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "paymentCount",
      label: "Payments",
      sortable: false,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => <SettlementStatusBadge status={value} />,
    },
    {
      key: "reconciledAt",
      label: "Reconciled",
      sortable: true,
      render: (value) => (value ? formatDate(value) : "Not Reconciled"),
    },
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px overflow-hidden">
        <div className="p-20px md:p-30px lg:p-40px">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-24px md:text-28px lg:text-32px font-bold text-blackColor dark:text-blackColor-dark mb-10px leading-tight">
                Reconciliation
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                View settlement reconciliation mismatches and exceptions
              </p>
            </div>
            <button
              onClick={handleRunReconciliation}
              disabled={reconciling}
              className="px-4 py-2 bg-primaryColor text-white rounded-lg font-medium hover:bg-primaryColor/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {reconciling ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Running...
                </>
              ) : (
                <>
                  <i className="icofont-refresh"></i>
                  Run Reconciliation
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards with Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-30px mb-30px">
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
          <div className="text-14px text-contentColor dark:text-contentColor-dark mb-5px">
            Total Mismatches
          </div>
          <div className="text-24px font-bold text-blackColor dark:text-blackColor-dark">
            {mismatches.length}
          </div>
        </div>
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
          <div className="text-14px text-contentColor dark:text-contentColor-dark mb-5px">
            Open Exceptions
          </div>
          <div className="text-24px font-bold text-red-500">
            {exceptions.filter((e) => e.status === "open").length}
          </div>
        </div>
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
          <div className="text-14px text-contentColor dark:text-contentColor-dark mb-5px">
            Unreconciled Settlements
          </div>
          <div className="text-24px font-bold text-blackColor dark:text-blackColor-dark">
            {mismatches.filter((s) => !s.reconciledAt).length}
          </div>
        </div>
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
          <div className="text-14px text-contentColor dark:text-contentColor-dark mb-5px">
            Failed Settlements
          </div>
          <div className="text-24px font-bold text-red-500">
            {mismatches.filter((s) => s.status === "failed").length}
          </div>
        </div>
        {reportsData && (
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px border-l-4 border-l-greencolor">
            <div className="text-14px text-contentColor dark:text-contentColor-dark mb-5px">
              Success Rate
            </div>
            <div className="text-24px font-bold text-greencolor">
              {parseFloat(reportsData.summary.successRate).toFixed(1)}%
            </div>
            <div className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
              {reportsData.summary.reconciledCount} / {reportsData.summary.totalSettlements}
            </div>
          </div>
        )}
      </div>

      {/* Analytics Section */}
      {reportsData && (
        <div className="mb-30px">
          {/* Period Selector */}
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px mb-30px">
            <div className="flex items-center justify-between mb-15px">
              <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark">
                Reconciliation Analytics
              </h2>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>

            {/* Analytics Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-15px">
              <div className="text-center p-15px bg-lightGrey5 dark:bg-darkdeep1 rounded-5">
                <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
                  Total Settlements
                </div>
                <div className="text-20px font-bold text-blackColor dark:text-blackColor-dark">
                  {reportsData.summary.totalSettlements}
                </div>
              </div>
              <div className="text-center p-15px bg-lightGrey5 dark:bg-darkdeep1 rounded-5">
                <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
                  Reconciled
                </div>
                <div className="text-20px font-bold text-greencolor">
                  {reportsData.summary.reconciledCount}
                </div>
              </div>
              <div className="text-center p-15px bg-lightGrey5 dark:bg-darkdeep1 rounded-5">
                <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
                  Mismatches
                </div>
                <div className="text-20px font-bold text-red-500">
                  {reportsData.summary.mismatchesCount}
                </div>
              </div>
              <div className="text-center p-15px bg-lightGrey5 dark:bg-darkdeep1 rounded-5">
                <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
                  Pending
                </div>
                <div className="text-20px font-bold text-yellow-500">
                  {reportsData.summary.pendingCount}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-30px">
            {/* Trends Chart */}
            <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
              <div className="h-64">
                <canvas ref={trendsChartRef}></canvas>
              </div>
            </div>

            {/* Success Rate Chart */}
            <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
              <div className="h-64">
                <canvas ref={successRateChartRef}></canvas>
              </div>
            </div>

            {/* Exception Status Chart */}
            {reportsData.exceptionStatusDistribution.length > 0 && (
              <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
                <div className="h-64">
                  <canvas ref={exceptionStatusChartRef}></canvas>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {reportsLoading && (
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-40px mb-30px text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-primaryColor border-t-transparent rounded-full mb-15px"></div>
          <p className="text-contentColor dark:text-contentColor-dark">Loading analytics...</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px p-20px">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-15px">
          <div>
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ page: 1, limit: 20, status: "" })}
              className="w-full px-15px py-10px bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark rounded-5 text-14px font-semibold hover:bg-lightGrey6 dark:hover:bg-darkdeep2"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Exceptions Table */}
      {exceptions.length > 0 && (
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px mb-30px">
          <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark mb-4">
            Reconciliation Exceptions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    Settlement ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    Expected
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    Actual
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    Difference
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor dark:divide-borderColor-dark">
                {exceptions.map((exception) => (
                  <tr
                    key={exception.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono">
                        {exception.razorpaySettlementId?.slice(0, 20)}...
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(exception.expectedAmount)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(exception.actualAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          exception.difference > 0
                            ? "text-red-600 dark:text-red-400 font-semibold"
                            : "text-green-600 dark:text-green-400 font-semibold"
                        }
                      >
                        {exception.difference > 0 ? "+" : ""}
                        {formatCurrency(exception.difference)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          exception.status === "open"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {exception.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleViewException(exception.id)}
                        className="text-primaryColor hover:text-primaryColor/80"
                      >
                        <i className="icofont-eye"></i> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settlements Table */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px">
        <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark mb-4">
          Settlement Mismatches
        </h2>
        <FinanceTable
          columns={columns}
          data={mismatches}
          loading={isLoading}
          emptyMessage="No reconciliation mismatches found"
          pagination={data?.pagination}
          itemsPerPage={filters.limit}
        />
      </div>

      {/* Exception Modal */}
      {showExceptionModal && (
        <ReconciliationExceptionModal
          exception={selectedException}
          isOpen={showExceptionModal}
          onClose={() => {
            setShowExceptionModal(false);
            setSelectedException(null);
          }}
          onResolve={handleExceptionResolved}
        />
      )}
    </div>
  );
};

export default FinanceReconciliationMain;

