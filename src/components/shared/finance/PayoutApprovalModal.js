/**
 * Payout Approval Modal Component
 * 
 * Modal for approving or rejecting payouts
 */

"use client";

const PayoutApprovalModal = ({ payout, onClose, onApprove, onReject, loading = false }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
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
            <h2 className="text-20px font-bold text-whiteColor">
              {payout.status === "failed" ? "Retry Payout" : "Approve Payout"}
            </h2>
            <button
              onClick={onClose}
              className="text-whiteColor hover:text-gray-200 text-24px"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-20px">
          <div className="space-y-15px mb-20px">
            <div>
              <label className="text-12px font-semibold text-contentColor dark:text-contentColor-dark">
                Vendor
              </label>
              <p className="text-14px text-blackColor dark:text-blackColor-dark font-semibold">
                {payout.vendorName || payout.vendorEmail}
              </p>
            </div>
            <div>
              <label className="text-12px font-semibold text-contentColor dark:text-contentColor-dark">
                Amount
              </label>
              <p className="text-18px text-blackColor dark:text-blackColor-dark font-bold">
                {formatCurrency(payout.amount)}
              </p>
            </div>
            <div>
              <label className="text-12px font-semibold text-contentColor dark:text-contentColor-dark">
                Mode
              </label>
              <p className="text-14px text-blackColor dark:text-blackColor-dark">
                {payout.mode || "N/A"}
              </p>
            </div>
            {payout.failureReason && (
              <div>
                <label className="text-12px font-semibold text-contentColor dark:text-contentColor-dark">
                  Failure Reason
                </label>
                <p className="text-14px text-red-500">{payout.failureReason}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-10px">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-15px py-10px bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark rounded-5 text-14px font-semibold hover:bg-lightGrey6 dark:hover:bg-darkdeep2 disabled:opacity-50"
            >
              Cancel
            </button>
            {payout.status === "queued" && (
              <button
                onClick={onReject}
                disabled={loading}
                className="flex-1 px-15px py-10px bg-red-500 text-whiteColor rounded-5 text-14px font-semibold hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? "Rejecting..." : "Reject"}
              </button>
            )}
            <button
              onClick={onApprove}
              disabled={loading}
              className="flex-1 px-15px py-10px bg-primaryColor text-whiteColor rounded-5 text-14px font-semibold hover:bg-primaryColor/90 disabled:opacity-50"
            >
              {loading
                ? payout.status === "failed"
                  ? "Retrying..."
                  : "Approving..."
                : payout.status === "failed"
                ? "Retry"
                : "Approve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayoutApprovalModal;

