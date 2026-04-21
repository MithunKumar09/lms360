/**
 * Reconciliation Exception Modal Component
 * 
 * Displays reconciliation exception details and allows resolution
 */

"use client";

import { useState, useEffect } from "react";

const ReconciliationExceptionModal = ({
  exception,
  isOpen,
  onClose,
  onResolve,
}) => {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("resolve"); // 'resolve' or 'ignore'

  useEffect(() => {
    if (exception) {
      setNotes(exception.resolutionNotes || "");
    }
  }, [exception]);

  if (!isOpen || !exception) return null;

  const handleSubmit = async () => {
    if (!notes.trim() && action === "resolve") {
      alert("Please add resolution notes");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/finance/reconciliation/exceptions`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exceptionId: exception.id,
            action,
            notes,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        onResolve();
        onClose();
      } else {
        alert(data.error || "Failed to resolve exception");
      }
    } catch (err) {
      console.error("Resolve exception error:", err);
      alert("Failed to resolve exception");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-headingColor dark:text-headingColor-dark">
              Reconciliation Exception Details
            </h2>
            <button
              onClick={onClose}
              className="text-contentColor dark:text-contentColor-dark hover:text-headingColor dark:hover:text-headingColor-dark"
            >
              <i className="icofont-close text-2xl"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Exception Summary */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <i className="icofont-warning text-red-600 dark:text-red-400 text-xl"></i>
              <h3 className="font-semibold text-red-800 dark:text-red-300">
                Amount Mismatch Detected
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-contentColor dark:text-contentColor-dark">
                  Expected Amount:
                </span>
                <span className="ml-2 font-semibold text-headingColor dark:text-headingColor-dark">
                  {formatCurrency(exception.expectedAmount)}
                </span>
              </div>
              <div>
                <span className="text-contentColor dark:text-contentColor-dark">
                  Actual Amount:
                </span>
                <span className="ml-2 font-semibold text-headingColor dark:text-headingColor-dark">
                  {formatCurrency(exception.actualAmount)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-contentColor dark:text-contentColor-dark">
                  Difference:
                </span>
                <span
                  className={`ml-2 font-bold text-lg ${
                    exception.difference > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {exception.difference > 0 ? "+" : ""}
                  {formatCurrency(exception.difference)}
                </span>
              </div>
            </div>
          </div>

          {/* Settlement Info */}
          <div>
            <h4 className="font-semibold text-headingColor dark:text-headingColor-dark mb-2">
              Settlement Information
            </h4>
            <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-contentColor dark:text-contentColor-dark">
                  Settlement ID:
                </span>
                <code className="font-mono text-headingColor dark:text-headingColor-dark">
                  {exception.razorpaySettlementId}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-contentColor dark:text-contentColor-dark">
                  Settled On:
                </span>
                <span className="text-headingColor dark:text-headingColor-dark">
                  {formatDate(exception.settledOn)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-contentColor dark:text-contentColor-dark">
                  Settlement Amount:
                </span>
                <span className="font-semibold text-headingColor dark:text-headingColor-dark">
                  {formatCurrency(exception.settlementAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Exception Details */}
          <div>
            <h4 className="font-semibold text-headingColor dark:text-headingColor-dark mb-2">
              Exception Details
            </h4>
            <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded p-3 space-y-2 text-sm">
              <div>
                <span className="text-contentColor dark:text-contentColor-dark">
                  Type:
                </span>
                <span className="ml-2 text-headingColor dark:text-headingColor-dark capitalize">
                  {exception.exceptionType || "amount_mismatch"}
                </span>
              </div>
              <div>
                <span className="text-contentColor dark:text-contentColor-dark">
                  Status:
                </span>
                <span
                  className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    exception.status === "open"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : exception.status === "resolved"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {exception.status}
                </span>
              </div>
              {exception.description && (
                <div>
                  <span className="text-contentColor dark:text-contentColor-dark">
                    Description:
                  </span>
                  <p className="mt-1 text-headingColor dark:text-headingColor-dark">
                    {exception.description}
                  </p>
                </div>
              )}
              {exception.notes && (
                <div>
                  <span className="text-contentColor dark:text-contentColor-dark">
                    Notes:
                  </span>
                  <p className="mt-1 text-headingColor dark:text-headingColor-dark">
                    {exception.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Related Payments */}
          {exception.relatedPayments && exception.relatedPayments.length > 0 && (
            <div>
              <h4 className="font-semibold text-headingColor dark:text-headingColor-dark mb-2">
                Related Payments ({exception.relatedPayments.length})
              </h4>
              <div className="border border-borderColor dark:border-borderColor-dark rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left">Payment ID</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderColor dark:divide-borderColor-dark">
                    {exception.relatedPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-3 py-2">
                          <code className="text-xs">
                            {payment.razorpayPaymentId?.slice(0, 20)}...
                          </code>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              payment.isInSettlement
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }`}
                          >
                            {payment.isInSettlement ? "In Settlement" : "Not Matched"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resolution Form */}
          {exception.status === "open" && (
            <div className="border-t border-borderColor dark:border-borderColor-dark pt-4">
              <h4 className="font-semibold text-headingColor dark:text-headingColor-dark mb-3">
                Resolve Exception
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Action
                  </label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="resolve">Mark as Resolved</option>
                    <option value="ignore">Ignore Exception</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {action === "resolve" ? "Resolution Notes *" : "Notes"}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      action === "resolve"
                        ? "Explain how this exception was resolved..."
                        : "Add any notes about ignoring this exception..."
                    }
                    required={action === "resolve"}
                    rows={4}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Resolution History */}
          {exception.status !== "open" && exception.resolvedAt && (
            <div className="border-t border-borderColor dark:border-borderColor-dark pt-4">
              <h4 className="font-semibold text-headingColor dark:text-headingColor-dark mb-2">
                Resolution History
              </h4>
              <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded p-3 text-sm">
                <div className="space-y-2">
                  <div>
                    <span className="text-contentColor dark:text-contentColor-dark">
                      Resolved At:
                    </span>
                    <span className="ml-2 text-headingColor dark:text-headingColor-dark">
                      {formatDate(exception.resolvedAt)}
                    </span>
                  </div>
                  {exception.resolvedByEmail && (
                    <div>
                      <span className="text-contentColor dark:text-contentColor-dark">
                        Resolved By:
                      </span>
                      <span className="ml-2 text-headingColor dark:text-headingColor-dark">
                        {exception.resolvedByEmail}
                      </span>
                    </div>
                  )}
                  {exception.resolutionNotes && (
                    <div>
                      <span className="text-contentColor dark:text-contentColor-dark">
                        Notes:
                      </span>
                      <p className="mt-1 text-headingColor dark:text-headingColor-dark">
                        {exception.resolutionNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-borderColor dark:border-borderColor-dark flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {exception.status === "open" ? "Cancel" : "Close"}
          </button>
          {exception.status === "open" && (
            <button
              onClick={handleSubmit}
              disabled={loading || (action === "resolve" && !notes.trim())}
              className="px-4 py-2 bg-primaryColor text-white rounded disabled:opacity-50"
            >
              {loading ? "Processing..." : action === "resolve" ? "Resolve" : "Ignore"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReconciliationExceptionModal;

