/**
 * Admin Finance Summary Component
 * 
 * Displays finance summary statistics in the admin dashboard
 */

"use client";

import { useAdminFinanceStatistics, useAdminFinanceBalance } from "@/hooks/api/useAdminFinance";
import FinanceCard from "@/components/shared/finance/FinanceCard";
import Link from "next/link";
import LoadingSpinner from "@/components/shared/loading/LoadingSpinner";

const AdminFinanceSummary = () => {
  const { data: statisticsData, isLoading: isLoadingStatistics, error: statisticsError } = useAdminFinanceStatistics();
  const { data: balanceData, isLoading: isLoadingBalance, error: balanceError } = useAdminFinanceBalance();

  const statistics = statisticsData?.statistics || {};
  const balance = balanceData?.balance || {};

  // If no orgId (shouldn't happen for admin, but handle gracefully)
  if (statisticsError?.message?.includes('Organization ID is required') || 
      balanceError?.message?.includes('Organization ID is required')) {
    return (
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px mb-30px">
        <div className="text-center py-20px">
          <p className="text-contentColor dark:text-contentColor-dark text-14px">
            Finance information is available after you&apos;re assigned to an organization.
          </p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoadingStatistics || isLoadingBalance) {
    return (
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px mb-30px">
        <div className="flex items-center justify-between mb-20px">
          <div>
            <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-5px">
              Finance Summary
            </h2>
            <p className="text-14px text-contentColor dark:text-contentColor-dark">
              Overview of your organization&apos;s finances
            </p>
          </div>
          <Link
            href="/dashboards/organization-finance"
            className="text-14px text-primaryColor hover:text-primaryColor/80 font-medium"
          >
            View Details →
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-40px">
          <LoadingSpinner size="md" color="blue" />
          <p className="text-sm text-contentColor dark:text-contentColor-dark mt-15px">
            Loading finance data...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (statisticsError || balanceError) {
    return (
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px mb-30px">
        <div className="flex items-center justify-between mb-20px">
          <div>
            <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-5px">
              Finance Summary
            </h2>
            <p className="text-14px text-contentColor dark:text-contentColor-dark">
              Overview of your organization&apos;s finances
            </p>
          </div>
          <Link
            href="/dashboards/organization-finance"
            className="text-14px text-primaryColor hover:text-primaryColor/80 font-medium"
          >
            View Details →
          </Link>
        </div>
        <div className="text-center py-20px">
          <p className="text-red-500 text-14px mb-10px">
            {(statisticsError || balanceError)?.message || 'Failed to load finance data'}
          </p>
        </div>
      </div>
    );
  }

  const totalRevenue = statistics.totalRevenue || 0;
  const totalOrders = statistics.totalOrders || 0;
  const paidOrders = statistics.paidOrders || 0;
  const withdrawableBalance = balance.withdrawable || 0;
  const pendingBalance = balance.pending || 0;

  return (
    <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px mb-30px">
      {/* Header */}
      <div className="flex items-center justify-between mb-20px">
        <div>
          <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-5px">
            Finance Summary
          </h2>
          <p className="text-14px text-contentColor dark:text-contentColor-dark">
            Overview of your organization&apos;s finances
          </p>
        </div>
        <Link
          href="/dashboards/organization-finance"
          className="text-14px text-primaryColor hover:text-primaryColor/80 font-medium transition-colors"
        >
          View Details →
        </Link>
      </div>

      {/* Finance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-20px">
        <FinanceCard
          title="Total Revenue"
          value={`INR ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="All time"
          icon={<i className="icofont-dollar"></i>}
        />
        <FinanceCard
          title="Total Orders"
          value={totalOrders.toLocaleString()}
          subtitle="All orders"
          icon={<i className="icofont-shopping-cart"></i>}
        />
        <FinanceCard
          title="Paid Orders"
          value={paidOrders.toLocaleString()}
          subtitle="Successfully paid"
          icon={<i className="icofont-check-alt"></i>}
        />
        <FinanceCard
          title="Withdrawable"
          value={`INR ${withdrawableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Available for withdrawal"
          icon={<i className="icofont-wallet"></i>}
          className="border-l-4 border-l-greencolor"
        />
        <FinanceCard
          title="Pending"
          value={`INR ${pendingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Awaiting settlement"
          icon={<i className="icofont-clock-time"></i>}
          className="border-l-4 border-l-yellow-500"
        />
      </div>
    </div>
  );
};

export default AdminFinanceSummary;
