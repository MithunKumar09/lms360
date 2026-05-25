"use client";

import { useState, useEffect, useCallback } from "react";

const STATUS_BADGE = {
  pending: { label: "Pending Verification", className: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
  provisioning: { label: "Provisioning SSL", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  active: { label: "Active", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  failed: { label: "SSL Failed", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

export default function CustomDomainSettings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [copied, setCopied] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/custom-domain");
      if (!res.ok) throw new Error("Failed to load domain settings");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll every 30s while verification is pending or SSL is provisioning
  useEffect(() => {
    if (!data) return;
    if (data.verified && data.sslStatus === "active") return;
    if (!data.customDomain) return;
    const timer = setInterval(fetchStatus, 30_000);
    return () => clearInterval(timer);
  }, [data, fetchStatus]);

  async function handleClaim(e) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!domainInput.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/custom-domain", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to claim domain");
      setSuccessMsg("Domain claimed. Add the TXT record below to verify ownership.");
      setDomainInput("");
      await fetchStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setRemoving(true);
    try {
      const res = await fetch("/api/admin/settings/custom-domain", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to remove domain");
      setConfirmRemove(false);
      setSuccessMsg("Custom domain removed. Your organization is now accessible via subdomain only.");
      await fetchStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(false);
    }
  }

  function copyToClipboard(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (loading) {
    return (
      <div className="p-10px md:px-10 md:py-50px">
        <p className="text-sm text-contentColor dark:text-contentColor-dark opacity-60">Loading domain settings…</p>
      </div>
    );
  }

  const badge = data?.sslStatus ? STATUS_BADGE[data.sslStatus] : STATUS_BADGE.pending;

  return (
    <div className="space-y-30px">
      {/* Subdomain */}
      <div className="p-20px bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-5">
        <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-10px">
          Default Subdomain
        </h3>
        {data?.subdomain ? (
          <p className="text-sm text-contentColor dark:text-contentColor-dark">
            Your organization is always reachable at{" "}
            <span className="font-mono font-semibold text-primaryColor">
              {data.subdomain}.{typeof window !== "undefined" ? window.location.hostname.split(".").slice(-2).join(".") : "edurock.com"}
            </span>
            . This subdomain is your fallback and cannot be removed.
          </p>
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400">
            No subdomain assigned. Contact support to configure one.
          </p>
        )}
      </div>

      {/* Plan Tier Gate */}
      {data?.planTier !== "pro" && data?.planTier !== "enterprise" && (
        <div className="p-20px bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-5">
          <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
            Custom domains require a <strong>Pro plan</strong>. Contact your platform administrator to upgrade.
          </p>
        </div>
      )}

      {/* Custom Domain Panel */}
      {(data?.planTier === "pro" || data?.planTier === "enterprise") && (
        <div className="p-20px bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-5">
          <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-6px">
            Custom Domain
          </h3>

          {/* Error / success banners */}
          {error && (
            <div className="mb-15px p-10px bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-15px p-10px bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded text-sm text-green-700 dark:text-green-300">
              {successMsg}
            </div>
          )}

          {!data?.customDomain ? (
            /* Claim form */
            <form onSubmit={handleClaim} className="space-y-15px">
              <p className="text-sm text-contentColor dark:text-contentColor-dark opacity-70 mb-10px">
                Enter the domain you own (e.g. <span className="font-mono">portal.myschool.edu</span>).
                You will need to add a DNS TXT record to verify ownership.
              </p>
              <div className="flex gap-10px">
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="portal.myschool.edu"
                  className="flex-1 h-46px px-15px text-sm bg-transparent border border-borderColor dark:border-borderColor-dark rounded focus:outline-none focus:border-primaryColor text-contentColor dark:text-contentColor-dark"
                />
                <button
                  type="submit"
                  disabled={saving || !domainInput.trim()}
                  className="px-20px py-10px text-sm font-medium text-whiteColor bg-primaryColor rounded hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Claiming…" : "Claim Domain"}
                </button>
              </div>
            </form>
          ) : (
            /* Domain status view */
            <div className="space-y-20px">
              <div className="flex flex-wrap items-center justify-between gap-10px">
                <div>
                  <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark mb-4px">Current domain</p>
                  <p className="font-mono text-base font-semibold text-blackColor dark:text-blackColor-dark">{data.customDomain}</p>
                </div>
                <span className={`px-10px py-4px rounded-full text-xs font-semibold ${badge.className}`}>
                  {badge.label}
                </span>
              </div>

              {/* DNS verification instructions */}
              {!data.verified && data.verificationTxtRecord && (
                <div className="p-15px bg-gray-50 dark:bg-gray-800 border border-borderColor dark:border-borderColor-dark rounded space-y-10px">
                  <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                    Step 1 — Add this DNS TXT record to verify ownership:
                  </p>
                  <div className="grid grid-cols-1 gap-8px text-xs font-mono">
                    <div className="flex items-center justify-between gap-10px p-8px bg-white dark:bg-gray-900 border border-borderColor dark:border-borderColor-dark rounded">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Name: </span>
                        <span className="text-blackColor dark:text-blackColor-dark">{data.verificationTxtRecord}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(data.verificationTxtRecord, "record")}
                        className="shrink-0 text-primaryColor hover:text-primaryColor/80 text-xs font-sans"
                      >
                        {copied === "record" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-10px p-8px bg-white dark:bg-gray-900 border border-borderColor dark:border-borderColor-dark rounded">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Value: </span>
                        <span className="text-blackColor dark:text-blackColor-dark break-all">{data.verificationTxtValue}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(data.verificationTxtValue, "value")}
                        className="shrink-0 text-primaryColor hover:text-primaryColor/80 text-xs font-sans"
                      >
                        {copied === "value" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-contentColor dark:text-contentColor-dark opacity-60">
                    Verification runs automatically every 5 minutes.
                    {data.verificationAttempts > 0 && ` Checked ${data.verificationAttempts} time(s).`}
                    {data.verificationLastCheckedAt && ` Last check: ${new Date(data.verificationLastCheckedAt).toLocaleString()}.`}
                  </p>
                  {data.verificationAttempts >= 50 && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                      Verification limit reached. Please remove the domain and re-claim it after fixing your DNS.
                    </p>
                  )}
                </div>
              )}

              {/* CNAME instruction */}
              {data.verified && (
                <div className="p-15px bg-gray-50 dark:bg-gray-800 border border-borderColor dark:border-borderColor-dark rounded text-sm text-contentColor dark:text-contentColor-dark">
                  <p className="font-semibold text-blackColor dark:text-blackColor-dark mb-6px">Step 2 — Add a CNAME record:</p>
                  <p className="font-mono text-xs mb-4px">
                    <span className="text-gray-500 dark:text-gray-400">Name: </span>{data.customDomain}
                    {" → "}
                    <span className="text-gray-500 dark:text-gray-400">Value: </span>cname.edurock.com
                  </p>
                  <p className="text-xs opacity-60">SSL certificate is {data.sslStatus === "active" ? "active" : "being provisioned"}.</p>
                  {data.sslError && (
                    <p className="mt-6px text-xs text-red-600 dark:text-red-400">SSL error: {data.sslError}</p>
                  )}
                </div>
              )}

              {/* Remove domain */}
              {!confirmRemove ? (
                <button
                  onClick={() => setConfirmRemove(true)}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
                >
                  Remove custom domain
                </button>
              ) : (
                <div className="p-15px bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded space-y-10px">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    Remove <span className="font-mono">{data.customDomain}</span>? Your organization will revert to subdomain access only.
                  </p>
                  <div className="flex gap-10px">
                    <button
                      onClick={handleRemove}
                      disabled={removing}
                      className="px-15px py-8px text-sm font-medium text-whiteColor bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {removing ? "Removing…" : "Confirm Remove"}
                    </button>
                    <button
                      onClick={() => setConfirmRemove(false)}
                      className="px-15px py-8px text-sm text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
