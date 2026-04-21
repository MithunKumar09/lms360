/**
 * Finance Transactions Main Component
 * 
 * Displays payment transactions listing with filters, pagination, and search
 */

"use client";

import { useState } from "react";
import { useTransactions } from "@/hooks/api/useFinance.js";

const FinanceTransactionsMain = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: "",
    method: "",
    fromDate: "",
    toDate: "",
    userId: "",
  });

  const { data, isLoading } = useTransactions({ filters });

  const transactions = data?.transactions || [];
  const pagination = data?.pagination || {};

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status) => {
    const configs = {
      captured: { label: "Captured", className: "bg-greencolor text-white" },
      failed: { label: "Failed", className: "bg-red-500 text-white" },
      pending: { label: "Pending", className: "bg-yellow-500 text-white" },
    };
    const config = configs[status] || { label: status, className: "bg-gray-400 text-white" };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px overflow-hidden">
        <div className="p-20px md:p-30px lg:p-40px">
          <h1 className="text-24px md:text-28px lg:text-32px font-bold text-blackColor dark:text-blackColor-dark mb-10px leading-tight">
            Payment Transactions
          </h1>
          <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
            View and monitor all payment transactions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px mb-30px">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-15px">
          <div>
            <label className="block text-14px font-medium text-blackColor dark:text-blackColor-dark mb-8px">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            >
              <option value="">All Status</option>
              <option value="captured">Captured</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-14px font-medium text-blackColor dark:text-blackColor-dark mb-8px">
              Payment Method
            </label>
            <select
              value={filters.method}
              onChange={(e) => handleFilterChange("method", e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            >
              <option value="">All Methods</option>
              <option value="card">Card</option>
              <option value="netbanking">Net Banking</option>
              <option value="upi">UPI</option>
              <option value="wallet">Wallet</option>
            </select>
          </div>
          <div>
            <label className="block text-14px font-medium text-blackColor dark:text-blackColor-dark mb-8px">
              From Date
            </label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange("fromDate", e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            />
          </div>
          <div>
            <label className="block text-14px font-medium text-blackColor dark:text-blackColor-dark mb-8px">
              To Date
            </label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => handleFilterChange("toDate", e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            />
          </div>
          <div>
            <label className="block text-14px font-medium text-blackColor dark:text-blackColor-dark mb-8px">
              User ID (optional)
            </label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => handleFilterChange("userId", e.target.value)}
              placeholder="Search by user ID"
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark overflow-hidden">
        <div className="p-20px md:p-30px">
          {isLoading ? (
            <div className="text-center py-50px">
              <div className="inline-block animate-spin rounded-full h-32px w-32px border-b-2 border-primaryColor"></div>
              <p className="mt-15px text-contentColor dark:text-contentColor-dark">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-50px">
              <p className="text-contentColor dark:text-contentColor-dark">No transactions found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-borderColor dark:border-borderColor-dark">
                      <th className="text-left py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                        Payment ID
                      </th>
                      <th className="text-left py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                        User
                      </th>
                      <th className="text-left py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                        Order / Item
                      </th>
                      <th className="text-right py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                        Amount
                      </th>
                      <th className="text-left py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                        Method
                      </th>
                      <th className="text-left py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                        Status
                      </th>
                      <th className="text-left py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-borderColor dark:border-borderColor-dark hover:bg-lightGrey5 dark:hover:bg-darkdeep1"
                      >
                        <td className="py-15px px-15px text-14px text-blackColor dark:text-blackColor-dark font-mono text-xs">
                          {transaction.razorpayPaymentId?.slice(0, 12)}...
                        </td>
                        <td className="py-15px px-15px text-14px text-blackColor dark:text-blackColor-dark">
                          {transaction.order?.userName || transaction.order?.userEmail || "N/A"}
                        </td>
                        <td className="py-15px px-15px text-14px text-blackColor dark:text-blackColor-dark">
                          <div>
                            <div className="font-medium">{transaction.order?.itemTitle || `${transaction.order?.itemType}`}</div>
                            <div className="text-xs text-contentColor dark:text-contentColor-dark">Order: {transaction.order?.id?.slice(0, 8)}...</div>
                          </div>
                        </td>
                        <td className="py-15px px-15px text-14px text-blackColor dark:text-blackColor-dark text-right font-semibold">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="py-15px px-15px text-14px text-contentColor dark:text-contentColor-dark">
                          {transaction.method || "N/A"}
                        </td>
                        <td className="py-15px px-15px text-14px">
                          {getStatusBadge(transaction.status)}
                        </td>
                        <td className="py-15px px-15px text-14px text-contentColor dark:text-contentColor-dark">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="mt-30px flex items-center justify-between">
                  <div className="text-14px text-contentColor dark:text-contentColor-dark">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
                  </div>
                  <div className="flex gap-10px">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="px-15px py-8px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className="px-15px py-8px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinanceTransactionsMain;

