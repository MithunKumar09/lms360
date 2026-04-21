/**
 * Finance Payment Splits Main Component
 * 
 * Displays payment splits with filters
 */

"use client";

import { useState } from "react";
import { usePaymentSplits } from "@/hooks/api/useFinance.js";
import FinanceTable from "@/components/shared/finance/FinanceTable.js";

const FinancePaymentSplitsMain = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    status: "",
    entityType: "",
    settlementId: "",
  });

  const { data, isLoading } = usePaymentSplits({ filters });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const columns = [
    {
      key: "razorpayOrderId",
      label: "Order ID",
      sortable: false,
      render: (value) => (
        <span className="font-mono text-12px">{value?.slice(0, 20)}...</span>
      ),
    },
    {
      key: "itemType",
      label: "Item Type",
      sortable: true,
      render: (value) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: "entityType",
      label: "Entity",
      sortable: true,
      render: (value) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (value) => (
        <span className="font-semibold">{formatCurrency(value)}</span>
      ),
    },
    {
      key: "percentage",
      label: "Percentage",
      sortable: true,
      render: (value) => `${parseFloat(value).toFixed(2)}%`,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => {
        const configs = {
          pending: { label: "Pending", className: "bg-yellow-500 text-white" },
          settled: { label: "Settled", className: "bg-greencolor text-white" },
          on_hold: { label: "On Hold", className: "bg-orange-500 text-white" },
          reversed: { label: "Reversed", className: "bg-red-500 text-white" },
        };
        const config = configs[value] || { label: value, className: "bg-gray-400 text-white" };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: "userEmail",
      label: "User",
      sortable: false,
      render: (value) => value || "N/A",
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
                Payment Splits
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                View payment distribution between platform, vendors, and taxes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px p-20px">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-15px">
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
              <option value="settled">Settled</option>
              <option value="on_hold">On Hold</option>
              <option value="reversed">Reversed</option>
            </select>
          </div>
          <div>
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              Entity Type
            </label>
            <select
              value={filters.entityType}
              onChange={(e) => handleFilterChange("entityType", e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            >
              <option value="">All Types</option>
              <option value="platform">Platform</option>
              <option value="vendor">Vendor</option>
              <option value="tax">Tax</option>
              <option value="fee">Fee</option>
            </select>
          </div>
          <div>
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              Settlement ID
            </label>
            <input
              type="text"
              value={filters.settlementId}
              onChange={(e) => handleFilterChange("settlementId", e.target.value)}
              placeholder="Filter by settlement"
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ page: 1, limit: 50, status: "", entityType: "", settlementId: "" })}
              className="w-full px-15px py-10px bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark rounded-5 text-14px font-semibold hover:bg-lightGrey6 dark:hover:bg-darkdeep2"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px">
        <FinanceTable
          columns={columns}
          data={data?.splits || []}
          loading={isLoading}
          emptyMessage="No payment splits found"
          pagination={data?.pagination}
          onPageChange={handlePageChange}
          itemsPerPage={filters.limit}
        />
      </div>
    </div>
  );
};

export default FinancePaymentSplitsMain;

