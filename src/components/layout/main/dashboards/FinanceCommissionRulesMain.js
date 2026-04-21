/**
 * Finance Commission Rules Main Component
 * 
 * Admin dashboard for managing commission rules
 */

"use client";

import { useState, useEffect } from "react";
import CommissionRulesEditor from "@/components/shared/finance/CommissionRulesEditor.js";

const FinanceCommissionRulesMain = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [filters, setFilters] = useState({
    scope: "",
    isActive: null,
  });

  useEffect(() => {
    fetchRules();
  }, [filters]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.scope) params.append("scope", filters.scope);
      if (filters.isActive !== null) params.append("isActive", filters.isActive);

      const response = await fetch(
        `/api/admin/finance/commission-rules?${params.toString()}`
      );
      const data = await response.json();

      if (data.success) {
        setRules(data.rules || []);
      } else {
        setError(data.error || "Failed to fetch commission rules");
      }
    } catch (err) {
      console.error("Fetch commission rules error:", err);
      setError("Failed to fetch commission rules");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!confirm("Are you sure you want to delete this commission rule?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/finance/commission-rules/${ruleId}`,
        { method: "DELETE" }
      );
      const data = await response.json();

      if (data.success) {
        fetchRules();
      } else {
        alert(data.error || "Failed to delete commission rule");
      }
    } catch (err) {
      console.error("Delete commission rule error:", err);
      alert("Failed to delete commission rule");
    }
  };

  const handleSave = () => {
    fetchRules();
    setShowCreateModal(false);
    setEditingRule(null);
  };

  const getScopeBadge = (scope) => {
    const scopeClasses = {
      global: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      organization: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      course: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          scopeClasses[scope] || scopeClasses.global
        }`}
      >
        {scope}
      </span>
    );
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px overflow-hidden">
        <div className="p-20px md:p-30px lg:p-40px">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-24px md:text-28px lg:text-32px font-bold text-blackColor dark:text-blackColor-dark mb-10px leading-tight">
                Commission Rules
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                Manage commission rules for platform, organizations, and courses
              </p>
            </div>
            <button
              onClick={() => {
                setEditingRule(null);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-primaryColor text-white rounded-lg font-medium hover:bg-primaryColor/90 transition-colors"
            >
              <i className="icofont-plus mr-2"></i>
              Create Rule
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px p-20px">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-15px">
          <div>
            <label className="block text-12px font-semibold mb-5px">Scope</label>
            <select
              value={filters.scope}
              onChange={(e) =>
                setFilters({ ...filters, scope: e.target.value })
              }
              className="w-full px-15px py-10px border rounded-5"
            >
              <option value="">All Scopes</option>
              <option value="global">Global</option>
              <option value="organization">Organization</option>
              <option value="course">Course</option>
            </select>
          </div>
          <div>
            <label className="block text-12px font-semibold mb-5px">Status</label>
            <select
              value={filters.isActive === null ? "" : filters.isActive}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  isActive: e.target.value === "" ? null : e.target.value === "true",
                })
              }
              className="w-full px-15px py-10px border rounded-5"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark overflow-hidden">
        {loading ? (
          <div className="p-20px text-center">
            <p className="text-contentColor dark:text-contentColor-dark">
              Loading commission rules...
            </p>
          </div>
        ) : rules.length === 0 ? (
          <div className="p-20px text-center">
            <p className="text-contentColor dark:text-contentColor-dark">
              No commission rules found. Create your first rule!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    Scope
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    Platform %
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    Fixed Fee %
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    Fixed Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor dark:divide-borderColor-dark">
                {rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getScopeBadge(rule.scope)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-headingColor dark:text-headingColor-dark">
                        {rule.name || "Unnamed Rule"}
                      </div>
                      {rule.description && (
                        <div className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
                          {rule.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium">
                        {rule.platformPercentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm">
                        {rule.platformFixedFeePercentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm">
                        {rule.platformFixedFeeAmount
                          ? `₹${rule.platformFixedFeeAmount}`
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm">{rule.priority}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          rule.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {rule.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setShowCreateModal(true);
                          }}
                          className="text-primaryColor hover:text-primaryColor/80"
                          title="Edit"
                        >
                          <i className="icofont-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
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
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-borderColor dark:border-borderColor-dark">
              <h2 className="text-xl font-bold text-headingColor dark:text-headingColor-dark">
                {editingRule ? "Edit Commission Rule" : "Create Commission Rule"}
              </h2>
            </div>
            <div className="p-6">
              <CommissionRulesEditor
                rule={editingRule}
                onSave={handleSave}
                onCancel={() => {
                  setShowCreateModal(false);
                  setEditingRule(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceCommissionRulesMain;

