/**
 * Finance Webhook Logs Main Component
 * 
 * Displays webhook logs with replay functionality
 */

"use client";

import { useState } from "react";
import { useWebhookLogs, useReplayWebhook } from "@/hooks/api/useFinance.js";
import WebhookEventList from "@/components/shared/finance/WebhookEventList.js";

const FinanceWebhookLogsMain = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    status: "",
    eventType: "",
    search: "",
    startDate: "",
    endDate: "",
  });

  const { data, isLoading, refetch } = useWebhookLogs({ filters });
  const replayWebhookMutation = useReplayWebhook();

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleReplay = async (webhookLogId) => {
    try {
      await replayWebhookMutation.mutateAsync(webhookLogId);
      refetch();
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Calculate statistics from data
  const stats = data?.logs
    ? {
        total: data.pagination?.total || 0,
        processed: data.logs.filter((log) => log.status === "processed").length,
        failed: data.logs.filter((log) => log.status === "failed").length,
        pending: data.logs.filter((log) => log.status === "pending").length,
      }
    : { total: 0, processed: 0, failed: 0, pending: 0 };

  const successRate =
    stats.total > 0
      ? ((stats.processed / stats.total) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px overflow-hidden">
        <div className="p-20px md:p-30px lg:p-40px">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-24px md:text-28px lg:text-32px font-bold text-blackColor dark:text-blackColor-dark mb-10px leading-tight">
                Webhook Logs
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                Monitor and replay Razorpay webhook events
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-15px mb-30px">
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
            <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
              Total Webhooks
            </div>
            <div className="text-24px font-bold text-blackColor dark:text-blackColor-dark">
              {stats.total}
            </div>
          </div>
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
            <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
              Processed
            </div>
            <div className="text-24px font-bold text-green-600">
              {stats.processed}
            </div>
          </div>
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
            <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
              Failed
            </div>
            <div className="text-24px font-bold text-red-600">
              {stats.failed}
            </div>
          </div>
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
            <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
              Success Rate
            </div>
            <div className="text-24px font-bold text-primaryColor">
              {successRate}%
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px p-20px">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-15px mb-15px">
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
              <option value="retrying">Retrying</option>
            </select>
          </div>
          <div>
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              Event Type
            </label>
            <select
              value={filters.eventType}
              onChange={(e) => handleFilterChange("eventType", e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            >
              <option value="">All Events</option>
              <option value="payment.captured">Payment Captured</option>
              <option value="payment.failed">Payment Failed</option>
              <option value="order.paid">Order Paid</option>
              <option value="refund.processed">Refund Processed</option>
              <option value="refund.created">Refund Created</option>
              <option value="settlement.processed">Settlement Processed</option>
              <option value="payout.processed">Payout Processed</option>
              <option value="payout.failed">Payout Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            />
          </div>
          <div>
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-15px">
          <div>
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              Search (Event ID, Order ID, Payment ID)
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="Search by event ID, order ID, or payment ID..."
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() =>
                setFilters({
                  page: 1,
                  limit: 50,
                  status: "",
                  eventType: "",
                  search: "",
                  startDate: "",
                  endDate: "",
                })
              }
              className="w-full px-15px py-10px bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark rounded-5 text-14px font-semibold hover:bg-lightGrey6 dark:hover:bg-darkdeep2"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Webhook Events List */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px">
        <WebhookEventList
          events={data?.logs || []}
          onReplay={handleReplay}
          loading={isLoading}
        />

        {/* Pagination */}
        {data?.pagination && data.pagination.pages > 1 && (
          <div className="mt-20px flex justify-center">
            <div className="flex gap-10px">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page === 1}
                className="px-15px py-10px bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark rounded-5 text-14px font-semibold hover:bg-lightGrey6 dark:hover:bg-darkdeep2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-15px py-10px text-14px text-contentColor dark:text-contentColor-dark">
                Page {filters.page} of {data.pagination.pages}
              </span>
              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page >= data.pagination.pages}
                className="px-15px py-10px bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark rounded-5 text-14px font-semibold hover:bg-lightGrey6 dark:hover:bg-darkdeep2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceWebhookLogsMain;

