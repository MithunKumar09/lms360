/**
 * Commission Rules Editor Component
 * 
 * Form for creating/editing commission rules
 */

"use client";

import { useState, useEffect } from "react";

const CommissionRulesEditor = ({ rule = null, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    scope: rule?.scope || "global",
    orgId: rule?.orgId || null,
    courseId: rule?.courseId || null,
    platformPercentage: rule?.platformPercentage || 10,
    platformFixedFeePercentage: rule?.platformFixedFeePercentage || 2,
    platformFixedFeeAmount: rule?.platformFixedFeeAmount || null,
    name: rule?.name || "",
    description: rule?.description || "",
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
        platformPercentage: parseFloat(formData.platformPercentage),
        platformFixedFeePercentage: parseFloat(formData.platformFixedFeePercentage),
        platformFixedFeeAmount: formData.platformFixedFeeAmount
          ? parseFloat(formData.platformFixedFeeAmount)
          : null,
        priority: parseInt(formData.priority),
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
      };

      if (rule) {
        payload.ruleId = rule.id;
      }

      const url = rule
        ? `/api/admin/finance/commission-rules/${rule.id}`
        : `/api/admin/finance/commission-rules`;
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
        setError(data.error || "Failed to save commission rule");
      }
    } catch (err) {
      console.error("Save commission rule error:", err);
      setError("Failed to save commission rule");
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

      <div>
        <label className="block text-sm font-medium mb-1">
          Scope *
        </label>
        <select
          value={formData.scope}
          onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
          required
          className="w-full px-3 py-2 border rounded"
        >
          <option value="global">Global (Default)</option>
          <option value="organization">Organization</option>
          <option value="course">Course</option>
        </select>
      </div>

      {formData.scope === "organization" && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Organization ID *
          </label>
          <input
            type="text"
            value={formData.orgId || ""}
            onChange={(e) =>
              setFormData({ ...formData, orgId: e.target.value || null })
            }
            required
            placeholder="Enter organization UUID"
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      )}

      {formData.scope === "course" && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Course ID *
          </label>
          <input
            type="text"
            value={formData.courseId || ""}
            onChange={(e) =>
              setFormData({ ...formData, courseId: e.target.value || null })
            }
            required
            placeholder="Enter course UUID"
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Rule Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Default Commission"
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
            Platform Percentage (%) *
          </label>
          <input
            type="number"
            value={formData.platformPercentage}
            onChange={(e) =>
              setFormData({
                ...formData,
                platformPercentage: parseFloat(e.target.value) || 0,
              })
            }
            required
            min="0"
            max="100"
            step="0.01"
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Platform Fixed Fee Percentage (%) *
          </label>
          <input
            type="number"
            value={formData.platformFixedFeePercentage}
            onChange={(e) =>
              setFormData({
                ...formData,
                platformFixedFeePercentage: parseFloat(e.target.value) || 0,
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
          Platform Fixed Fee Amount (₹)
        </label>
        <input
          type="number"
          value={formData.platformFixedFeeAmount || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              platformFixedFeeAmount: e.target.value
                ? parseFloat(e.target.value)
                : null,
            })
          }
          min="0"
          step="0.01"
          placeholder="Optional fixed amount"
          className="w-full px-3 py-2 border rounded"
        />
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
          <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
            Higher priority rules override lower priority
          </p>
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

export default CommissionRulesEditor;

