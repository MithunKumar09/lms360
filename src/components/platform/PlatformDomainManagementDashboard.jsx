// src/components/platform/PlatformDomainManagementDashboard.jsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Globe,
  ShieldCheck,
  Search,
  ExternalLink,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  Plus,
  XCircle,
  Loader2,
} from "lucide-react";

const SSL_BADGES = {
  pending: {
    label: "Pending",
    className:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    icon: Clock3,
  },
  provisioning: {
    label: "Provisioning",
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
    icon: Loader2,
  },
  active: {
    label: "Active",
    className:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
    icon: AlertTriangle,
  },
};

const PLAN_BADGES = {
  basic:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pro:
    "bg-primaryColor/10 text-primaryColor border border-primaryColor/20",
  enterprise:
    "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
};

export default function PlatformDomainManagementDashboard() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState(null);

  const [saving, setSaving] = useState(false);

  const [subdomainInput, setSubdomainInput] = useState("");
  const [planTierInput, setPlanTierInput] = useState("basic");

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [copied, setCopied] = useState(null);

  const BASE_DOMAIN =
    process.env.NEXT_PUBLIC_BASE_DOMAIN || "lms360.in";

  // ─────────────────────────────────────────────────────────────
  // Fetch organizations
  // ─────────────────────────────────────────────────────────────

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/organizations?limit=500");

      if (!res.ok) {
        throw new Error("Failed to load organizations");
      }

      const json = await res.json();

      const rows = json?.organizations || [];

      setOrganizations(rows);

      // Auto-select first org on initial load only
      if (!selectedOrg && rows.length > 0) {
        setSelectedOrg(rows[0]);
        setSubdomainInput(rows[0]?.subdomain || "");
        setPlanTierInput(rows[0]?.plan_tier || "basic");
      }

      return rows;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [selectedOrg]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // ─────────────────────────────────────────────────────────────
  // Filtered orgs
  // ─────────────────────────────────────────────────────────────

  const filteredOrganizations = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return organizations;

    return organizations.filter((org) => {
      return (
        org?.name?.toLowerCase().includes(q) ||
        org?.subdomain?.toLowerCase().includes(q) ||
        org?.custom_domain?.toLowerCase().includes(q) ||
        org?.org_code?.toLowerCase().includes(q)
      );
    });
  }, [organizations, search]);

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  function copyText(text, key) {
    navigator.clipboard.writeText(text);

    setCopied(key);

    setTimeout(() => {
      setCopied(null);
    }, 2000);
  }

  async function patchDomain(payload, message) {
    if (!selectedOrg?.id) return;

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const res = await fetch(
        `/api/superadmin/organizations/${selectedOrg.id}/domain`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to update domain");
      }

      setSuccess(message);

      const freshOrganizations = await fetchOrganizations();

      const refreshed = freshOrganizations.find(
        (o) => o.id === selectedOrg.id
      );

      if (refreshed) {
        setSelectedOrg(refreshed);

        setSubdomainInput(refreshed?.subdomain || "");

        setPlanTierInput(
          refreshed?.plan_tier || "basic"
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function selectOrganization(org) {
    setSelectedOrg(org);
    setSubdomainInput(org?.subdomain || "");
    setPlanTierInput(org?.plan_tier || "basic");
    setError(null);
    setSuccess(null);
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-30px">
      {/* Platform Overview */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-2xl p-25px shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-20px">
          <div>
            <div className="flex items-center gap-10px mb-10px">
              <div className="w-42px h-42px rounded-full bg-primaryColor/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primaryColor" />
              </div>

              <div>
                <h2 className="text-size-22 font-bold text-blackColor dark:text-blackColor-dark">
                  Platform Domain Management
                </h2>

                <p className="text-sm text-contentColor dark:text-contentColor-dark opacity-70 mt-2px">
                  Manage tenant routing, subdomains, and custom domains
                  across the LMS platform.
                </p>
              </div>
            </div>

            <div className="mt-20px grid grid-cols-1 md:grid-cols-3 gap-12px">
              {[
                `https://${BASE_DOMAIN}`,
                `https://www.${BASE_DOMAIN}`,
                `https://admin.${BASE_DOMAIN}`,
              ].map((domain) => (
                <div
                  key={domain}
                  className="rounded-xl border border-borderColor dark:border-borderColor-dark bg-gray-50 dark:bg-gray-900 px-15px py-12px flex items-center justify-between gap-10px"
                >
                  <div>
                    <p className="text-xs uppercase tracking-wide opacity-50 mb-2px">
                      Control Plane
                    </p>

                    <p className="font-mono text-sm text-blackColor dark:text-blackColor-dark break-all">
                      {domain}
                    </p>
                  </div>

                  <button
                    onClick={() => copyText(domain, domain)}
                    className="text-primaryColor hover:opacity-70 transition-opacity"
                  >
                    {copied === domain ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-[220px] rounded-2xl bg-primaryColor/5 border border-primaryColor/10 px-18px py-15px">
            <div className="flex items-center gap-10px mb-10px">
              <ShieldCheck className="w-5 h-5 text-primaryColor" />

              <h3 className="font-semibold text-blackColor dark:text-blackColor-dark">
                Canonical Rules
              </h3>
            </div>

            <ul className="space-y-8px text-sm text-contentColor dark:text-contentColor-dark">
              <li>• Every org must always have a subdomain</li>
              <li>• Subdomain is canonical tenant identity</li>
              <li>• Custom domains are alias/branding layer only</li>
              <li>• Control-plane domains never route tenants</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-25px">
        {/* LEFT: ORG TABLE */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-2xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="p-20px border-b border-borderColor dark:border-borderColor-dark">
            <div className="flex items-center justify-between gap-10px mb-15px">
              <div>
                <h3 className="text-size-18 font-bold text-blackColor dark:text-blackColor-dark">
                  Tenant Domains
                </h3>

                <p className="text-sm opacity-60">
                  {organizations.length} organizations
                </p>
              </div>

              <button
                onClick={fetchOrganizations}
                className="w-40px h-40px rounded-xl border border-borderColor dark:border-borderColor-dark flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-12px top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />

              <input
                type="text"
                placeholder="Search org, subdomain, domain..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-46px pl-38px pr-12px rounded-xl border border-borderColor dark:border-borderColor-dark bg-transparent text-sm outline-none focus:border-primaryColor"
              />
            </div>
          </div>

          {/* Table */}
          <div className="max-h-[700px] overflow-y-auto">
            {loading ? (
              <div className="p-30px flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primaryColor" />
              </div>
            ) : filteredOrganizations.length === 0 ? (
              <div className="p-30px text-center opacity-60 text-sm">
                No organizations found.
              </div>
            ) : (
              filteredOrganizations.map((org) => {
                const isSelected = selectedOrg?.id === org.id;

                const ssl =
                  SSL_BADGES[org.ssl_status] || SSL_BADGES.pending;

                const SSLIcon = ssl.icon;

                return (
                  <button
                    key={org.id}
                    onClick={() => selectOrganization(org)}
                    className={`w-full text-left px-18px py-16px border-b border-borderColor dark:border-borderColor-dark transition-colors ${isSelected
                        ? "bg-primaryColor/5"
                        : "hover:bg-gray-50 dark:hover:bg-gray-900"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-12px">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-blackColor dark:text-blackColor-dark truncate">
                          {org.name}
                        </h4>

                        <div className="mt-8px space-y-5px">
                          <p className="font-mono text-xs opacity-80 truncate">
                            {org.subdomain
                              ? `${org.subdomain}.${BASE_DOMAIN}`
                              : "No subdomain"}
                          </p>

                          {org.custom_domain && (
                            <p className="font-mono text-xs text-primaryColor truncate">
                              {org.custom_domain}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-8px shrink-0">
                        <span
                          className={`px-8px py-4px rounded-full text-[11px] font-semibold border ${ssl.className}`}
                        >
                          <span className="flex items-center gap-4px">
                            <SSLIcon
                              className={`w-3 h-3 ${org.ssl_status === "provisioning"
                                  ? "animate-spin"
                                  : ""
                                }`}
                            />
                            {ssl.label}
                          </span>
                        </span>

                        <span
                          className={`px-8px py-3px rounded-full text-[11px] font-semibold ${PLAN_BADGES[
                            org.plan_tier || "basic"
                            ]
                            }`}
                        >
                          {(org.plan_tier || "basic").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: DETAILS */}
        <div className="space-y-20px">
          {!selectedOrg ? (
            <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-2xl p-30px text-center opacity-60">
              Select an organization.
            </div>
          ) : (
            <>
              {/* Alerts */}
              {error && (
                <div className="p-15px rounded-xl border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-15px rounded-xl border border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300 text-sm">
                  {success}
                </div>
              )}

              {/* Org Overview */}
              <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-2xl p-25px shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-20px">
                  <div>
                    <h2 className="text-size-24 font-bold text-blackColor dark:text-blackColor-dark">
                      {selectedOrg.name}
                    </h2>

                    <div className="flex flex-wrap items-center gap-10px mt-10px">
                      <span className="font-mono text-sm opacity-70">
                        {selectedOrg.org_code}
                      </span>

                      <span
                        className={`px-10px py-4px rounded-full text-xs font-semibold ${PLAN_BADGES[
                          selectedOrg.plan_tier || "basic"
                          ]
                          }`}
                      >
                        {(selectedOrg.plan_tier || "basic").toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-10px">
                    {selectedOrg.subdomain && (
                      <a
                        href={`https://${selectedOrg.subdomain}.${BASE_DOMAIN}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-8px px-15px py-10px rounded-xl border border-borderColor dark:border-borderColor-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
                      >
                        Open Tenant
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    {selectedOrg.custom_domain && (
                      <a
                        href={`https://${selectedOrg.custom_domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-8px px-15px py-10px rounded-xl bg-primaryColor text-whiteColor text-sm hover:opacity-90"
                      >
                        Open Custom Domain
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Domain Settings */}
              <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-2xl p-25px shadow-sm space-y-25px">
                <div>
                  <h3 className="text-size-18 font-bold mb-6px">
                    Canonical Tenant Subdomain
                  </h3>

                  <p className="text-sm opacity-60">
                    This is the permanent fallback identity for the
                    organization. Custom domains are aliases only.
                  </p>
                </div>

                {/* Subdomain */}
                <div>
                  <label className="block text-sm font-medium mb-10px">
                    Subdomain
                  </label>

                  <div className="flex flex-col md:flex-row gap-12px">
                    <div className="flex-1 flex items-center rounded-xl border border-borderColor dark:border-borderColor-dark overflow-hidden">
                      <input
                        type="text"
                        value={subdomainInput}
                        onChange={(e) =>
                          setSubdomainInput(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, "")
                          )
                        }
                        placeholder="alphaacademy"
                        className="flex-1 h-50px px-15px bg-transparent outline-none text-sm font-mono"
                      />

                      <div className="px-15px h-50px flex items-center border-l border-borderColor dark:border-borderColor-dark bg-gray-50 dark:bg-gray-900 font-mono text-xs opacity-70">
                        .{BASE_DOMAIN}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={
                        saving ||
                        !subdomainInput.trim() ||
                        subdomainInput === selectedOrg.subdomain
                      }
                      onClick={() =>
                        patchDomain(
                          {
                            subdomain: subdomainInput.trim(),
                          },
                          "Subdomain updated successfully."
                        )
                      }
                      className="h-50px px-20px rounded-xl bg-primaryColor text-whiteColor text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? "Updating..." : "Update"}
                    </button>
                  </div>
                </div>

                {/* Plan Tier */}
                <div>
                  <label className="block text-sm font-medium mb-10px">
                    Plan Tier
                  </label>

                  <div className="flex flex-col md:flex-row gap-12px">
                    <select
                      value={planTierInput}
                      onChange={(e) =>
                        setPlanTierInput(e.target.value)
                      }
                      className="flex-1 h-50px px-15px rounded-xl border border-borderColor dark:border-borderColor-dark bg-transparent outline-none text-sm"
                    >
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">
                        Enterprise
                      </option>
                    </select>

                    <button
                      type="button"
                      disabled={
                        saving ||
                        planTierInput === selectedOrg.plan_tier
                      }
                      onClick={() =>
                        patchDomain(
                          {
                            planTier: planTierInput,
                          },
                          "Plan tier updated successfully."
                        )
                      }
                      className="h-50px px-20px rounded-xl border border-borderColor dark:border-borderColor-dark text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      Save Plan
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Domain */}
              <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-2xl p-25px shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-20px">
                  <div className="min-w-0">
                    <h3 className="text-size-18 font-bold mb-6px">
                      Custom Domain
                    </h3>

                    {selectedOrg.custom_domain ? (
                      <>
                        <p className="font-mono text-sm text-primaryColor break-all">
                          {selectedOrg.custom_domain}
                        </p>

                        <p className="text-sm opacity-60 mt-10px">
                          SSL lifecycle and DNS verification are managed
                          automatically.
                        </p>
                      </>
                    ) : (
                      <p className="text-sm opacity-60">
                        No custom domain configured for this organization.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-10px">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        patchDomain(
                          {
                            invalidateCache: true,
                          },
                          "Tenant cache invalidated."
                        )
                      }
                      className="inline-flex items-center gap-8px px-15px py-10px rounded-xl border border-borderColor dark:border-borderColor-dark hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Invalidate Cache
                    </button>

                    {selectedOrg.custom_domain && (
                      <>
                        {!selectedOrg.domain_verified && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              patchDomain(
                                {
                                  forceVerify: true,
                                },
                                "Domain force-verified."
                              )
                            }
                            className="inline-flex items-center gap-8px px-15px py-10px rounded-xl bg-yellow-500 text-whiteColor hover:opacity-90 text-sm"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            Force Verify
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            const confirmed = window.confirm(
                              "Remove this custom domain?\n\nThe organization will revert to subdomain-only routing."
                            );

                            if (!confirmed) return;

                            patchDomain(
                              {
                                clearCustomDomain: true,
                              },
                              "Custom domain removed."
                            );
                          }}
                          className="inline-flex items-center gap-8px px-15px py-10px rounded-xl bg-red-600 text-whiteColor hover:bg-red-700 text-sm"
                        >
                          <XCircle className="w-4 h-4" />
                          Remove Domain
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}   