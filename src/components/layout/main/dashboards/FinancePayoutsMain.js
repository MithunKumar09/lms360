/**
 * Finance Payouts Main Component
 * 
 * Displays payouts list with approval actions
 */

"use client";

import { useState } from "react";
import { usePayouts, useProcessPayout } from "@/hooks/api/useFinance.js";
import FinanceTable from "@/components/shared/finance/FinanceTable.js";
import PayoutStatusBadge from "@/components/shared/finance/PayoutStatusBadge.js";
import PayoutApprovalModal from "@/components/shared/finance/PayoutApprovalModal.js";

const FinancePayoutsMain = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: "",
    vendorId: "",
  });
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const { data, isLoading, refetch } = usePayouts({ filters });
  const processPayoutMutation = useProcessPayout();

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleApprove = (payout) => {
    setSelectedPayout(payout);
    setShowApprovalModal(true);
  };

  const handleProcessAction = async (action) => {
    if (!selectedPayout) return;

    try {
      await processPayoutMutation.mutateAsync({
        payoutId: selectedPayout.id,
        action,
      });
      setShowApprovalModal(false);
      setSelectedPayout(null);
      refetch();
    } catch (error) {
      // Error handled by mutation
    }
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
      key: "vendorName",
      label: "Vendor",
      sortable: false,
      render: (value, row) => (
        <div>
          <div className="font-semibold text-blackColor dark:text-blackColor-dark">
            {row.vendorName || row.vendorEmail}
          </div>
          <div className="text-12px text-contentColor dark:text-contentColor-dark">
            {row.vendorEmail}
          </div>
        </div>
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
      render: (value) => <PayoutStatusBadge status={value} />,
    },
    {
      key: "mode",
      label: "Mode",
      sortable: false,
      render: (value) => value || "N/A",
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: "processedAt",
      label: "Processed",
      sortable: true,
      render: (value) => (value ? formatDate(value) : "-"),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-10px">
          {(row.status === "queued" || row.status === "failed") && (
            <button
              onClick={() => handleApprove(row)}
              className="px-10px py-5px bg-primaryColor text-whiteColor rounded-5 text-12px font-semibold hover:bg-primaryColor/90"
            >
              {row.status === "failed" ? "Retry" : "Approve"}
            </button>
          )}
          {row.status === "queued" && (
            <button
              onClick={() => handleProcessAction("reject")}
              className="px-10px py-5px bg-red-500 text-whiteColor rounded-5 text-12px font-semibold hover:bg-red-600"
            >
              Reject
            </button>
          )}
        </div>
      ),
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
                Payouts
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                Manage vendor payout requests and approvals
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px p-20px">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-15px">
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
              <option value="queued">Queued</option>
              <option value="processing">Processing</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              Vendor ID
            </label>
            <input
              type="text"
              value={filters.vendorId}
              onChange={(e) => handleFilterChange("vendorId", e.target.value)}
              placeholder="Filter by vendor ID"
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ page: 1, limit: 20, status: "", vendorId: "" })}
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
          data={data?.payouts || []}
          loading={isLoading}
          emptyMessage="No payouts found"
          pagination={data?.pagination}
          onPageChange={handlePageChange}
          itemsPerPage={filters.limit}
        />
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedPayout && (
        <PayoutApprovalModal
          payout={selectedPayout}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedPayout(null);
          }}
          onApprove={() => handleProcessAction("approve")}
          onReject={() => handleProcessAction("reject")}
          loading={processPayoutMutation.isPending}
        />
      )}
    </div>
  );
};

export default FinancePayoutsMain;

