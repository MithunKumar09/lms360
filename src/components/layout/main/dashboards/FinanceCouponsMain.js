/**
 * Finance Coupons Main Component
 * 
 * Admin dashboard for managing coupons
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const FinanceCouponsMain = () => {
  const router = useRouter();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  const limit = 20;

  useEffect(() => {
    fetchCoupons();
  }, [page]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/finance/coupons?page=${page}&limit=${limit}`
      );
      const data = await response.json();

      if (data.success) {
        setCoupons(data.coupons || []);
        setTotal(data.pagination?.total || 0);
      } else {
        setError(data.error || "Failed to fetch coupons");
      }
    } catch (err) {
      console.error("Fetch coupons error:", err);
      setError("Failed to fetch coupons");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (couponId) => {
    if (!confirm("Are you sure you want to delete this coupon?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/finance/coupons?couponId=${couponId}`,
        { method: "DELETE" }
      );
      const data = await response.json();

      if (data.success) {
        fetchCoupons();
      } else {
        alert(data.error || "Failed to delete coupon");
      }
    } catch (err) {
      console.error("Delete coupon error:", err);
      alert("Failed to delete coupon");
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
      expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      deleted: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          statusClasses[status] || statusClasses.inactive
        }`}
      >
        {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpired = (validUntil) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px overflow-hidden">
        <div className="p-20px md:p-30px lg:p-40px">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-24px md:text-28px lg:text-32px font-bold text-blackColor dark:text-blackColor-dark mb-10px leading-tight">
                Coupon Management
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                Create and manage discount coupons
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCoupon(null);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-primaryColor text-white rounded-lg font-medium hover:bg-primaryColor/90 transition-colors"
            >
              <i className="icofont-plus mr-2"></i>
              Create Coupon
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-30px p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark overflow-hidden">
        {loading ? (
          <div className="p-20px text-center">
            <p className="text-contentColor dark:text-contentColor-dark">
              Loading coupons...
            </p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-20px text-center">
            <p className="text-contentColor dark:text-contentColor-dark">
              No coupons found. Create your first coupon!
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-headingColor dark:text-headingColor-dark uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-headingColor dark:text-headingColor-dark uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-headingColor dark:text-headingColor-dark uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-headingColor dark:text-headingColor-dark uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-headingColor dark:text-headingColor-dark uppercase tracking-wider">
                      Valid Until
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-headingColor dark:text-headingColor-dark uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-headingColor dark:text-headingColor-dark uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-headingColor dark:text-headingColor-dark uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderColor dark:divide-borderColor-dark">
                  {coupons.map((coupon) => (
                    <tr
                      key={coupon.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {coupon.code}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-headingColor dark:text-headingColor-dark">
                          {coupon.name}
                        </div>
                        {coupon.description && (
                          <div className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
                            {coupon.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-contentColor dark:text-contentColor-dark capitalize">
                          {coupon.type === "percentage" ? "%" : "₹"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-headingColor dark:text-headingColor-dark">
                          {coupon.type === "percentage"
                            ? `${coupon.discountValue}%`
                            : `₹${coupon.discountValue}`}
                        </span>
                        {coupon.maxDiscountAmount && (
                          <div className="text-xs text-contentColor dark:text-contentColor-dark">
                            Max: ₹{coupon.maxDiscountAmount}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-contentColor dark:text-contentColor-dark">
                          {formatDate(coupon.validUntil)}
                        </div>
                        {isExpired(coupon.validUntil) && (
                          <div className="text-xs text-red-600 dark:text-red-400">
                            Expired
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-contentColor dark:text-contentColor-dark">
                          {coupon.stats?.totalRedemptions || 0} uses
                        </div>
                        <div className="text-xs text-contentColor dark:text-contentColor-dark">
                          {coupon.stats?.uniqueUsers || 0} users
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(
                          isExpired(coupon.validUntil)
                            ? "expired"
                            : coupon.status
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingCoupon(coupon);
                              setShowCreateModal(true);
                            }}
                            className="text-primaryColor hover:text-primaryColor/80"
                            title="Edit"
                          >
                            <i className="icofont-edit"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <i className="icofont-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="px-4 py-3 border-t border-borderColor dark:border-borderColor-dark flex items-center justify-between">
                <div className="text-sm text-contentColor dark:text-contentColor-dark">
                  Showing {(page - 1) * limit + 1} to{" "}
                  {Math.min(page * limit, total)} of {total} coupons
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-borderColor dark:border-borderColor-dark rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * limit >= total}
                    className="px-3 py-1 border border-borderColor dark:border-borderColor-dark rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CouponModal
          coupon={editingCoupon}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCoupon(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingCoupon(null);
            fetchCoupons();
          }}
        />
      )}
    </div>
  );
};

// Coupon Create/Edit Modal Component
const CouponModal = ({ coupon, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    code: coupon?.code || "",
    name: coupon?.name || "",
    description: coupon?.description || "",
    type: coupon?.type || "percentage",
    discountValue: coupon?.discountValue || 0,
    maxDiscountAmount: coupon?.maxDiscountAmount || null,
    validFrom: coupon?.validFrom
      ? new Date(coupon.validFrom).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    validUntil: coupon?.validUntil
      ? new Date(coupon.validUntil).toISOString().split("T")[0]
      : "",
    maxUses: coupon?.maxUses || null,
    maxUsesPerUser: coupon?.maxUsesPerUser || 1,
    minOrderAmount: coupon?.minOrderAmount || null,
    applicableItemTypes: coupon?.applicableItemTypes || null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = coupon
        ? `/api/admin/finance/coupons`
        : `/api/admin/finance/coupons`;
      const method = coupon ? "PATCH" : "POST";

      const payload = coupon
        ? { ruleId: coupon.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || "Failed to save coupon");
      }
    } catch (err) {
      console.error("Save coupon error:", err);
      setError("Failed to save coupon");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-borderColor dark:border-borderColor-dark">
          <h2 className="text-xl font-bold text-headingColor dark:text-headingColor-dark">
            {coupon ? "Edit Coupon" : "Create Coupon"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Coupon Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                required
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed Amount</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border rounded"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Discount Value *
              </label>
              <input
                type="number"
                value={formData.discountValue}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountValue: parseFloat(e.target.value),
                  })
                }
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            {formData.type === "percentage" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Discount (₹)
                </label>
                <input
                  type="number"
                  value={formData.maxDiscountAmount || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDiscountAmount: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Valid From *
              </label>
              <input
                type="date"
                value={formData.validFrom}
                onChange={(e) =>
                  setFormData({ ...formData, validFrom: e.target.value })
                }
                required
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Valid Until *
              </label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) =>
                  setFormData({ ...formData, validUntil: e.target.value })
                }
                required
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Max Uses (Total)
              </label>
              <input
                type="number"
                value={formData.maxUses || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxUses: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                min="1"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Max Uses Per User
              </label>
              <input
                type="number"
                value={formData.maxUsesPerUser}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxUsesPerUser: parseInt(e.target.value),
                  })
                }
                min="1"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Min Order Amount (₹)
            </label>
            <input
              type="number"
              value={formData.minOrderAmount || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  minOrderAmount: e.target.value
                    ? parseFloat(e.target.value)
                    : null,
                })
              }
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primaryColor text-white rounded disabled:opacity-50"
            >
              {loading ? "Saving..." : coupon ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinanceCouponsMain;

