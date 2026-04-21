/**
 * Vendor Bank Details Main Component
 * 
 * Form for vendors to add/update RazorpayX fund account
 */

"use client";

import { useState, useEffect } from "react";
import { useVendorBankDetails, useUpdateVendorBankDetails } from "@/hooks/api/useVendorFinance.js";

const VendorBankDetailsMain = () => {
  const { data, isLoading } = useVendorBankDetails();
  const updateMutation = useUpdateVendorBankDetails();

    const [formData, setFormData] = useState({
    accountNumber: "",
    ifsc: "",
    accountHolderName: "",
    accountType: "savings", // savings or current
    bankName: "",
  });

  useEffect(() => {
    if (data?.bankDetails) {
      setFormData({
        accountNumber: data.bankDetails.accountNumber || "",
        ifsc: data.bankDetails.ifsc || "",
        accountHolderName: data.bankDetails.accountHolderName || "",
        accountType: data.bankDetails.accountType || "savings",
        bankName: data.bankDetails.bankName || "",
      });
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync(formData);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-50px">
        <div className="inline-block animate-spin rounded-full h-32px w-32px border-b-2 border-primaryColor"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px overflow-hidden">
        <div className="p-20px md:p-30px lg:p-40px">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-24px md:text-28px lg:text-32px font-bold text-blackColor dark:text-blackColor-dark mb-10px leading-tight">
                Bank Details
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                Add or update your bank account details for payouts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px">
        <form onSubmit={handleSubmit} className="max-w-2xl">
          <div className="space-y-20px">
            <div>
              <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Account Holder Name *
              </label>
              <input
                type="text"
                name="accountHolderName"
                value={formData.accountHolderName}
                onChange={handleChange}
                required
                className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
                placeholder="Enter account holder name"
              />
            </div>

            <div>
              <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Account Number *
              </label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                required
                className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
                placeholder="Enter account number"
              />
            </div>

            <div>
              <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                IFSC Code *
              </label>
              <input
                type="text"
                name="ifsc"
                value={formData.ifsc}
                onChange={handleChange}
                required
                pattern="[A-Z]{4}0[A-Z0-9]{6}"
                className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px uppercase"
                placeholder="ABCD0123456"
                maxLength={11}
              />
              <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
                Format: 4 letters + 0 + 6 alphanumeric characters
              </p>
            </div>

            <div>
              <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Bank Name *
              </label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                required
                className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
                placeholder="Enter bank name"
              />
            </div>

            <div>
              <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-5px">
                Account Type *
              </label>
              <select
                name="accountType"
                value={formData.accountType}
                onChange={handleChange}
                required
                className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
              >
                <option value="savings">Savings</option>
                <option value="current">Current</option>
              </select>
            </div>

            {data?.bankDetails?.fundAccountId && (
              <div className="p-15px bg-greencolor/10 border border-greencolor/20 rounded-5">
                <p className="text-12px text-greencolor">
                  <i className="icofont-check-circled"></i> Fund account created successfully
                </p>
                <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
                  Fund Account ID: {data.bankDetails.fundAccountId}
                </p>
              </div>
            )}

            <div className="flex gap-10px pt-10px">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-20px py-12px bg-primaryColor text-whiteColor rounded-5 text-14px font-semibold hover:bg-primaryColor/90 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : data?.bankDetails ? "Update Details" : "Save Details"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorBankDetailsMain;

