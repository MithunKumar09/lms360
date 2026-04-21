/**
 * Organization Balance Card Component
 * 
 * Displays organization balance information (withdrawable, pending, on_hold)
 */

"use client";

import { useOrganizationBalance } from "@/hooks/api/useOrganizationFinance";
import FinanceCard from "@/components/shared/finance/FinanceCard";

const OrganizationBalanceCard = ({ orgId }) => {
  const { data, isLoading, error } = useOrganizationBalance(orgId);

  if (error) {
    return (
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px">
        <p className="text-red-500">Error loading balance: {error.message}</p>
      </div>
    );
  }

  const balance = data?.balance || {
    withdrawable: 0,
    pending: 0,
    onHold: 0,
    currency: 'INR',
    lastUpdated: null,
  };

  const kycStatus = data?.kycStatus || 'not_submitted';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-30px">
      <FinanceCard
        title="Withdrawable Balance"
        value={isLoading ? '...' : `${balance.currency || 'INR'} ${balance.withdrawable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle="Available for withdrawal"
        icon={<i className="icofont-wallet"></i>}
        className="border-l-4 border-l-greencolor"
      />
      <FinanceCard
        title="Pending Balance"
        value={isLoading ? '...' : `${balance.currency || 'INR'} ${balance.pending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle="Awaiting hold period"
        icon={<i className="icofont-clock-time"></i>}
        className="border-l-4 border-l-yellow-500"
      />
      <FinanceCard
        title="On Hold Balance"
        value={isLoading ? '...' : `${balance.currency || 'INR'} ${balance.onHold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle="Held due to refunds/issues"
        icon={<i className="icofont-lock"></i>}
        className="border-l-4 border-l-red-500"
      />
      
      {/* KYC Status Badge */}
      <div className="col-span-full">
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-14px text-contentColor dark:text-contentColor-dark mb-5px">
                KYC Status
              </p>
              <p className="text-16px font-semibold text-blackColor dark:text-blackColor-dark">
                {kycStatus === 'verified' ? (
                  <span className="text-greencolor">
                    <i className="icofont-check-circled mr-5px"></i>
                    Verified
                  </span>
                ) : kycStatus === 'pending' ? (
                  <span className="text-yellow-500">
                    <i className="icofont-clock-time mr-5px"></i>
                    Pending Review
                  </span>
                ) : (
                  <span className="text-contentColor dark:text-contentColor-dark">
                    <i className="icofont-info-circle mr-5px"></i>
                    Not Submitted
                  </span>
                )}
              </p>
            </div>
            {balance.lastUpdated && (
              <div className="text-right">
                <p className="text-12px text-contentColor dark:text-contentColor-dark">
                  Last Updated
                </p>
                <p className="text-14px text-blackColor dark:text-blackColor-dark">
                  {new Date(balance.lastUpdated).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationBalanceCard;

