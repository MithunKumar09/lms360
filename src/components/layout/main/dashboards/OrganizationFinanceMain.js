/**
 * Organization Finance Main Component
 * 
 * Main dashboard component for organization finance
 */

"use client";

import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/index.js";
import { useOrganizationStatistics } from "@/hooks/api/useOrganizationFinance";
import OrganizationBalanceCard from "@/components/sections/sub-section/dashboards/OrganizationBalanceCard";
import OrganizationPaymentsList from "@/components/sections/sub-section/dashboards/OrganizationPaymentsList";
import OrganizationSettlementsList from "@/components/sections/sub-section/dashboards/OrganizationSettlementsList";
import OrganizationPayoutRequest from "@/components/shared/finance/OrganizationPayoutRequest";
import FinanceCard from "@/components/shared/finance/FinanceCard";

const OrganizationFinanceMain = () => {
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  
  // Superadmin can access any organization via query param, admin uses their own orgId
  const orgIdFromQuery = searchParams.get('orgId');
  const orgId = user?.role === 'superadmin' ? orgIdFromQuery : user?.orgId;

  const { data: statisticsData, isLoading: isLoadingStatistics } = useOrganizationStatistics(orgId);

  if (!orgId) {
    return (
      <div className="w-full">
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px">
          <p className="text-contentColor dark:text-contentColor-dark">
            {user?.role === 'superadmin' 
              ? 'Please select an organization to view its finance details. Add ?orgId=YOUR_ORG_ID to the URL.'
              : 'Organization ID not found. Please ensure you are logged in as an organization admin.'}
          </p>
        </div>
      </div>
    );
  }

  const statistics = statisticsData?.statistics || {};
  const totalRevenue = statistics.totalRevenue || 0;
  const totalOrders = statistics.totalOrders || 0;
  const paidOrders = statistics.paidOrders || 0;
  const totalPayments = statistics.totalPayments || 0;
  const totalSettled = statistics.totalSettled || 0;
  const totalPending = statistics.totalPending || 0;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px overflow-hidden">
        <div className="p-20px md:p-30px lg:p-40px">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-24px md:text-28px lg:text-32px font-bold text-blackColor dark:text-blackColor-dark mb-10px leading-tight">
                Organization Finance
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                Monitor payments, settlements, and manage payouts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-30px mb-30px">
        <FinanceCard
          title="Total Revenue"
          value={isLoadingStatistics ? '...' : `INR ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
        <FinanceCard
          title="Settled Amount"
          value={isLoadingStatistics ? '...' : `INR ${totalSettled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Settled payments"
          icon={<i className="icofont-money-bag"></i>}
        />
        <FinanceCard
          title="Pending Amount"
          value={isLoadingStatistics ? '...' : `INR ${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Awaiting settlement"
          icon={<i className="icofont-clock-time"></i>}
        />
      </div>

      {/* Balance Cards */}
      <div className="mb-30px">
        <OrganizationBalanceCard orgId={orgId} />
      </div>

      {/* Payout Request */}
      <div className="mb-30px">
        <OrganizationPayoutRequest orgId={orgId} />
      </div>

      {/* Payments List */}
      <div className="mb-30px">
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px overflow-hidden">
          <div className="p-20px md:p-30px">
            <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-10px">
              Payment History
            </h2>
          </div>
        </div>
        <OrganizationPaymentsList orgId={orgId} />
      </div>

      {/* Settlements List */}
      <div className="mb-30px">
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px overflow-hidden">
          <div className="p-20px md:p-30px">
            <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-10px">
              Settlement History
            </h2>
          </div>
        </div>
        <OrganizationSettlementsList orgId={orgId} />
      </div>
    </div>
  );
};

export default OrganizationFinanceMain;

