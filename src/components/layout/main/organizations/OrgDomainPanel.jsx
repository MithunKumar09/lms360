"use client";

import { useState, useEffect, useCallback } from "react";

const SSL_BADGE = {
  pending: { label: "Pending", className: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
  provisioning: { label: "Provisioning", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  active: { label: "Active", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

/**
 * OrgDomainPanel — Superadmin domain management section embedded in the org edit form.
 * Reads from and writes to /api/superadmin/organizations/[id]/domain.
 */
export default function OrgDomainPanel({ orgId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [subdomainInput, setSubdomainInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const apiBase = `/api/superadmin/organizations/${orgId}/domain`;

  const fetchDomain = useCallback(async () => {
    try {
      const res = await fetch(apiBase);
      if (!res.ok) throw new Error("Failed to load domain data");
      const json = await res.json();
      setData(json);
      setSubdomainInput(json.subdomain ?? "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (orgId) fetchDomain();
  }, [orgId, fetchDomain]);

  async function patchDomain(payload, successMessage) {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      setSuccess(successMessage);
      await fetchDomain();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!orgId) return null;

  if (loading) {
    return (
      <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
        <p className="text-sm text-contentColor dark:text-contentColor-dark opacity-60">Loading domain settings…</p>
      </div>
    );
  }

  const badge = data?.sslStatus ? SSL_BADGE[data.sslStatus] ?? SSL_BADGE.pending : SSL_BADGE.pending;

  return (
    <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px space-y-25px">
      <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold">Domain Settings</h2>

      {error && (
        <div className="p-10px bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="p-10px bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded text-sm text-green-700 dark:text-green-300">
          {success}
        </div>
      )}

      {/* Subdomain */}
      <div>
        <label className="text-contentColor dark:text-contentColor-dark mb-6px block text-sm font-medium">
          Subdomain
        </label>
        <p className="text-xs text-contentColor dark:text-contentColor-dark opacity-60 mb-10px">
          Org is reachable at <span className="font-mono">{subdomainInput || "—"}.edurock.com</span>.
          Changing this updates routing immediately.
        </p>
        <div className="flex gap-10px">
          <input
            type="text"
            value={subdomainInput}
            onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="acme"
            className="flex-1 h-46px px-15px text-sm bg-transparent border border-borderColor dark:border-borderColor-dark rounded focus:outline-none focus:border-primaryColor text-contentColor dark:text-contentColor-dark font-mono"
          />
          <button
            type="button"
            disabled={saving || !subdomainInput.trim() || subdomainInput === data?.subdomain}
            onClick={() => patchDomain({ subdomain: subdomainInput.trim() }, "Subdomain updated.")}
            className="px-15px py-8px text-sm font-medium text-whiteColor bg-primaryColor rounded hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Update"}
          </button>
        </div>
      </div>

      {/* Custom Domain Status */}
      <div>
        <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark mb-6px">Custom Domain</p>
        {data?.customDomain ? (
          <div className="space-y-10px">
            <div className="flex flex-wrap items-center gap-10px">
              <span className="font-mono text-sm text-blackColor dark:text-blackColor-dark">{data.customDomain}</span>
              <span className={`px-8px py-3px rounded-full text-xs font-semibold ${badge.className}`}>
                {badge.label}
              </span>
              {data.domainVerified && (
                <span className="px-8px py-3px rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  DNS Verified
                </span>
              )}
            </div>
            {data.sslError && (
              <p className="text-xs text-red-600 dark:text-red-400">SSL error: {data.sslError}</p>
            )}
            {data.verificationAttempts > 0 && (
              <p className="text-xs text-contentColor dark:text-contentColor-dark opacity-60">
                Verification attempts: {data.verificationAttempts}
                {data.verificationLastCheckedAt && ` · Last: ${new Date(data.verificationLastCheckedAt).toLocaleString()}`}
              </p>
            )}

            <div className="flex flex-wrap gap-10px mt-10px">
              {/* Force Verify */}
              {!data.domainVerified && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => patchDomain({ forceVerify: true }, "Domain force-verified. SSL provisioning triggered.")}
                  className="px-12px py-6px text-xs font-medium text-whiteColor bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Force Verify
                </button>
              )}

              {/* Clear Custom Domain */}
              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="px-12px py-6px text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Clear Domain
                </button>
              ) : (
                <div className="flex items-center gap-8px">
                  <span className="text-xs text-red-600 dark:text-red-400">Confirm clear?</span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => { setConfirmClear(false); patchDomain({ clearCustomDomain: true }, "Custom domain cleared."); }}
                    className="px-10px py-4px text-xs font-medium text-whiteColor bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Yes, Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-10px py-4px text-xs text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Invalidate Cache */}
              <button
                type="button"
                disabled={saving}
                onClick={() => patchDomain({ invalidateCache: true }, "Tenant cache invalidated.")}
                className="px-12px py-6px text-xs font-medium text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Invalidate Cache
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-contentColor dark:text-contentColor-dark opacity-60">No custom domain configured.</p>
        )}
      </div>
    </div>
  );
}
