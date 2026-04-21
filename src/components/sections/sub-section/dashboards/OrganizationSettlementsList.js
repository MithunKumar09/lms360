/**
 * Organization Settlements List Component
 * 
 * Lists organization settlements with filters and pagination
 */

"use client";

import { useState } from "react";
import { useOrganizationSettlements } from "@/hooks/api/useOrganizationFinance";
import FinanceTable from "@/components/shared/finance/FinanceTable";

const OrganizationSettlementsList = ({ orgId }) => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: "",
    from: "",
    to: "",
  });

  const { data, isLoading } = useOrganizationSettlements(orgId, { filters });

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
    });
  };

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
      key: "organizationAmount",
      label: "Organization Amount",
      sortable: true,
      render: (value) => (
        <span className="font-semibold">{formatCurrency(value)}</span>
      ),
    },
    {
      key: "settlementAmount",
      label: "Total Settlement",
      sortable: true,
      render: (value) => formatCurrency(value),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span className={`px-10px py-5px rounded-5 text-12px font-semibold ${
          value === 'processed' ? 'bg-greencolor/20 text-greencolor' :
          value === 'pending' ? 'bg-yellow-500/20 text-yellow-600' :
          'bg-red-500/20 text-red-600'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: "paymentCount",
      label: "Payments",
      sortable: false,
    },
    {
      key: "utr",
      label: "UTR",
      sortable: false,
      render: (value) => value || "-",
    },
  ];

  const settlements = data?.settlements || [];
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
        data={settlements}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage="No settlements found"
      />
    </div>
  );
};

export default OrganizationSettlementsList;

