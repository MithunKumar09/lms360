"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import useSweetAlert from "@/hooks/useSweetAlert";

const COMPANY_SIZES = [
  { value: "", label: "Select company size (optional)" },
  { value: "startup", label: "Startup" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "enterprise", label: "Enterprise" },
];

function normalizeHiringNeeds(hiringNeeds) {
  const hn = hiringNeeds && typeof hiringNeeds === "object" ? hiringNeeds : {};
  return {
    roles: Array.isArray(hn.roles) ? hn.roles.filter(Boolean) : [],
    skills: Array.isArray(hn.skills) ? hn.skills.filter(Boolean) : [],
    locations: Array.isArray(hn.locations) ? hn.locations.filter(Boolean) : [],
    experienceLevels: Array.isArray(hn.experienceLevels)
      ? hn.experienceLevels.filter(Boolean)
      : [],
  };
}

function splitCsvToList(value) {
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function TagInput({ label, helper, value, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const addTags = () => {
    const next = splitCsvToList(draft);
    if (next.length === 0) return;
    const merged = Array.from(new Set([...(value || []), ...next]));
    onChange(merged);
    setDraft("");
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
        {label}
      </label>
      {helper ? (
        <p className="text-xs text-contentColor dark:text-contentColor-dark mb-2">
          {helper}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 mb-2">
        {(value || []).length === 0 ? (
          <span className="text-xs text-contentColor dark:text-contentColor-dark opacity-70">
            No items added
          </span>
        ) : (
          (value || []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-borderColor dark:border-borderColor-dark text-xs text-blackColor dark:text-blackColor-dark"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange((value || []).filter((t) => t !== tag))}
                className="opacity-70 hover:opacity-100"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTags();
            }
          }}
          className="flex-1 px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
          placeholder={placeholder || "Type and press Enter (or comma-separated)"}
        />
        <button
          type="button"
          onClick={addTags}
          className="px-4 py-2 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90 transition"
        >
          Add
        </button>
      </div>
    </div>
  );
}

const CompanyProfileMain = () => {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState(null);

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [companyCulture, setCompanyCulture] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const [hiringNeeds, setHiringNeeds] = useState(() =>
    normalizeHiringNeeds(null)
  );

  const verificationLabel = useMemo(() => {
    if (!profile) return null;
    return profile.isVerified ? "Verified" : "Not Verified";
  }, [profile]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/company/profile", { method: "GET" });
      const json = await res.json();
      if (!json?.success) {
        throw new Error(json?.error || "Failed to load company profile");
      }

      const p = json.data || null;
      setProfile(p);

      setCompanyName(p?.companyName || "");
      setIndustry(p?.industry || "");
      setCompanySize(p?.companySize || "");
      setWebsite(p?.website || "");
      setDescription(p?.description || "");
      setCompanyCulture(p?.companyCulture || "");
      setLogoUrl(p?.logoUrl || "");
      setBannerUrl(p?.bannerUrl || "");
      setHiringNeeds(normalizeHiringNeeds(p?.hiringNeeds));
    } catch (e) {
      setError(e?.message || "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  async function uploadImageAndGetUrl(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mediaType", "image");

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const json = await res.json();
    if (!json?.success) {
      throw new Error(json?.error || "Upload failed");
    }
    return json.url;
  }

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!companyName || companyName.trim().length === 0) {
      createAlert({
        icon: "error",
        title: "Validation error",
        text: "Company name is required.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        companyName: companyName.trim(),
        industry: industry || null,
        companySize: companySize || null,
        website: website || null,
        description: description || null,
        companyCulture: companyCulture || null,
        hiringNeeds,
        logoUrl: logoUrl || null,
        bannerUrl: bannerUrl || null,
      };

      const res = await fetch("/api/company/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json?.success) {
        throw new Error(json?.error || "Failed to update profile");
      }

      setProfile(json.data || null);
      createAlert({
        icon: "success",
        title: "Saved",
        text: "Company profile updated successfully.",
      }).then(() => {
        router.back();
      });      
    } catch (e2) {
      createAlert({
        icon: "error",
        title: "Error",
        text: e2?.message || "Failed to update profile",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <HeadingDashboard
        text="Company Profile"
        breadcrumbItems={[
          { text: "Dashboard", href: "/dashboards/company-dashboard" },
          { text: "Profile", href: "/dashboards/company-profile" },
        ]}
      />

      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px mb-30px">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
              Profile & Hiring Needs
            </h2>
            <p className="text-sm text-contentColor dark:text-contentColor-dark mt-1">
              Keep your company profile updated. Verification is managed by admin/superadmin.
            </p>
          </div>
          {verificationLabel ? (
            <div
              className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                profile?.isVerified
                  ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300"
                  : "border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
              }`}
            >
              {verificationLabel}
            </div>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px">
          <p className="text-contentColor dark:text-contentColor-dark">
            Loading profile...
          </p>
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
        <form
          onSubmit={handleSave}
          className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                placeholder="e.g. Acme Technologies"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
                Industry
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                placeholder="e.g. Software, FinTech, Healthcare"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
                Company Size
              </label>
              <select
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
              >
                {COMPANY_SIZES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                placeholder="Tell students what your company does..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
                Company Culture
              </label>
              <textarea
                value={companyCulture}
                onChange={(e) => setCompanyCulture(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                placeholder="Share your values, team culture, work environment..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TagInput
              label="Hiring Roles"
              helper="Add roles you frequently hire for (comma-separated or press Enter)."
              value={hiringNeeds.roles}
              onChange={(roles) => setHiringNeeds((prev) => ({ ...prev, roles }))}
              placeholder="e.g. Frontend Developer, QA Engineer"
            />
            <TagInput
              label="Skills Needed"
              helper="Add skills required for your openings."
              value={hiringNeeds.skills}
              onChange={(skills) => setHiringNeeds((prev) => ({ ...prev, skills }))}
              placeholder="e.g. React, Node.js, SQL"
            />
            <TagInput
              label="Hiring Locations"
              helper="Add locations where you hire."
              value={hiringNeeds.locations}
              onChange={(locations) =>
                setHiringNeeds((prev) => ({ ...prev, locations }))
              }
              placeholder="e.g. Bangalore, Remote"
            />
            <TagInput
              label="Experience Levels"
              helper="Add desired experience ranges or levels."
              value={hiringNeeds.experienceLevels}
              onChange={(experienceLevels) =>
                setHiringNeeds((prev) => ({ ...prev, experienceLevels }))
              }
              placeholder="e.g. 0-2 years, 2-5 years"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
                Logo
              </label>
              <input
                type="file"
                accept="image/*"
                disabled={isUploadingLogo}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsUploadingLogo(true);
                  try {
                    const url = await uploadImageAndGetUrl(file);
                    setLogoUrl(url);
                    createAlert({
                      icon: "success",
                      title: "Uploaded",
                      text: "Logo uploaded successfully.",
                    });
                  } catch (err) {
                    createAlert({
                      icon: "error",
                      title: "Upload failed",
                      text: err?.message || "Upload failed",
                    });
                  } finally {
                    setIsUploadingLogo(false);
                    // allow selecting same file again
                    e.target.value = "";
                  }
                }}
                className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
              />
              {isUploadingLogo ? (
                <p className="text-xs text-contentColor dark:text-contentColor-dark mt-2">
                  Uploading...
                </p>
              ) : logoUrl ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="h-12 w-12 rounded object-cover border border-borderColor dark:border-borderColor-dark"
                  />
                  <a
                    href={logoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primaryColor dark:text-primaryColor-dark underline"
                  >
                    View
                  </a>
                </div>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
                Banner
              </label>
              <input
                type="file"
                accept="image/*"
                disabled={isUploadingBanner}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsUploadingBanner(true);
                  try {
                    const url = await uploadImageAndGetUrl(file);
                    setBannerUrl(url);
                    createAlert({
                      icon: "success",
                      title: "Uploaded",
                      text: "Banner uploaded successfully.",
                    });
                  } catch (err) {
                    createAlert({
                      icon: "error",
                      title: "Upload failed",
                      text: err?.message || "Upload failed",
                    });
                  } finally {
                    setIsUploadingBanner(false);
                    // allow selecting same file again
                    e.target.value = "";
                  }
                }}
                className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
              />
              {isUploadingBanner ? (
                <p className="text-xs text-contentColor dark:text-contentColor-dark mt-2">
                  Uploading...
                </p>
              ) : bannerUrl ? (
                <div className="mt-3">
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    className="h-24 w-full rounded object-cover border border-borderColor dark:border-borderColor-dark"
                  />
                  <a
                    href={bannerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primaryColor dark:text-primaryColor-dark underline mt-2 inline-block"
                  >
                    View
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2 border-t border-borderColor dark:border-borderColor-dark">
            <div className="text-sm text-contentColor dark:text-contentColor-dark">
              {profile?.verifiedAt ? (
                <span>
                  Verified at:{" "}
                  <span className="font-semibold">
                    {new Date(profile.verifiedAt).toLocaleString()}
                  </span>
                </span>
              ) : (
                <span>Verification date will appear here once approved.</span>
              )}
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      )}
    </>
  );
};

export default CompanyProfileMain;
