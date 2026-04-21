"use client";

import { useState, useCallback } from "react";
import { 
  FiFilter, 
  FiX, 
  FiSearch, 
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiUsers,
  FiTag,
  FiHome
} from "react-icons/fi";

/**
 * UserFiltersPanel Component
 * 
 * Advanced filtering panel for user list with:
 * - Role multi-select
 * - Organization filter
 * - Status filter
 * - Email verified filter
 * - Date range pickers
 * - Search input
 * - Filter presets
 */
export default function UserFiltersPanel({ 
  filters, 
  onFilterChange, 
  onClearFilters,
  actorRole = "superadmin",
  organizations = [],
  cohorts = [],
  isOpen = false,
  onToggle
}) {
  const isSuperadmin = actorRole === "superadmin";
  const isAdmin = actorRole === "admin";
  const isInstructor = actorRole === "instructor";

  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = useCallback((key, value) => {
    const newFilters = { ...localFilters, [key]: value, page: 1 };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  }, [localFilters, onFilterChange]);

  const handleClearFilters = useCallback(() => {
    const clearedFilters = {
      q: "",
      role: "",
      roles: [],
      status: "",
      verified: "all",
      orgId: "",
      cohortId: "",
      vendor_category: "",
      dateFrom: "",
      dateTo: "",
      page: 1,
      pageSize: filters.pageSize || 20,
      sort: filters.sort || "created_at:desc",
    };
    setLocalFilters(clearedFilters);
    onClearFilters(clearedFilters);
  }, [filters.pageSize, filters.sort, onClearFilters]);

  const activeFiltersCount = [
    localFilters.q,
    localFilters.role || (localFilters.roles && localFilters.roles.length > 0),
    localFilters.status,
    localFilters.verified !== "all",
    localFilters.orgId,
    localFilters.cohortId,
    localFilters.vendor_category,
    localFilters.dateFrom,
    localFilters.dateTo,
  ].filter(Boolean).length;

  if (!isOpen) {
    return (
      <div className="card mb-4 border-0 shadow-sm">
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
                onClick={onToggle}
              >
                <FiFilter size={16} />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="badge bg-primary rounded-pill">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  className="btn btn-link btn-sm text-danger p-0"
                  onClick={handleClearFilters}
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="d-flex align-items-center gap-2">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search users..."
                value={localFilters.q || ""}
                onChange={(e) => handleFilterChange("q", e.target.value)}
                style={{ minWidth: "250px" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-4 border-0 shadow-sm">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0 d-inline-flex align-items-center gap-2">
            <FiFilter size={18} />
            Advanced Filters
            {activeFiltersCount > 0 && (
              <span className="badge bg-primary rounded-pill">
                {activeFiltersCount} active
              </span>
            )}
          </h6>
          <div className="d-flex gap-2">
            {activeFiltersCount > 0 && (
              <button
                type="button"
                className="btn btn-link btn-sm text-danger p-0"
                onClick={handleClearFilters}
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              onClick={onToggle}
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        <div className="row g-3">
          {/* Search */}
          <div className="col-12 col-md-6">
            <label className="form-label small fw-medium d-flex align-items-center gap-2">
              <FiSearch size={14} />
              Search
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search by name or email..."
              value={localFilters.q || ""}
              onChange={(e) => handleFilterChange("q", e.target.value)}
            />
          </div>

          {/* Role Filter */}
          <div className="col-12 col-md-6">
            <label className="form-label small fw-medium d-flex align-items-center gap-2">
              <FiUsers size={14} />
              Role
            </label>
            <select
              className="form-select form-select-sm"
              value={localFilters.role || ""}
              onChange={(e) => handleFilterChange("role", e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="instructor">Instructor</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
              <option value="vendor">Vendor</option>
              <option value="alumni">Alumni</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-12 col-md-6">
            <label className="form-label small fw-medium d-flex align-items-center gap-2">
              <FiTag size={14} />
              Status
            </label>
            <select
              className="form-select form-select-sm"
              value={localFilters.status || ""}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Email Verified Filter */}
          <div className="col-12 col-md-6">
            <label className="form-label small fw-medium d-flex align-items-center gap-2">
              <FiCheckCircle size={14} />
              Email Verified
            </label>
            <select
              className="form-select form-select-sm"
              value={localFilters.verified || "all"}
              onChange={(e) => handleFilterChange("verified", e.target.value)}
            >
              <option value="all">All</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </div>

          {/* Organization Filter (Superadmin only) */}
          {isSuperadmin && organizations.length > 0 && (
            <div className="col-12 col-md-6">
              <label className="form-label small fw-medium d-flex align-items-center gap-2">
                <FiHome size={14} />
                Organization
              </label>
              <select
                className="form-select form-select-sm"
                value={localFilters.orgId || ""}
                onChange={(e) => handleFilterChange("orgId", e.target.value)}
              >
                <option value="">All Organizations</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.display_name || org.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cohort Filter (Admin/Instructor) */}
          {(isAdmin || isInstructor) && cohorts.length > 0 && (
            <div className="col-12 col-md-6">
              <label className="form-label small fw-medium d-flex align-items-center gap-2">
                <FiUsers size={14} />
                Cohort
              </label>
              <select
                className="form-select form-select-sm"
                value={localFilters.cohortId || ""}
                onChange={(e) => handleFilterChange("cohortId", e.target.value)}
              >
                <option value="">All Cohorts</option>
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range - From */}
          <div className="col-12 col-md-6">
            <label className="form-label small fw-medium d-flex align-items-center gap-2">
              <FiCalendar size={14} />
              Created From
            </label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={localFilters.dateFrom || ""}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            />
          </div>

          {/* Date Range - To */}
          <div className="col-12 col-md-6">
            <label className="form-label small fw-medium d-flex align-items-center gap-2">
              <FiCalendar size={14} />
              Created To
            </label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={localFilters.dateTo || ""}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            />
          </div>

          {/* Sort */}
          <div className="col-12 col-md-6">
            <label className="form-label small fw-medium">Sort By</label>
            <select
              className="form-select form-select-sm"
              value={localFilters.sort || "created_at:desc"}
              onChange={(e) => handleFilterChange("sort", e.target.value)}
            >
              <option value="created_at:desc">Newest First</option>
              <option value="created_at:asc">Oldest First</option>
              <option value="email:asc">Email (A-Z)</option>
              <option value="email:desc">Email (Z-A)</option>
              <option value="name:asc">Name (A-Z)</option>
              <option value="name:desc">Name (Z-A)</option>
              <option value="last_login:desc">Last Login (Recent)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

