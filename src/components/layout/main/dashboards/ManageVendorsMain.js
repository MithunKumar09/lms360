"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import { useOrganizations } from "@/hooks/api/useDropdownData";
import useSweetAlert from "@/hooks/useSweetAlert";

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-whiteColor dark:bg-whiteColor-dark border-b border-borderColor dark:border-borderColor-dark px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-blackColor dark:text-blackColor-dark">{title}</h2>
          <button
            onClick={onClose}
            className="text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function ManageVendorsMain() {
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // UI state
  const [filters, setFilters] = useState({
    search: "",
    page: 1,
    limit: 20,
  });
  
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrganizations, setSelectedOrganizations] = useState([]);
  const [newStatus, setNewStatus] = useState(true);

  // Fetch vendors
  const { data: vendorsData, isLoading, refetch } = useQuery({
    queryKey: ['vendors', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);

      const response = await apiClient.get(`/vendors?${queryParams.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch vendors');
      }

      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const vendors = vendorsData?.vendors || [];
  const pagination = vendorsData?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  };

  // Fetch organizations for multiselect
  const { data: orgsData } = useOrganizations({ limit: 100, status: 'active' }, { enabled: showEditModal });
  const organizationOptions = (orgsData?.organizations || []).map(org => ({
    value: org.id,
    label: org.name || org.organizationName || `Organization ${org.id}`,
  }));

  // Update vendor mutation
  const updateVendor = useMutation({
    mutationFn: async ({ vendorId, organizationIds, isActive }) => {
      const payload = {};
      if (organizationIds !== undefined) payload.organization_ids = organizationIds;
      if (isActive !== undefined) payload.is_active = isActive;

      const response = await apiClient.put(`/vendors/${vendorId}`, payload);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update vendor');
      }

      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setShowEditModal(false);
      setShowStatusModal(false);
      setSelectedVendor(null);
      setSelectedOrganizations([]);
      if (variables.isActive !== undefined) {
        createAlert('success', `Vendor ${variables.isActive ? 'activated' : 'deactivated'} successfully!`);
      } else {
        createAlert('success', 'Vendor organizations updated successfully!');
      }
    },
    onError: (error) => {
      console.error('Update vendor error:', error);
      createAlert('error', error.message || 'Failed to update vendor');
    },
  });

  const handleEdit = (vendor) => {
    setSelectedVendor(vendor);
    setSelectedOrganizations(vendor.organizations?.map(org => org.id) || []);
    setShowEditModal(true);
  };

  const handleStatusChange = (vendor) => {
    setSelectedVendor(vendor);
    setNewStatus(!vendor.is_active);
    setShowStatusModal(true);
  };

  const handleUpdateSubmit = async () => {
    await updateVendor.mutateAsync({
      vendorId: selectedVendor.id,
      organizationIds: selectedOrganizations,
    });
  };

  const handleStatusSubmit = async () => {
    await updateVendor.mutateAsync({
      vendorId: selectedVendor.id,
      isActive: newStatus,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const filteredVendors = useMemo(() => {
    if (!filters.search) return vendors;
    const search = filters.search.toLowerCase();
    return vendors.filter((vendor) => {
      return (
        vendor.email?.toLowerCase().includes(search) ||
        vendor.first_name?.toLowerCase().includes(search) ||
        vendor.last_name?.toLowerCase().includes(search) ||
        `${vendor.first_name} ${vendor.last_name}`.toLowerCase().includes(search) ||
        vendor.organizations?.some(org => org.name?.toLowerCase().includes(search))
      );
    });
  }, [vendors, filters.search]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Manage Vendors</h1>
              <p className="text-muted mb-0 small">
                View and manage vendor organization assignments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name, email, or organization..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-contentColor dark:text-contentColor-dark">Loading vendors...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredVendors.length === 0 && (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            No vendors found
          </p>
        </div>
      )}

      {/* Vendors List */}
      {!isLoading && filteredVendors.length > 0 && (
        <div className="space-y-4">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Vendor Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-darkdeep4 flex-shrink-0 flex items-center justify-center">
                    {vendor.avatar_url ? (
                      <img
                        src={vendor.avatar_url}
                        alt={`${vendor.first_name} ${vendor.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primaryColor/20 text-primaryColor text-xl font-bold">
                        {(vendor.first_name?.[0] || vendor.email?.[0] || "V").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                        {`${vendor.first_name || ""} ${vendor.last_name || ""}`.trim() || vendor.email || "Unknown"}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          vendor.is_active
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                        }`}
                      >
                        {vendor.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-contentColor dark:text-contentColor-dark">
                      <p>
                        <span className="font-semibold">Email:</span> {vendor.email}
                      </p>
                      <p>
                        <span className="font-semibold">Organizations:</span>{" "}
                        {vendor.organizations && vendor.organizations.length > 0
                          ? vendor.organizations.map(org => org.name || org.display_name).join(", ")
                          : "None assigned"}
                      </p>
                      <p>
                        <span className="font-semibold">Events:</span> {vendor.events_count || 0}
                        {" | "}
                        <span className="font-semibold">Workshops:</span> {vendor.workshops_count || 0}
                      </p>
                      <p>
                        <span className="font-semibold">Created:</span> {formatDate(vendor.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(vendor)}
                    className="px-4 py-2 text-sm font-semibold text-primaryColor bg-primaryColor/10 rounded-md hover:bg-primaryColor/20 transition-colors"
                  >
                    Edit Organizations
                  </button>
                  <button
                    onClick={() => handleStatusChange(vendor)}
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                      vendor.is_active
                        ? "text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                        : "text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                    }`}
                  >
                    {vendor.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-contentColor dark:text-contentColor-dark">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} vendors
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              disabled={pagination.page === 1}
              className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={pagination.page >= pagination.totalPages}
              className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedVendor(null);
          setSelectedOrganizations([]);
        }}
        title="Edit Vendor Organizations"
      >
        {selectedVendor && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-4">
                Update organization assignments for <strong>{`${selectedVendor.first_name} ${selectedVendor.last_name}`.trim()}</strong> ({selectedVendor.email})
              </p>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Select Organizations
              </label>
              <div className="max-h-60 overflow-y-auto border-2 border-borderColor dark:border-borderColor-dark rounded-md p-4">
                {organizationOptions.length === 0 ? (
                  <p className="text-sm text-contentColor dark:text-contentColor-dark">Loading organizations...</p>
                ) : (
                  organizationOptions.map((org) => (
                    <label key={org.value} className="flex items-center gap-2 py-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedOrganizations.includes(org.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrganizations([...selectedOrganizations, org.value]);
                          } else {
                            setSelectedOrganizations(selectedOrganizations.filter(id => id !== org.value));
                          }
                        }}
                        className="w-4 h-4 text-primaryColor border-borderColor rounded focus:ring-primaryColor"
                      />
                      <span className="text-sm text-blackColor dark:text-blackColor-dark">{org.label}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedVendor(null);
                  setSelectedOrganizations([]);
                }}
                className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep3 dark:hover:bg-darkdeep3-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSubmit}
                disabled={updateVendor.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateVendor.isPending ? "Updating..." : "Update Organizations"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Change Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSelectedVendor(null);
        }}
        title={`${newStatus ? 'Activate' : 'Deactivate'} Vendor`}
      >
        {selectedVendor && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-4">
                Are you sure you want to {newStatus ? 'activate' : 'deactivate'} <strong>{`${selectedVendor.first_name} ${selectedVendor.last_name}`.trim()}</strong> ({selectedVendor.email})?
              </p>
              {!newStatus && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-400">
                    ⚠️ Deactivating this vendor will prevent them from accessing the system and creating new events/workshops.
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedVendor(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep3 dark:hover:bg-darkdeep3-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusSubmit}
                disabled={updateVendor.isPending}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  newStatus
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {updateVendor.isPending ? "Processing..." : `${newStatus ? 'Activate' : 'Deactivate'} Vendor`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

