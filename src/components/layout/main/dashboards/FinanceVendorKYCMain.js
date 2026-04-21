/**
 * Finance Vendor KYC Main Component
 * 
 * Displays vendor KYC status and management
 */

"use client";

import { useState } from "react";
import { useVendorKYC, useUpdateVendorKYC } from "@/hooks/api/useFinance.js";
import FinanceTable from "@/components/shared/finance/FinanceTable.js";

const FinanceVendorKYCMain = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    kycStatus: "",
  });
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data, isLoading, refetch } = useVendorKYC({ filters });
  const updateKYCMutation = useUpdateVendorKYC();

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleUpdateKYC = async (kycStatus) => {
    if (!selectedVendor) return;

    try {
      await updateKYCMutation.mutateAsync({
        vendorAccountId: selectedVendor.vendorAccountId,
        kycStatus,
        rejectionReason: kycStatus === "rejected" ? rejectionReason : undefined,
      });
      setShowUpdateModal(false);
      setSelectedVendor(null);
      setRejectionReason("");
      refetch();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getKYCStatusBadge = (status) => {
    const configs = {
      verified: { label: "Verified", className: "bg-greencolor text-white" },
      pending: { label: "Pending", className: "bg-yellow-500 text-white" },
      rejected: { label: "Rejected", className: "bg-red-500 text-white" },
      not_submitted: { label: "Not Submitted", className: "bg-gray-400 text-white" },
      failed: { label: "Failed", className: "bg-orange-500 text-white" },
    };

    const config = configs[status] || { label: status, className: "bg-gray-400 text-white" };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const columns = [
    {
      key: "name",
      label: "Vendor",
      sortable: false,
      render: (value, row) => (
        <div>
          <div className="font-semibold text-blackColor dark:text-blackColor-dark">
            {row.name || row.email}
          </div>
          <div className="text-12px text-contentColor dark:text-contentColor-dark">
            {row.email}
          </div>
        </div>
      ),
    },
    {
      key: "kycStatus",
      label: "KYC Status",
      sortable: true,
      render: (value) => getKYCStatusBadge(value),
    },
    {
      key: "withdrawableBalance",
      label: "Balance",
      sortable: true,
      render: (value) => formatCurrency(value),
    },
    {
      key: "kycSubmittedAt",
      label: "Submitted",
      sortable: true,
      render: (value) => (value ? new Date(value).toLocaleDateString() : "-"),
    },
    {
      key: "kycVerifiedAt",
      label: "Verified",
      sortable: true,
      render: (value) => (value ? new Date(value).toLocaleDateString() : "-"),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-10px">
          {row.kycStatus === "pending" && (
            <>
              <button
                onClick={() => {
                  setSelectedVendor(row);
                  setShowUpdateModal(true);
                }}
                className="px-10px py-5px bg-primaryColor text-whiteColor rounded-5 text-12px font-semibold hover:bg-primaryColor/90"
              >
                Review
              </button>
            </>
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
                Vendor KYC Management
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                Review and manage vendor KYC verification status
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px p-20px">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-15px">
          <div>
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              KYC Status
            </label>
            <select
              value={filters.kycStatus}
              onChange={(e) => handleFilterChange("kycStatus", e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            >
              <option value="">All Status</option>
              <option value="not_submitted">Not Submitted</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ page: 1, limit: 20, kycStatus: "" })}
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
          data={data?.vendors || []}
          loading={isLoading}
          emptyMessage="No vendors found"
          pagination={data?.pagination}
          onPageChange={handlePageChange}
          itemsPerPage={filters.limit}
        />
      </div>

      {/* Update Modal */}
      {showUpdateModal && selectedVendor && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => {
            setShowUpdateModal(false);
            setSelectedVendor(null);
            setRejectionReason("");
          }}
        >
          <div
            className="relative z-10 w-full max-w-md bg-whiteColor dark:bg-whiteColor-dark rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-primaryColor px-20px py-15px">
              <div className="flex items-center justify-between">
                <h2 className="text-20px font-bold text-whiteColor">Update KYC Status</h2>
                <button
                  onClick={() => {
                    setShowUpdateModal(false);
                    setSelectedVendor(null);
                    setRejectionReason("");
                  }}
                  className="text-whiteColor hover:text-gray-200 text-24px"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-20px">
              <div className="mb-15px">
                <p className="text-14px text-blackColor dark:text-blackColor-dark font-semibold mb-10px">
                  Vendor: {selectedVendor.name || selectedVendor.email}
                </p>
                <p className="text-12px text-contentColor dark:text-contentColor-dark">
                  Current Status: {getKYCStatusBadge(selectedVendor.kycStatus)}
                </p>
              </div>

              <div className="space-y-15px mb-20px">
                <button
                  onClick={() => handleUpdateKYC("verified")}
                  disabled={updateKYCMutation.isPending}
                  className="w-full px-15px py-10px bg-greencolor text-whiteColor rounded-5 text-14px font-semibold hover:bg-green-600 disabled:opacity-50"
                >
                  {updateKYCMutation.isPending ? "Updating..." : "Mark as Verified"}
                </button>

                <div>
                  <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                    Rejection Reason (if rejecting)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter rejection reason..."
                    className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px min-h-80px"
                  />
                  <button
                    onClick={() => handleUpdateKYC("rejected")}
                    disabled={updateKYCMutation.isPending || !rejectionReason.trim()}
                    className="w-full mt-10px px-15px py-10px bg-red-500 text-whiteColor rounded-5 text-14px font-semibold hover:bg-red-600 disabled:opacity-50"
                  >
                    {updateKYCMutation.isPending ? "Rejecting..." : "Reject KYC"}
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setSelectedVendor(null);
                  setRejectionReason("");
                }}
                className="w-full px-15px py-10px bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark rounded-5 text-14px font-semibold hover:bg-lightGrey6 dark:hover:bg-darkdeep2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceVendorKYCMain;

