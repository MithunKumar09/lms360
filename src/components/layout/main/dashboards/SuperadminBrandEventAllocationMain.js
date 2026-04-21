"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import { format } from "date-fns";

export default function SuperadminBrandEventAllocationMain({ eventId }) {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const [selectedOrgIds, setSelectedOrgIds] = useState([]);

  // Fetch event details
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['superadmin-event', eventId],
    queryFn: async () => {
      const response = await apiClient.get(`/events/${eventId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch event');
      }
      return response.data;
    },
    enabled: !!eventId,
  });

  // Fetch all organizations
  const { data: orgsData, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['superadmin-organizations'],
    queryFn: async () => {
      const response = await apiClient.get('/organizations?limit=1000');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch organizations');
      }
      return response.data;
    },
  });

  // Fetch existing allocations
  const { data: allocationsData } = useQuery({
    queryKey: ['superadmin-event-allocations', eventId],
    queryFn: async () => {
      // Note: The API path uses /superadmin/brands/[id]/events/allocations
      // where [id] is eventId (not brandId) - this follows the plan structure
      const response = await apiClient.get(`/superadmin/brands/${eventId}/events/allocations`);
      if (!response.success) {
        // If endpoint doesn't exist yet, return empty
        return { allocations: [] };
      }
      return response.data;
    },
    enabled: !!eventId,
  });

  const event = eventData?.event;
  const organizations = orgsData?.organizations || [];
  const existingAllocations = allocationsData?.allocations || [];
  const existingOrgIds = new Set(existingAllocations.map(a => a.org_id));

  // Allocation mutation
  const allocateMutation = useMutation({
    mutationFn: async (orgIds) => {
      const response = await apiClient.post(`/superadmin/brands/${eventId}/events/allocate`, {
        org_ids: orgIds,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to allocate event');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-event-allocations', eventId] });
      setSelectedOrgIds([]);
      createAlert('success', 'Event allocated to colleges successfully!');
    },
    onError: (error) => {
      console.error('Allocate event error:', error);
      createAlert('error', error.message || 'Failed to allocate event');
    },
  });

  const handleOrgToggle = (orgId) => {
    setSelectedOrgIds((prev) =>
      prev.includes(orgId)
        ? prev.filter((id) => id !== orgId)
        : [...prev, orgId]
    );
  };

  const handleAllocate = async () => {
    if (selectedOrgIds.length === 0) {
      createAlert('warning', 'Please select at least one organization');
      return;
    }

    if (!confirm(`Allocate this event to ${selectedOrgIds.length} organization(s)?`)) {
      return;
    }

    await allocateMutation.mutateAsync(selectedOrgIds);
  };

  if (isLoadingEvent || isLoadingOrgs) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Event not found</p>
      </div>
    );
  }

  if (event.status !== 'approved') {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">
          Event must be approved before allocating to colleges.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="mb-4">
            <button
              onClick={() => router.push('/dashboards/superadmin-brand-event-approval')}
              className="btn btn-sm btn-outline-secondary mb-3"
            >
              ← Back to Event Approvals
            </button>
            <h1 className="h3 mb-2 fw-bold text-dark">Allocate Event to Colleges</h1>
            <p className="text-muted mb-0 small">
              Select organizations that should have visibility to this event
            </p>
          </div>

          {/* Event Info */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <h5 className="fw-semibold mb-2">{event.title}</h5>
            <p className="text-sm text-muted mb-1">
              <strong>Type:</strong> {event.event_type || 'N/A'}
            </p>
            <p className="text-sm text-muted mb-1">
              <strong>Start:</strong> {format(new Date(event.start_date), 'PPP p')}
            </p>
            <p className="text-sm text-muted">
              <strong>End:</strong> {format(new Date(event.end_date), 'PPP p')}
            </p>
          </div>

          {/* Existing Allocations */}
          {existingAllocations.length > 0 && (
            <div className="mb-4">
              <h5 className="fw-semibold mb-2">Currently Allocated To:</h5>
              <div className="flex flex-wrap gap-2">
                {existingAllocations.map((allocation) => (
                  <span
                    key={allocation.id}
                    className="badge bg-success"
                  >
                    {allocation.org_name || allocation.org_display_name || 'N/A'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Selection Summary */}
          {selectedOrgIds.length > 0 && (
            <div className="mb-4 p-3 bg-primaryColor/10 rounded-md">
              <div className="d-flex align-items-center justify-content-between">
                <span className="fw-semibold">
                  {selectedOrgIds.length} organization(s) selected
                </span>
                <button
                  onClick={handleAllocate}
                  disabled={allocateMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  {allocateMutation.isPending ? 'Allocating...' : 'Allocate Selected'}
                </button>
              </div>
            </div>
          )}

          {/* Organizations List */}
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedOrgIds.length === organizations.length && organizations.length > 0}
                      onChange={() => {
                        if (selectedOrgIds.length === organizations.length) {
                          setSelectedOrgIds([]);
                        } else {
                          setSelectedOrgIds(organizations.map(org => org.id));
                        }
                      }}
                    />
                  </th>
                  <th>Organization Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Allocated</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedOrgIds.includes(org.id)}
                        onChange={() => handleOrgToggle(org.id)}
                        disabled={existingOrgIds.has(org.id)}
                      />
                    </td>
                    <td>{org.name || org.display_name || 'N/A'}</td>
                    <td>{org.org_type || 'N/A'}</td>
                    <td>
                      <span className={`badge ${
                        org.status === 'active' ? 'bg-success' : 'bg-secondary'
                      }`}>
                        {org.status || 'N/A'}
                      </span>
                    </td>
                    <td>
                      {existingOrgIds.has(org.id) && (
                        <span className="badge bg-info">Yes</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {organizations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-contentColor dark:text-contentColor-dark">
                No organizations found.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
