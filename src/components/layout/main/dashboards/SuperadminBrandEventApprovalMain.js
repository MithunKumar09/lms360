"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import Image from "next/image";
import { format } from "date-fns";

export default function SuperadminBrandEventApprovalMain() {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("proposed"); // proposed, approved, rejected

  // Fetch events based on status filter
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['superadmin-brand-events', statusFilter],
    queryFn: async () => {
      if (statusFilter === 'proposed') {
        const response = await apiClient.get('/superadmin/events/proposed');
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch proposed events');
        }
        return response.data;
      } else {
        // For approved/rejected, we need to fetch all brand events with that status
        // For now, we'll use a generic events endpoint or create a new one
        // This is a simplified approach - in production, you'd want a dedicated endpoint
        const response = await apiClient.get(`/events?status=${statusFilter}&limit=100`);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch events');
        }
        // Filter to only brand events
        const brandEvents = (response.data?.events || []).filter(e => e.brand_id);
        return { events: brandEvents };
      }
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const events = eventsData?.events || [];

  // Approve/Reject mutation
  const approveRejectMutation = useMutation({
    mutationFn: async ({ eventId, action }) => {
      const response = await apiClient.post(`/superadmin/events/${eventId}/approve`, { action });
      if (!response.success) {
        throw new Error(response.error || `Failed to ${action} event`);
      }
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-brand-events'] });
      createAlert('success', `Event ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully!`);
    },
    onError: (error) => {
      console.error('Approve/reject event error:', error);
      createAlert('error', error.message || 'Failed to update event status');
    },
  });

  const handleApprove = async (eventId) => {
    if (!confirm('Approve this event proposal?')) {
      return;
    }
    await approveRejectMutation.mutateAsync({ eventId, action: 'approve' });
  };

  const handleReject = async (eventId) => {
    if (!confirm('Reject this event proposal?')) {
      return;
    }
    await approveRejectMutation.mutateAsync({ eventId, action: 'reject' });
  };

  const filteredEvents = events.filter((event) =>
    searchTerm
      ? event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.brand_name?.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  const EventCard = ({ event }) => (
    <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md overflow-hidden border-2 border-borderColor dark:border-borderColor-dark hover:shadow-lg transition-shadow">
      {event.banner_url && (
        <div className="relative w-full h-48 overflow-hidden">
          <Image
            src={event.banner_url}
            alt={event.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor flex-1">
            {event.title}
          </h3>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ml-2 ${
            event.status === 'proposed'
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              : event.status === 'approved'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {event.status}
          </span>
        </div>
        <div className="mb-2">
          <p className="text-sm text-contentColor dark:text-contentColor-dark">
            <strong>Brand:</strong> {event.brand_name || 'N/A'}
          </p>
          <p className="text-sm text-contentColor dark:text-contentColor-dark">
            <strong>Type:</strong> {event.event_type || 'N/A'}
          </p>
        </div>
        {event.description && (
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3 line-clamp-2">
            {event.description}
          </p>
        )}
        <div className="space-y-1 text-xs text-contentColor dark:text-contentColor-dark mb-3">
          <p>
            <strong>Start:</strong> {format(new Date(event.start_date), 'PPP p')}
          </p>
          <p>
            <strong>End:</strong> {format(new Date(event.end_date), 'PPP p')}
          </p>
          <p>
            <strong>Mode:</strong> {event.mode}
          </p>
          {event.is_free ? (
            <p className="text-green-600 dark:text-green-400 font-semibold">Free</p>
          ) : (
            <p>
              <strong>Price:</strong> ₹{parseFloat(event.price || 0).toLocaleString('en-IN')}
            </p>
          )}
        </div>
        {event.status === 'proposed' && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleApprove(event.id)}
              disabled={approveRejectMutation.isPending}
              className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 transition-colors disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => handleReject(event.id)}
              disabled={approveRejectMutation.isPending}
              className="px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 transition-colors disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
        {event.status === 'approved' && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => router.push(`/dashboards/superadmin-brand-event-allocation/${event.id}`)}
              className="px-3 py-1 text-xs font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors"
            >
              Allocate to Colleges
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading proposed events...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div>
            <h1 className="h3 mb-2 fw-bold text-dark">Brand Event Approvals</h1>
            <p className="text-muted mb-0 small">
              Review and approve/reject brand event proposals
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Search events by title or brand name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
        >
          <option value="proposed">Proposed (Pending Approval)</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            {searchTerm ? 'No proposed events found matching your search.' : 'No proposed events pending approval.'}
          </p>
        </div>
      )}

      {/* Events Grid */}
      {filteredEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
