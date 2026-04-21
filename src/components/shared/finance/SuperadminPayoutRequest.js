/**
 * Superadmin Payout Request Component
 * 
 * Form to request superadmin payout and show payout history
 */

"use client";

import { useState } from "react";
import { useSuperadminBalance, useSuperadminPayouts, useRequestSuperadminPayout } from "@/hooks/api/useSuperadminFinance";

const SuperadminPayoutRequest = () => {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [mode, setMode] = useState("NEFT");
  const [referenceId, setReferenceId] = useState("");

  const { data: balanceData } = useSuperadminBalance();
  const { data: payoutsData } = useSuperadminPayouts({ filters: { page: 1, limit: 10 } });
  const requestPayoutMutation = useRequestSuperadminPayout();

  const balance = balanceData?.balance || { withdrawable: 0, currency: 'INR' };
  const payouts = payoutsData?.payouts || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payoutAmount = parseFloat(amount);
    if (!payoutAmount || payoutAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (payoutAmount > balance.withdrawable) {
      alert(`Insufficient balance. Available: ${balance.currency} ${balance.withdrawable.toLocaleString()}`);
      return;
    }

    try {
      await requestPayoutMutation.mutateAsync({
        amount: payoutAmount,
        currency,
        mode,
        referenceId: referenceId || undefined,
      });
      setAmount("");
      setReferenceId("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
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

  return (
    <div className="w-full">
      {/* Payout Request Form */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px p-20px md:p-30px">
        <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-20px">
          Request Payout
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-20px">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20px">
            <div>
              <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-10px">
                Amount ({balance.currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={balance.withdrawable}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Max: ${formatCurrency(balance.withdrawable, balance.currency)}`}
                className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
                required
              />
              <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
                Available: {formatCurrency(balance.withdrawable, balance.currency)}
              </p>
            </div>

            <div>
              <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-10px">
                Payment Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
              >
                <option value="NEFT">NEFT</option>
                <option value="IMPS">IMPS</option>
                <option value="RTGS">RTGS</option>
              </select>
            </div>

            <div>
              <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-10px">
                Reference ID (Optional)
              </label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="Enter reference ID"
                className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={requestPayoutMutation.isPending || balance.kycStatus !== 'verified'}
            className="px-20px py-10px bg-primaryColor text-whiteColor rounded-5 text-14px font-semibold hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requestPayoutMutation.isPending ? "Processing..." : "Request Payout"}
          </button>

          {balance.kycStatus !== 'verified' && (
            <p className="text-12px text-yellow-600">
              <i className="icofont-info-circle mr-5px"></i>
              KYC must be verified before requesting payouts
            </p>
          )}
        </form>
      </div>

      {/* Payout History */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px">
        <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-20px">
          Recent Payouts
        </h2>

        {payouts.length === 0 ? (
          <p className="text-contentColor dark:text-contentColor-dark">No payout history</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-borderColor dark:border-borderColor-dark">
                  <th className="text-left py-10px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                    Amount
                  </th>
                  <th className="text-left py-10px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                    Status
                  </th>
                  <th className="text-left py-10px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                    Mode
                  </th>
                  <th className="text-left py-10px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-borderColor dark:border-borderColor-dark">
                    <td className="py-10px px-15px">
                      <span className="font-semibold">{formatCurrency(payout.amount, payout.currency)}</span>
                    </td>
                    <td className="py-10px px-15px">
                      <span className={`px-10px py-5px rounded-5 text-12px font-semibold ${
                        payout.status === 'processed' ? 'bg-greencolor/20 text-greencolor' :
                        payout.status === 'queued' || payout.status === 'processing' ? 'bg-yellow-500/20 text-yellow-600' :
                        payout.status === 'failed' ? 'bg-red-500/20 text-red-600' :
                        'bg-contentColor/20 text-contentColor'
                      }`}>
                        {payout.status}
                      </span>
                    </td>
                    <td className="py-10px px-15px">{payout.mode || "N/A"}</td>
                    <td className="py-10px px-15px">{formatDate(payout.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperadminPayoutRequest;

