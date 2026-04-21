/**
 * Vendor Earnings Main Component
 * 
 * Displays vendor earnings dashboard with charts and totals
 */

"use client";

import { useState } from "react";
import { useVendorEarnings } from "@/hooks/api/useVendorFinance.js";
import FinanceCard from "@/components/shared/finance/FinanceCard.js";
import FinanceTable from "@/components/shared/finance/FinanceTable.js";
import PayoutStatusBadge from "@/components/shared/finance/PayoutStatusBadge.js";
import WithdrawModal from "@/components/shared/finance/WithdrawModal.js";

const VendorEarningsMain = () => {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const { data, isLoading } = useVendorEarnings();

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

  const earnings = (data?.earnings && typeof data.earnings === 'object') ? data.earnings : {};
  const payouts = Array.isArray(data?.payouts) ? data.payouts : [];

  const payoutColumns = [
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
      label: "Requested",
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: "processedAt",
      label: "Processed",
      sortable: true,
      render: (value) => (value ? formatDate(value) : "-"),
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
                Earnings Dashboard
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                View your earnings, balances, and payout history
              </p>
            </div>
              <div className="flex gap-10px">
                <a
                  href="/dashboards/vendor-bank-details"
                  className="px-20px py-12px bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark rounded-5 text-14px font-semibold hover:bg-lightGrey6 dark:hover:bg-darkdeep2"
                >
                  Bank Details
                </a>
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={!earnings.withdrawableBalance || earnings.withdrawableBalance <= 0}
                  className="px-20px py-12px bg-primaryColor text-whiteColor rounded-5 text-14px font-semibold hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Withdraw Funds
                </button>
              </div>
          </div>
        </div>
      </div>

      {/* KYC Status Alert */}
      {earnings.kycStatus && earnings.kycStatus !== "verified" && (
        <div className={`mb-30px p-20px rounded-5 ${
          earnings.kycStatus === "pending"
            ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
            : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
        }`}>
          <div className="flex items-center gap-10px">
            <i className={`icofont-${earnings.kycStatus === "pending" ? "warning" : "close-circled"} text-20px ${
              earnings.kycStatus === "pending" ? "text-yellow-600" : "text-red-600"
            }`}></i>
            <div>
              <p className="text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                KYC Status: {earnings.kycStatus === "pending" ? "Pending Verification" : "Not Verified"}
              </p>
              <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
                {earnings.kycStatus === "pending"
                  ? "Your KYC is under review. You can still view earnings but withdrawals may be limited."
                  : "Please complete KYC verification to enable withdrawals."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-30px mb-30px">
        <FinanceCard
          title="Withdrawable Balance"
          value={formatCurrency(earnings.withdrawableBalance || 0)}
          subtitle="Available for withdrawal"
          icon={<i className="icofont-money-bag"></i>}
        />
        <FinanceCard
          title="Pending Balance"
          value={formatCurrency(earnings.pendingBalance || 0)}
          subtitle="Awaiting settlement"
          icon={<i className="icofont-clock-time"></i>}
        />
        <FinanceCard
          title="On Hold Balance"
          value={formatCurrency(earnings.onHoldBalance || 0)}
          subtitle="Temporarily held"
          icon={<i className="icofont-lock"></i>}
        />
      </div>

      {/* Payout History */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px">
        <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-20px">
          Payout History
        </h2>
        <FinanceTable
          columns={payoutColumns}
          data={payouts}
          loading={isLoading}
          emptyMessage="No payout history found"
        />
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <WithdrawModal
          availableBalance={earnings.withdrawableBalance || 0}
          kycStatus={earnings.kycStatus}
          onClose={() => setShowWithdrawModal(false)}
        />
      )}
    </div>
  );
};

export default VendorEarningsMain;

