/**
 * Finance Overview Main Component
 * 
 * Overview dashboard for finance metrics
 */

"use client";

import { useSettlements, usePayouts, useFinanceStatistics } from "@/hooks/api/useFinance.js";
import FinanceCard from "@/components/shared/finance/FinanceCard.js";

const FinanceOverviewMain = () => {
  const { data: settlementsData } = useSettlements({ filters: { page: 1, limit: 1 } });
  const { data: payoutsData } = usePayouts({ filters: { page: 1, limit: 1 } });
  const { data: statisticsData, isLoading: isLoadingStatistics } = useFinanceStatistics();

  const totalSettlements = settlementsData?.pagination?.total || 0;
  const totalPayouts = payoutsData?.pagination?.total || 0;
  const processedPayouts = payoutsData?.payouts?.filter(p => p.status === 'processed').length || 0;
  const pendingPayouts = payoutsData?.payouts?.filter(p => p.status === 'queued' || p.status === 'processing').length || 0;

  // Finance statistics
  const statistics = statisticsData?.statistics || {};
  const totalRevenue = statistics.totalRevenue || 0;
  const totalOrders = statistics.totalOrders || 0;
  const paidOrders = statistics.paidOrders || 0;
  const totalPayments = statistics.totalPayments || 0;
  
  // Entity type breakdown
  const byEntityType = statistics.byEntityType || {};
  const vendorStats = byEntityType.vendor || {};
  const organizationStats = byEntityType.organization || {};
  const superadminStats = byEntityType.superadmin || {};
  const platformStats = byEntityType.platform || {};

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px overflow-hidden">
        <div className="p-20px md:p-30px lg:p-40px">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-24px md:text-28px lg:text-32px font-bold text-blackColor dark:text-blackColor-dark mb-10px leading-tight">
                Finance Overview
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                Monitor settlements, payouts, and financial metrics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Finance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-30px mb-30px">
        {/* Revenue & Orders Section */}
        <FinanceCard
          title="Total Revenue"
          value={isLoadingStatistics ? '...' : `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="All time"
          icon={<i className="icofont-dollar"></i>}
        />
        <FinanceCard
          title="Total Orders"
          value={isLoadingStatistics ? '...' : totalOrders.toLocaleString()}
          subtitle="All time"
          icon={<i className="icofont-shopping-cart"></i>}
        />
        <FinanceCard
          title="Paid Orders"
          value={isLoadingStatistics ? '...' : paidOrders.toLocaleString()}
          subtitle="Successfully paid"
          icon={<i className="icofont-check-alt"></i>}
        />
        <FinanceCard
          title="Total Payments"
          value={isLoadingStatistics ? '...' : totalPayments.toLocaleString()}
          subtitle="All time"
          icon={<i className="icofont-credit-card"></i>}
        />
        {/* Settlements & Payouts Section */}
        <FinanceCard
          title="Total Settlements"
          value={totalSettlements.toLocaleString()}
          subtitle="All time"
          icon={<i className="icofont-money-bag"></i>}
        />
        <FinanceCard
          title="Total Payouts"
          value={totalPayouts.toLocaleString()}
          subtitle="All time"
          icon={<i className="icofont-bank"></i>}
        />
        <FinanceCard
          title="Processed Payouts"
          value={processedPayouts.toLocaleString()}
          subtitle="Successfully completed"
          icon={<i className="icofont-check-circled"></i>}
        />
        <FinanceCard
          title="Pending Payouts"
          value={pendingPayouts.toLocaleString()}
          subtitle="Awaiting processing"
          icon={<i className="icofont-clock-time"></i>}
        />
      </div>

      {/* Entity Type Breakdown Section */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px lg:p-40px mb-30px">
        <h2 className="text-20px md:text-24px font-bold text-blackColor dark:text-blackColor-dark mb-20px">
          Revenue by Entity Type
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20px">
          {/* Vendor Stats */}
          <div className="border border-borderColor dark:border-borderColor-dark rounded-5 p-15px">
            <div className="flex items-center justify-between mb-10px">
              <h3 className="text-14px font-semibold text-contentColor dark:text-contentColor-dark">
                Vendor
              </h3>
              <i className="icofont-store text-primaryColor text-20px"></i>
            </div>
            <div className="space-y-5px">
              <div className="text-18px font-bold text-blackColor dark:text-blackColor-dark">
                ${vendorStats.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="text-12px text-contentColor dark:text-contentColor-dark">
                Settled: ${vendorStats.settledAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="text-12px text-contentColor dark:text-contentColor-dark">
                Pending: ${vendorStats.pendingAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="text-12px text-contentColor dark:text-contentColor-dark">
                {vendorStats.totalCount || 0} payments, {vendorStats.settlementCount || 0} settlements
              </div>
            </div>
          </div>

          {/* Organization Stats */}
          <div className="border border-borderColor dark:border-borderColor-dark rounded-5 p-15px">
            <div className="flex items-center justify-between mb-10px">
              <h3 className="text-14px font-semibold text-contentColor dark:text-contentColor-dark">
                Organization
              </h3>
              <i className="icofont-building text-primaryColor text-20px"></i>
            </div>
            <div className="space-y-5px">
              <div className="text-18px font-bold text-blackColor dark:text-blackColor-dark">
                ${organizationStats.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="text-12px text-contentColor dark:text-contentColor-dark">
                Settled: ${organizationStats.settledAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="text-12px text-contentColor dark:text-contentColor-dark">
                Pending: ${organizationStats.pendingAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="text-12px text-contentColor dark:text-contentColor-dark">
                {organizationStats.totalCount || 0} payments, {organizationStats.settlementCount || 0} settlements
              </div>
            </div>
          </div>

          {/* Superadmin Stats */}
          <div className="border border-borderColor dark:border-borderColor-dark rounded-5 p-15px">
            <div className="flex items-center justify-between mb-10px">
              <h3 className="text-14px font-semibold text-contentColor dark:text-contentColor-dark">
                Superadmin
              </h3>
              <i className="icofont-user-alt-5 text-primaryColor text-20px"></i>
            </div>
            <div className="space-y-5px">
              <div className="text-18px font-bold text-blackColor dark:text-blackColor-dark">
                ${superadminStats.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="text-12px text-contentColor dark:text-contentColor-dark">
                Settled: ${superadminStats.settledAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="text-12px text-contentColor dark:text-contentColor-dark">
                Pending: ${superadminStats.pendingAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="text-12px text-contentColor dark:text-contentColor-dark">
                {superadminStats.totalCount || 0} payments, {superadminStats.settlementCount || 0} settlements
              </div>
            </div>
          </div>

          {/* Platform Stats */}
          <div className="border border-borderColor dark:border-borderColor-dark rounded-5 p-15px">
            <div className="flex items-center justify-between mb-10px">
              <h3 className="text-14px font-semibold text-contentColor dark:text-contentColor-dark">
                Platform
              </h3>
              <i className="icofont-chart-line text-primaryColor text-20px"></i>
            </div>
            <div className="space-y-5px">
              <div className="text-18px font-bold text-blackColor dark:text-blackColor-dark">
                ${platformStats.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="text-12px text-contentColor dark:text-contentColor-dark">
                {platformStats.totalCount || 0} payment splits
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-30px">
        <a
          href="/dashboards/superadmin-finance-settlements"
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-15px">
            <div className="text-primaryColor text-32px">
              <i className="icofont-money-bag"></i>
            </div>
            <div>
              <h3 className="text-16px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Settlements
              </h3>
              <p className="text-14px text-contentColor dark:text-contentColor-dark">
                View settlement records
              </p>
            </div>
          </div>
        </a>

        <a
          href="/dashboards/superadmin-finance-payouts"
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-15px">
            <div className="text-primaryColor text-32px">
              <i className="icofont-bank"></i>
            </div>
            <div>
              <h3 className="text-16px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Payouts
              </h3>
              <p className="text-14px text-contentColor dark:text-contentColor-dark">
                Manage vendor payouts
              </p>
            </div>
          </div>
        </a>

        <a
          href="/dashboards/superadmin-finance-analytics"
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-15px">
            <div className="text-primaryColor text-32px">
              <i className="icofont-chart-line"></i>
            </div>
            <div>
              <h3 className="text-16px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Payment Analytics
              </h3>
              <p className="text-14px text-contentColor dark:text-contentColor-dark">
                View revenue trends, payment methods, and refund analytics
              </p>
            </div>
          </div>
        </a>

        <a
          href="/dashboards/superadmin-finance-orders"
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-15px">
            <div className="text-primaryColor text-32px">
              <i className="icofont-shopping-cart"></i>
            </div>
            <div>
              <h3 className="text-16px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Orders
              </h3>
              <p className="text-14px text-contentColor dark:text-contentColor-dark">
                View and manage orders
              </p>
            </div>
          </div>
        </a>

        <a
          href="/dashboards/superadmin-finance-transactions"
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-15px">
            <div className="text-primaryColor text-32px">
              <i className="icofont-credit-card"></i>
            </div>
            <div>
              <h3 className="text-16px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Transactions
              </h3>
              <p className="text-14px text-contentColor dark:text-contentColor-dark">
                View payment transactions
              </p>
            </div>
          </div>
        </a>

        <a
          href="/dashboards/superadmin-finance-vendor-kyc"
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-15px">
            <div className="text-primaryColor text-32px">
              <i className="icofont-id-card"></i>
            </div>
            <div>
              <h3 className="text-16px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Vendor KYC
              </h3>
              <p className="text-14px text-contentColor dark:text-contentColor-dark">
                Review KYC status
              </p>
            </div>
          </div>
        </a>

        <a
          href="/dashboards/superadmin-finance-payment-splits"
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-15px">
            <div className="text-primaryColor text-32px">
              <i className="icofont-pie-chart"></i>
            </div>
            <div>
              <h3 className="text-16px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Payment Splits
              </h3>
              <p className="text-14px text-contentColor dark:text-contentColor-dark">
                View payment distributions
              </p>
            </div>
          </div>
        </a>

        <a
          href="/dashboards/superadmin-finance-webhook-logs"
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-15px">
            <div className="text-primaryColor text-32px">
              <i className="icofont-web"></i>
            </div>
            <div>
              <h3 className="text-16px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Webhook Logs
              </h3>
              <p className="text-14px text-contentColor dark:text-contentColor-dark">
                Monitor webhook events
              </p>
            </div>
          </div>
        </a>

        <a
          href="/dashboards/superadmin-finance-reconciliation"
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-15px">
            <div className="text-primaryColor text-32px">
              <i className="icofont-file-alt"></i>
            </div>
            <div>
              <h3 className="text-16px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Reconciliation
              </h3>
              <p className="text-14px text-contentColor dark:text-contentColor-dark">
                View mismatches
              </p>
            </div>
          </div>
        </a>

        <a
          href="/dashboards/organization-finance"
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-15px">
            <div className="text-primaryColor text-32px">
              <i className="icofont-building"></i>
            </div>
            <div>
              <h3 className="text-16px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Organization Finance
              </h3>
              <p className="text-14px text-contentColor dark:text-contentColor-dark">
                View organization finances
              </p>
            </div>
          </div>
        </a>

        <a
          href="/dashboards/superadmin-finance"
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-15px">
            <div className="text-primaryColor text-32px">
              <i className="icofont-user-alt-5"></i>
            </div>
            <div>
              <h3 className="text-16px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Superadmin Finance
              </h3>
              <p className="text-14px text-contentColor dark:text-contentColor-dark">
                View superadmin finances
              </p>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};

export default FinanceOverviewMain;

