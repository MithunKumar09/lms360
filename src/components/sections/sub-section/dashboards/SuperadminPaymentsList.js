/**
 * Superadmin Payments List Component
 * 
 * Lists superadmin payments with filters and pagination
 */

"use client";

import { useState } from "react";
import { useSuperadminPayments } from "@/hooks/api/useSuperadminFinance";
import FinanceTable from "@/components/shared/finance/FinanceTable";

const SuperadminPaymentsList = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: "",
    from: "",
    to: "",
  });

  const { data, isLoading } = useSuperadminPayments({ filters });

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

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const columns = [
    {
      key: "payment.razorpayPaymentId",
      label: "Payment ID",
      sortable: false,
      render: (value, row) => (
        <span className="font-mono text-12px">{row.payment?.razorpayPaymentId?.slice(0, 20)}...</span>
      ),
    },
    {
      key: "order.itemType",
      label: "Item Type",
      sortable: false,
      render: (value, row) => (
        <span className="capitalize">{row.order?.itemType || "N/A"}</span>
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
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span className={`px-10px py-5px rounded-5 text-12px font-semibold ${
          value === 'settled' ? 'bg-greencolor/20 text-greencolor' :
          value === 'pending' ? 'bg-yellow-500/20 text-yellow-600' :
          'bg-red-500/20 text-red-600'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: "user.name",
      label: "User",
      sortable: false,
      render: (value, row) => (
        <div>
          {row.user ? (
            <>
              <div className="font-semibold text-blackColor dark:text-blackColor-dark">
                {row.user.name || "N/A"}
              </div>
              <div className="text-12px text-contentColor dark:text-contentColor-dark">
                {row.user.email}
              </div>
            </>
          ) : (
            <span className="text-contentColor dark:text-contentColor-dark">N/A</span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: "settledAt",
      label: "Settled",
      sortable: true,
      render: (value) => (value ? formatDate(value) : "-"),
    },
  ];

  const payments = data?.payments || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 };

  return (
    <div className="w-full">
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
              <option value="reversed">Reversed</option>
            </select>
          </div>
          <div>
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              From Date
            </label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => handleFilterChange("from", e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            />
          </div>
          <div>
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              To Date
            </label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => handleFilterChange("to", e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <FinanceTable
        columns={columns}
        data={payments}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage="No payments found"
      />
    </div>
  );
};

export default SuperadminPaymentsList;

