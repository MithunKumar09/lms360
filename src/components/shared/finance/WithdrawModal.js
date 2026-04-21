/**
 * Withdraw Modal Component
 * 
 * Modal for vendors to request withdrawals
 */

"use client";

import { useState } from "react";
import { useWithdrawRequest } from "@/hooks/api/useVendorFinance.js";

const WithdrawModal = ({ availableBalance, kycStatus, onClose }) => {
  const [amount, setAmount] = useState("");
  const withdrawMutation = useWithdrawRequest();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (numAmount > availableBalance) {
      alert("Amount exceeds available balance");
      return;
    }

    if (kycStatus !== "verified") {
      alert("KYC verification is required to withdraw funds");
      return;
    }

    try {
      await withdrawMutation.mutateAsync({ amount: numAmount });
      setAmount("");
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-md bg-whiteColor dark:bg-whiteColor-dark rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primaryColor px-20px py-15px">
          <div className="flex items-center justify-between">
            <h2 className="text-20px font-bold text-whiteColor">Withdraw Funds</h2>
            <button
              onClick={onClose}
              className="text-whiteColor hover:text-gray-200 text-24px"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-20px">
          <div className="mb-20px">
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              Available Balance
            </label>
            <p className="text-18px font-bold text-blackColor dark:text-blackColor-dark">
              {formatCurrency(availableBalance)}
            </p>
          </div>

          <div className="mb-20px">
            <label className="block text-12px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
              Withdrawal Amount (INR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={availableBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
              required
            />
            <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
              Minimum withdrawal: ₹100
            </p>
          </div>

          {kycStatus !== "verified" && (
            <div className="mb-20px p-15px bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-5">
              <p className="text-12px text-yellow-800 dark:text-yellow-200">
                KYC verification is required to withdraw funds. Please complete your KYC first.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-10px">
            <button
              type="button"
              onClick={onClose}
              disabled={withdrawMutation.isPending}
              className="flex-1 px-15px py-10px bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark rounded-5 text-14px font-semibold hover:bg-lightGrey6 dark:hover:bg-darkdeep2 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={withdrawMutation.isPending || kycStatus !== "verified" || !amount || parseFloat(amount) <= 0}
              className="flex-1 px-15px py-10px bg-primaryColor text-whiteColor rounded-5 text-14px font-semibold hover:bg-primaryColor/90 disabled:opacity-50"
            >
              {withdrawMutation.isPending ? "Processing..." : "Request Withdrawal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawModal;

