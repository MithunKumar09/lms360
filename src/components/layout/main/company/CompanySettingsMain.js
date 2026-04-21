"use client";

import React, { useEffect, useMemo, useState } from "react";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import useSweetAlert from "@/hooks/useSweetAlert";
import Link from "next/link";

const CompanySettingsMain = () => {
  const createAlert = useSweetAlert();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  const [tpLoading, setTpLoading] = useState(true);
  const [tpError, setTpError] = useState(null);
  const [tpRequest, setTpRequest] = useState(null);
  const [tpSubmitting, setTpSubmitting] = useState(false);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/company/profile", { method: "GET" });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.error || "Failed to load profile");
      setProfile(json.data || null);
    } catch (e) {
      setError(e?.message || "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTalentPoolStatus = async () => {
    setTpLoading(true);
    setTpError(null);
    try {
      const res = await fetch("/api/company/talent-pool/request", { method: "GET" });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.error || "Failed to load talent pool access status");
      setTpRequest(json.data || null);
    } catch (e) {
      setTpError(e?.message || "Failed to load talent pool access status");
    } finally {
      setTpLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchTalentPoolStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verificationPill = useMemo(() => {
    if (!profile) return null;
    return profile.isVerified ? "Verified" : "Not Verified";
  }, [profile]);

  const tpStatus = tpRequest?.status || null;
  const canRequestTalentPool =
    !tpStatus || tpStatus === "rejected" || tpStatus === "revoked";

  const handleRequestTalentPool = async () => {
    setTpSubmitting(true);
    try {
      const res = await fetch("/api/company/talent-pool/request", { method: "POST" });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.error || "Failed to submit access request");
      createAlert({
        icon: "success",
        title: "Request submitted",
        text: json?.message || "Talent pool access request submitted for approval.",
      });
      await fetchTalentPoolStatus();
    } catch (e) {
      createAlert({
        icon: "error",
        title: "Error",
        text: e?.message || "Failed to submit request",
      });
    } finally {
      setTpSubmitting(false);
    }
  };

  return (
    <>
      <HeadingDashboard
        text="Company Settings"
        breadcrumbItems={[
          { text: "Dashboard", href: "/dashboards/company-dashboard" },
          { text: "Settings", href: "/dashboards/company-settings" },
        ]}
      />

      {isLoading ? (
        <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px">
          <p className="text-contentColor dark:text-contentColor-dark">Loading settings...</p>
        </div>
      ) : error ? (
        <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchProfile}
            className="px-4 py-2 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90 transition"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Account & Verification */}
          <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
                  Account & Verification
                </h2>
                <p className="text-sm text-contentColor dark:text-contentColor-dark mt-1">
                  Your company account status and verification details.
                </p>
              </div>
              {verificationPill ? (
                <div
                  className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                    profile?.isVerified
                      ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300"
                      : "border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
                  }`}
                >
                  {verificationPill}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-borderColor dark:border-borderColor-dark rounded-lg p-4">
                <p className="text-xs text-contentColor dark:text-contentColor-dark">Company Name</p>
                <p className="text-base font-semibold text-blackColor dark:text-blackColor-dark mt-1">
                  {profile?.companyName || "—"}
                </p>
              </div>
              <div className="border border-borderColor dark:border-borderColor-dark rounded-lg p-4">
                <p className="text-xs text-contentColor dark:text-contentColor-dark">Company Email</p>
                <p className="text-base font-semibold text-blackColor dark:text-blackColor-dark mt-1">
                  {profile?.companyEmail || "—"}
                </p>
              </div>
              <div className="border border-borderColor dark:border-borderColor-dark rounded-lg p-4">
                <p className="text-xs text-contentColor dark:text-contentColor-dark">Industry</p>
                <p className="text-base font-semibold text-blackColor dark:text-blackColor-dark mt-1">
                  {profile?.industry || "—"}
                </p>
              </div>
              <div className="border border-borderColor dark:border-borderColor-dark rounded-lg p-4">
                <p className="text-xs text-contentColor dark:text-contentColor-dark">Verified At</p>
                <p className="text-base font-semibold text-blackColor dark:text-blackColor-dark mt-1">
                  {profile?.verifiedAt ? new Date(profile.verifiedAt).toLocaleString() : "—"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboards/company-profile"
                className="px-6 py-3 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90 transition text-center"
              >
                Edit Company Profile
              </Link>
              <button
                type="button"
                onClick={fetchProfile}
                className="px-6 py-3 border border-borderColor dark:border-borderColor-dark rounded text-blackColor dark:text-blackColor-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Talent Pool Access */}
          <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
                  Talent Pool Access
                </h2>
                <p className="text-sm text-contentColor dark:text-contentColor-dark mt-1">
                  Request access to view student profiles, portfolios, and shortlist candidates.
                </p>
              </div>
              <div className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Status:{" "}
                <span className="capitalize">
                  {tpLoading ? "loading" : tpStatus || "not requested"}
                </span>
              </div>
            </div>

            {tpLoading ? (
              <p className="text-contentColor dark:text-contentColor-dark">Loading talent pool status...</p>
            ) : tpError ? (
              <div>
                <p className="text-red-600 dark:text-red-400 mb-4">{tpError}</p>
                <button
                  type="button"
                  onClick={fetchTalentPoolStatus}
                  className="px-4 py-2 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90 transition"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {tpStatus === "rejected" && tpRequest?.request?.rejectionReason ? (
                  <div className="border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                      Request rejected
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {tpRequest.request.rejectionReason}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleRequestTalentPool}
                    disabled={!canRequestTalentPool || tpSubmitting}
                    className="px-6 py-3 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {tpSubmitting
                      ? "Submitting..."
                      : canRequestTalentPool
                      ? "Request Access"
                      : "Request Submitted"}
                  </button>
                  <button
                    type="button"
                    onClick={fetchTalentPoolStatus}
                    className="px-6 py-3 border border-borderColor dark:border-borderColor-dark rounded text-blackColor dark:text-blackColor-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    Refresh Status
                  </button>
                </div>

                <p className="text-xs text-contentColor dark:text-contentColor-dark">
                  Approval is handled by admin/superadmin. Once approved, you can use Talent Pool features from the company dashboard.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CompanySettingsMain;
