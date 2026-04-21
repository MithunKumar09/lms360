/**
 * Finance Settlements Main Component
 * 
 * Displays settlements list with filters
 */

"use client";

import { useState } from "react";
import { useSettlements } from "@/hooks/api/useFinance.js";
import FinanceTable from "@/components/shared/finance/FinanceTable.js";
import SettlementStatusBadge from "@/components/shared/finance/SettlementStatusBadge.js";

const FinanceSettlementsMain = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: "",
    fromDate: "",
    toDate: "",
  });
  const [sortColumn, setSortColumn] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");

  const { data, isLoading } = useSettlements({ filters });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSort = (column, order) => {
    setSortColumn(column);
    setSortOrder(order);
    // TODO: Implement server-side sorting
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

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const columns = [
    {
      key: "razorpaySettlementId",
      label: "Settlement ID",
      sortable: true,
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
      label: "Amount",
      sortable: true,
      render: (value) => formatCurrency(value),
    },
    {
      key: "fees",
      label: "Fees",
      sortable: true,
      render: (value) => formatCurrency(value),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => <SettlementStatusBadge status={value} />,
    },
    {
      key: "paymentCount",
      label: "Payments",
      sortable: false,
    },
    {
      key: "reconciledAt",
      label: "Reconciled",
      sortable: true,
      render: (value) => (value ? formatDate(value) : "Pending"),
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
                Settlements
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                View and manage settlement records from Razorpay
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
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              From Date
            </label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange("fromDate", e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            />
          </div>
          <div>
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              To Date
            </label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => handleFilterChange("toDate", e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ page: 1, limit: 20, status: "", fromDate: "", toDate: "" })}
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
          data={data?.settlements || []}
          loading={isLoading}
          emptyMessage="No settlements found"
          onSort={handleSort}
          sortColumn={sortColumn}
          sortOrder={sortOrder}
          pagination={data?.pagination}
          onPageChange={handlePageChange}
          itemsPerPage={filters.limit}
        />
      </div>
    </div>
  );
};

export default FinanceSettlementsMain;

