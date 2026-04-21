/**
 * Tax Rules Editor Component
 * 
 * Form for creating/editing tax rules
 */

"use client";

import { useState } from "react";

const TaxRulesEditor = ({ rule = null, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    type: rule?.type || "gst",
    name: rule?.name || "",
    description: rule?.description || "",
    rate: rule?.rate || 18,
    country: rule?.country || null,
    state: rule?.state || null,
    applicableItemTypes: rule?.applicableItemTypes || null,
    priority: rule?.priority || 0,
    validFrom: rule?.validFrom
      ? new Date(rule.validFrom).toISOString().split("T")[0]
      : "",
    validUntil: rule?.validUntil
      ? new Date(rule.validUntil).toISOString().split("T")[0]
      : "",
    isActive: rule?.isActive !== undefined ? rule.isActive : true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...formData,
        rate: parseFloat(formData.rate),
        priority: parseInt(formData.priority),
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
      };

      if (rule) {
        payload.ruleId = rule.id;
      }

      const url = rule
        ? `/api/admin/finance/tax-rules/${rule.id}`
        : `/api/admin/finance/tax-rules`;
      const method = rule ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        onSave(data.rule);
      } else {
        setError(data.error || "Failed to save tax rule");
      }
    } catch (err) {
      console.error("Save tax rule error:", err);
      setError("Failed to save tax rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Tax Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded"
          >
            <option value="gst">GST</option>
            <option value="vat">VAT</option>
            <option value="sales_tax">Sales Tax</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Tax Rate (%) *
          </label>
          <input
            type="number"
            value={formData.rate}
            onChange={(e) =>
              setFormData({
                ...formData,
                rate: parseFloat(e.target.value) || 0,
              })
            }
            required
            min="0"
            max="100"
            step="0.01"
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Rule Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., GST 18%"
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={2}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Country Code (ISO 3166-1)
          </label>
          <input
            type="text"
            value={formData.country || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                country: e.target.value || null,
              })
            }
            placeholder="e.g., IN, US"
            maxLength={2}
            className="w-full px-3 py-2 border rounded uppercase"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            State/Province
          </label>
          <input
            type="text"
            value={formData.state || ""}
            onChange={(e) =>
              setFormData({ ...formData, state: e.target.value || null })
            }
            placeholder="e.g., Maharashtra"
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Applicable Item Types
        </label>
        <div className="space-y-2">
          {["course", "event", "workshop"].map((itemType) => (
            <label key={itemType} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  formData.applicableItemTypes?.includes(itemType) || false
                }
                onChange={(e) => {
                  const current = formData.applicableItemTypes || [];
                  if (e.target.checked) {
                    setFormData({
                      ...formData,
                      applicableItemTypes: [...current, itemType],
                    });
                  } else {
                    setFormData({
                      ...formData,
                      applicableItemTypes: current.filter((t) => t !== itemType),
                    });
                  }
                }}
                className="rounded"
              />
              <span className="text-sm capitalize">{itemType}</span>
            </label>
          ))}
          <p className="text-xs text-contentColor dark:text-contentColor-dark">
            Leave unchecked to apply to all item types
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Priority
          </label>
          <input
            type="number"
            value={formData.priority}
            onChange={(e) =>
              setFormData({
                ...formData,
                priority: parseInt(e.target.value) || 0,
              })
            }
            min="0"
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Status
          </label>
          <select
            value={formData.isActive}
            onChange={(e) =>
              setFormData({
                ...formData,
                isActive: e.target.value === "true",
              })
            }
            className="w-full px-3 py-2 border rounded"
          >
            <option value={true}>Active</option>
            <option value={false}>Inactive</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Valid From
          </label>
          <input
            type="date"
            value={formData.validFrom}
            onChange={(e) =>
              setFormData({ ...formData, validFrom: e.target.value })
            }
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Valid Until
          </label>
          <input
            type="date"
            value={formData.validUntil}
            onChange={(e) =>
              setFormData({ ...formData, validUntil: e.target.value })
            }
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primaryColor text-white rounded disabled:opacity-50"
        >
          {loading ? "Saving..." : rule ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
};

export default TaxRulesEditor;

