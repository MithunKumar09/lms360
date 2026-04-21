/**
 * Vendor Finance Main Component
 * 
 * Main dashboard component for vendor finance
 */

"use client";

import { useState } from "react";
import { useVendorFinance, useVendorStatistics, useVendorBalance, useVendorPayments, useVendorPayouts } from "@/hooks/api/useVendorFinance";
import FinanceCard from "@/components/shared/finance/FinanceCard";

const VendorFinanceMain = () => {
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [payoutsPage, setPayoutsPage] = useState(1);

  const { data: statisticsData, isLoading: isLoadingStatistics } = useVendorStatistics();
  const { data: balanceData, isLoading: isLoadingBalance } = useVendorBalance();
  const { data: paymentsData, isLoading: isLoadingPayments } = useVendorPayments({ page: paymentsPage, limit: 10 });
  const { data: payoutsData, isLoading: isLoadingPayouts } = useVendorPayouts({ page: payoutsPage, limit: 10 });

  const statistics = (statisticsData?.statistics && typeof statisticsData.statistics === 'object') ? statisticsData.statistics : {};
  const balance = (balanceData?.balance && typeof balanceData.balance === 'object') ? balanceData.balance : {};
  const payments = Array.isArray(paymentsData?.items) ? paymentsData.items : [];
  const payouts = Array.isArray(payoutsData?.items) ? payoutsData.items : [];

  const totalRevenue = typeof statistics.totalRevenue === 'number' ? statistics.totalRevenue : 0;
  const totalOrders = typeof statistics.totalOrders === 'number' ? statistics.totalOrders : 0;
  const settledPayments = typeof statistics.settledPayments === 'number' ? statistics.settledPayments : 0;
  const pendingPayments = typeof statistics.pendingPayments === 'number' ? statistics.pendingPayments : 0;
  const pendingAmount = typeof statistics.pendingAmount === 'number' ? statistics.pendingAmount : 0;
  const kycStatus = statistics.kycStatus || 'not_submitted';

  const withdrawable = typeof balance.withdrawable === 'number' ? balance.withdrawable : 0;
  const pending = typeof balance.pending === 'number' ? balance.pending : 0;
  const onHold = typeof balance.onHold === 'number' ? balance.onHold : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: balance.currency || "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getKycStatusBadge = (status) => {
    const statusConfig = {
      verified: { text: 'Verified', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      pending: { text: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      rejected: { text: 'Rejected', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      not_submitted: { text: 'Not Submitted', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
    };

    const config = statusConfig[status] || statusConfig.not_submitted;
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${config.className}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px overflow-hidden">
        <div className="p-20px md:p-30px lg:p-40px">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-24px md:text-28px lg:text-32px font-bold text-blackColor dark:text-blackColor-dark mb-10px leading-tight">
                Vendor Finance
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                Monitor your payments, settlements, and payouts
              </p>
            </div>
            <div className="flex items-center gap-10px">
              <span className="text-12px text-contentColor dark:text-contentColor-dark">KYC Status:</span>
              {getKycStatusBadge(kycStatus)}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-30px mb-30px">
        <FinanceCard
          title="Total Revenue"
          value={isLoadingStatistics ? '...' : formatCurrency(totalRevenue)}
          subtitle="All time settled"
          icon={<i className="icofont-dollar"></i>}
        />
        <FinanceCard
          title="Total Orders"
          value={isLoadingStatistics ? '...' : totalOrders.toLocaleString()}
          subtitle="All time"
          icon={<i className="icofont-shopping-cart"></i>}
        />
        <FinanceCard
          title="Settled Payments"
          value={isLoadingStatistics ? '...' : settledPayments.toLocaleString()}
          subtitle="Successfully settled"
          icon={<i className="icofont-check-alt"></i>}
        />
        <FinanceCard
          title="Pending Payments"
          value={isLoadingStatistics ? '...' : pendingPayments.toLocaleString()}
          subtitle={`${formatCurrency(pendingAmount)} pending`}
          icon={<i className="icofont-clock-time"></i>}
        />
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-30px mb-30px">
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px border-l-4 border-l-greencolor">
          <div className="flex items-center justify-between mb-10px">
            <h3 className="text-16px font-semibold text-blackColor dark:text-blackColor-dark">
              Withdrawable Balance
            </h3>
            <i className="icofont-money text-greencolor text-24px"></i>
          </div>
          <div className="text-28px font-bold text-blackColor dark:text-blackColor-dark mb-5px">
            {isLoadingBalance ? '...' : formatCurrency(withdrawable)}
          </div>
          <p className="text-12px text-contentColor dark:text-contentColor-dark">
            Available for withdrawal
          </p>
        </div>

        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between mb-10px">
            <h3 className="text-16px font-semibold text-blackColor dark:text-blackColor-dark">
              Pending Balance
            </h3>
            <i className="icofont-clock-time text-yellow-500 text-24px"></i>
          </div>
          <div className="text-28px font-bold text-blackColor dark:text-blackColor-dark mb-5px">
            {isLoadingBalance ? '...' : formatCurrency(pending)}
          </div>
          <p className="text-12px text-contentColor dark:text-contentColor-dark">
            Awaiting settlement
          </p>
        </div>

        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-10px">
            <h3 className="text-16px font-semibold text-blackColor dark:text-blackColor-dark">
              On Hold Balance
            </h3>
            <i className="icofont-lock text-red-500 text-24px"></i>
          </div>
          <div className="text-28px font-bold text-blackColor dark:text-blackColor-dark mb-5px">
            {isLoadingBalance ? '...' : formatCurrency(onHold)}
          </div>
          <p className="text-12px text-contentColor dark:text-contentColor-dark">
            Currently on hold
          </p>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px mb-30px">
        <div className="flex items-center justify-between mb-20px">
          <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark">
            Recent Payments
          </h2>
        </div>
        {isLoadingPayments ? (
          <div className="text-center py-20px text-contentColor dark:text-contentColor-dark">
            Loading payments...
          </div>
        ) : !Array.isArray(payments) || payments.length === 0 ? (
          <div className="text-center py-20px text-contentColor dark:text-contentColor-dark">
            No payments found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-blackColor dark:text-blackColor-dark">
                      Order ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-blackColor dark:text-blackColor-dark">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-blackColor dark:text-blackColor-dark">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-blackColor dark:text-blackColor-dark">
                      Payment Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderColor dark:divide-borderColor-dark">
                  {payments
                    .filter(payment => payment && typeof payment === 'object' && payment.id)
                    .map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm text-blackColor dark:text-blackColor-dark">
                        {payment.orderId ? (payment.orderId.substring(0, 8) + '...') : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                        {formatCurrency(typeof payment.amount === 'number' ? payment.amount : 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            payment.status === 'settled'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}
                        >
                          {payment.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-contentColor dark:text-contentColor-dark">
                        {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paymentsData?.pagination && typeof paymentsData.pagination === 'object' && typeof paymentsData.pagination.pages === 'number' && paymentsData.pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-20px pt-20px border-t border-borderColor dark:border-borderColor-dark">
                <div className="text-sm text-contentColor dark:text-contentColor-dark">
                  Page {typeof paymentsData.pagination.page === 'number' ? paymentsData.pagination.page : 1} of {paymentsData.pagination.pages}
                </div>
                <div className="flex gap-10px">
                  <button
                    onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}
                    disabled={typeof paymentsData.pagination.page === 'number' && paymentsData.pagination.page === 1}
                    className="px-15px py-8px bg-primaryColor text-whiteColor rounded-5 text-14px disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPaymentsPage((p) => Math.min(paymentsData.pagination.pages, p + 1))}
                    disabled={typeof paymentsData.pagination.page === 'number' && paymentsData.pagination.page >= paymentsData.pagination.pages}
                    className="px-15px py-8px bg-primaryColor text-whiteColor rounded-5 text-14px disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recent Payouts */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px">
        <div className="flex items-center justify-between mb-20px">
          <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark">
            Recent Payouts
          </h2>
        </div>
        {isLoadingPayouts ? (
          <div className="text-center py-20px text-contentColor dark:text-contentColor-dark">
            Loading payouts...
          </div>
        ) : !Array.isArray(payouts) || payouts.length === 0 ? (
          <div className="text-center py-20px text-contentColor dark:text-contentColor-dark">
            No payouts found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-blackColor dark:text-blackColor-dark">
                      Payout ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-blackColor dark:text-blackColor-dark">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-blackColor dark:text-blackColor-dark">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-blackColor dark:text-blackColor-dark">
                      Mode
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-blackColor dark:text-blackColor-dark">
                      Created Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderColor dark:divide-borderColor-dark">
                  {payouts
                    .filter(payout => payout && typeof payout === 'object' && payout.id)
                    .map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm text-blackColor dark:text-blackColor-dark">
                        {payout.razorpayPayoutId ? (payout.razorpayPayoutId.substring(0, 8) + '...') : (payout.id ? payout.id.substring(0, 8) + '...' : 'N/A')}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            payout.status === 'processed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : payout.status === 'queued' || payout.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : payout.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}
                        >
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-contentColor dark:text-contentColor-dark">
                        {payout.mode || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-contentColor dark:text-contentColor-dark">
                        {new Date(payout.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {payoutsData?.pagination && typeof payoutsData.pagination === 'object' && typeof payoutsData.pagination.pages === 'number' && payoutsData.pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-20px pt-20px border-t border-borderColor dark:border-borderColor-dark">
                <div className="text-sm text-contentColor dark:text-contentColor-dark">
                  Page {typeof payoutsData.pagination.page === 'number' ? payoutsData.pagination.page : 1} of {payoutsData.pagination.pages}
                </div>
                <div className="flex gap-10px">
                  <button
                    onClick={() => setPayoutsPage((p) => Math.max(1, p - 1))}
                    disabled={typeof payoutsData.pagination.page === 'number' && payoutsData.pagination.page === 1}
                    className="px-15px py-8px bg-primaryColor text-whiteColor rounded-5 text-14px disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPayoutsPage((p) => Math.min(payoutsData.pagination.pages, p + 1))}
                    disabled={typeof payoutsData.pagination.page === 'number' && payoutsData.pagination.page >= payoutsData.pagination.pages}
                    className="px-15px py-8px bg-primaryColor text-whiteColor rounded-5 text-14px disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
};

export default VendorFinanceMain;
