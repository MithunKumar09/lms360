/**
 * Payout Settings Component
 * 
 * Form for configuring automatic payout settings for vendors, organizations, or superadmin
 */

"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/index.js";

const PayoutSettings = ({ 
  entityType, // 'vendor', 'organization', or 'superadmin'
  entityAccountId, // vendor_account_id, organization_account_id, or superadmin_account_id
  onSave, 
  onCancel 
}) => {
  const user = useAuthStore((state) => state.user);
  const [formData, setFormData] = useState({
    enabled: false,
    thresholdAmount: 1000.00,
    currency: 'INR',
    defaultMode: 'NEFT',
    scheduleType: 'threshold',
    scheduleDay: null,
    scheduleDayOfWeek: null,
    minPayoutAmount: 100.00,
    maxPayoutAmount: null,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  // Fetch existing settings on mount
  useEffect(() => {
    if (entityType && entityAccountId) {
      fetchSettings();
    } else {
      setFetching(false);
    }
  }, [entityType, entityAccountId]);

  const fetchSettings = async () => {
    try {
      setFetching(true);
      const response = await fetch(
        `/api/admin/finance/payout-settings?entityType=${entityType}&entityId=${entityAccountId}`
      );
      const data = await response.json();
      
      if (data.success && data.settings && data.settings.length > 0) {
        const setting = data.settings[0];
        setFormData({
          enabled: setting.enabled,
          thresholdAmount: setting.thresholdAmount,
          currency: setting.currency,
          defaultMode: setting.defaultMode,
          scheduleType: setting.scheduleType,
          scheduleDay: setting.scheduleDay,
          scheduleDayOfWeek: setting.scheduleDayOfWeek,
          minPayoutAmount: setting.minPayoutAmount,
          maxPayoutAmount: setting.maxPayoutAmount,
          notes: setting.notes || '',
        });
      }
    } catch (err) {
      console.error("Fetch payout settings error:", err);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        entityType,
        ...(entityType === 'vendor' && { vendorAccountId: entityAccountId }),
        ...(entityType === 'organization' && { organizationAccountId: entityAccountId }),
        ...(entityType === 'superadmin' && { superadminAccountId: entityAccountId }),
        enabled: formData.enabled,
        thresholdAmount: parseFloat(formData.thresholdAmount),
        currency: formData.currency,
        defaultMode: formData.defaultMode,
        scheduleType: formData.scheduleType,
        scheduleDay: formData.scheduleType === 'monthly' && formData.scheduleDay ? parseInt(formData.scheduleDay) : null,
        scheduleDayOfWeek: formData.scheduleType === 'weekly' && formData.scheduleDayOfWeek !== null ? parseInt(formData.scheduleDayOfWeek) : null,
        minPayoutAmount: parseFloat(formData.minPayoutAmount),
        maxPayoutAmount: formData.maxPayoutAmount ? parseFloat(formData.maxPayoutAmount) : null,
        notes: formData.notes || null,
      };

      const response = await fetch('/api/admin/finance/payout-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        if (onSave) {
          onSave(data.setting);
        } else {
          alert('Payout settings saved successfully');
          fetchSettings();
        }
      } else {
        setError(data.error || 'Failed to save payout settings');
      }
    } catch (err) {
      console.error("Save payout settings error:", err);
      setError("Failed to save payout settings");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
        <div className="text-center py-20px">
          <div className="animate-spin inline-block w-6 h-6 border-4 border-primaryColor border-t-transparent rounded-full mb-10px"></div>
          <p className="text-contentColor dark:text-contentColor-dark text-14px">Loading payout settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px">
      <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-20px">
        Automatic Payout Settings
      </h2>

      <form onSubmit={handleSubmit} className="space-y-20px">
        {error && (
          <div className="p-15px bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-5">
            <p className="text-14px text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-15px bg-lightGrey5 dark:bg-darkdeep1 rounded-5">
          <div>
            <label className="text-14px font-semibold text-blackColor dark:text-blackColor-dark">
              Enable Automatic Payouts
            </label>
            <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
              Automatically create payouts when balance exceeds threshold
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primaryColor/20 dark:peer-focus:ring-primaryColor/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primaryColor"></div>
          </label>
        </div>

        {/* Threshold Amount */}
        <div>
          <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-10px">
            Threshold Amount ({formData.currency}) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.thresholdAmount}
            onChange={(e) => setFormData({ ...formData, thresholdAmount: e.target.value })}
            required
            className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
          />
          <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
            Minimum balance required to trigger automatic payout
          </p>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-10px">
            Currency *
          </label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            required
            className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
          >
            <option value="INR">INR (Indian Rupee)</option>
            <option value="USD">USD (US Dollar)</option>
          </select>
        </div>

        {/* Default Mode */}
        <div>
          <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-10px">
            Default Payment Mode *
          </label>
          <select
            value={formData.defaultMode}
            onChange={(e) => setFormData({ ...formData, defaultMode: e.target.value })}
            required
            className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
          >
            <option value="NEFT">NEFT</option>
            <option value="IMPS">IMPS</option>
            <option value="RTGS">RTGS</option>
          </select>
        </div>

        {/* Schedule Type */}
        <div>
          <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-10px">
            Schedule Type *
          </label>
          <select
            value={formData.scheduleType}
            onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value })}
            required
            className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
          >
            <option value="threshold">When threshold is met</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
            How often to check and process automatic payouts
          </p>
        </div>

        {/* Schedule Day (for monthly) */}
        {formData.scheduleType === 'monthly' && (
          <div>
            <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-10px">
              Day of Month (1-31)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={formData.scheduleDay || ''}
              onChange={(e) => setFormData({ ...formData, scheduleDay: e.target.value })}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            />
          </div>
        )}

        {/* Schedule Day of Week (for weekly) */}
        {formData.scheduleType === 'weekly' && (
          <div>
            <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-10px">
              Day of Week
            </label>
            <select
              value={formData.scheduleDayOfWeek !== null ? formData.scheduleDayOfWeek : ''}
              onChange={(e) => setFormData({ ...formData, scheduleDayOfWeek: e.target.value !== '' ? parseInt(e.target.value) : null })}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            >
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </select>
          </div>
        )}

        {/* Min Payout Amount */}
        <div>
          <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-10px">
            Minimum Payout Amount ({formData.currency}) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.minPayoutAmount}
            onChange={(e) => setFormData({ ...formData, minPayoutAmount: e.target.value })}
            required
            className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
          />
          <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
            Minimum amount per payout transaction
          </p>
        </div>

        {/* Max Payout Amount */}
        <div>
          <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-10px">
            Maximum Payout Amount ({formData.currency}) (Optional)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.maxPayoutAmount || ''}
            onChange={(e) => setFormData({ ...formData, maxPayoutAmount: e.target.value || null })}
            className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
          />
          <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
            Maximum amount per payout transaction (leave empty for no limit)
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-14px font-semibold text-blackColor dark:text-blackColor-dark mb-10px">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-14px"
            placeholder="Add any notes about these payout settings..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-15px pt-10px">
          <button
            type="submit"
            disabled={loading}
            className="px-20px py-10px bg-primaryColor text-whiteColor rounded-5 text-14px font-semibold hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Saving..." : "Save Settings"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-20px py-10px bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark rounded-5 text-14px font-semibold hover:bg-lightGrey6 dark:hover:bg-darkdeep2 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PayoutSettings;
