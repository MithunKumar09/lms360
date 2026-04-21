"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { format } from "date-fns";
import useSweetAlert from "@/hooks/useSweetAlert";
import AdvancedPagination from "@/components/shared/courses/AdvancedPagination";
import ExportButton from "@/components/shared/export/ExportButton";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown";
import SearchInput from "@/components/shared/filters/SearchInput";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";

export default function EventRegistrationsManagement({ eventId }) {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  // Fetch registrations
  const { data, isLoading, error } = useQuery({
    queryKey: ['brandEventRegistrations', eventId, page, limit, status, paymentStatus, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (status) params.append('status', status);
      if (paymentStatus) params.append('paymentStatus', paymentStatus);
      if (search) params.append('search', search);

      const response = await apiClient.get(`/brand/events/${eventId}/registrations?${params}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch registrations');
      }
      return response.data;
    },
    enabled: !!eventId,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ registrationId, status }) => {
      const response = await apiClient.put(`/brand/events/${eventId}/registrations/${registrationId}`, { status });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update registration');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandEventRegistrations', eventId] });
      createAlert('success', 'Registration status updated successfully!');
    },
    onError: (error) => {
      console.error('Update registration error:', error);
      createAlert('error', error.message || 'Failed to update registration');
    },
  });

  const registrations = data?.registrations || [];
  const event = data?.event;
  const pagination = data?.pagination || {};

  const handleSearchChange = (newSearch) => {
    setSearch(newSearch);
    setPage(1);
  };

  const handleStatusUpdate = async (registrationId, newStatus) => {
    if (!confirm(`Are you sure you want to update this registration status to "${newStatus}"?`)) {
      return;
    }
    await updateStatusMutation.mutateAsync({ registrationId, status: newStatus });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), 'PPP p');
  };

  // Build filters object for export
  const exportFilters = {
    search: search || null,
    status: status || null,
    paymentStatus: paymentStatus || null,
  };

  const statusOptions = [
    { id: "all", label: "All Status", value: "" },
    { id: "registered", label: "Registered", value: "registered" },
    { id: "cancelled", label: "Cancelled", value: "cancelled" },
    { id: "attended", label: "Attended", value: "attended" },
    { id: "no_show", label: "No Show", value: "no_show" },
  ];

  const paymentStatusOptions = [
    { id: "all", label: "All Payment Status", value: "" },
    { id: "paid", label: "Paid", value: "paid" },
    { id: "pending", label: "Pending", value: "pending" },
    { id: "failed", label: "Failed", value: "failed" },
  ];

  if (isLoading) {
    return (
      <div>
        <SkeletonLoader count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-5 p-20px">
        <p className="text-red-600 dark:text-red-400">
          {error?.message || "Failed to load registrations"}
        </p>
        <button
          onClick={() => router.push("/dashboards/brand-events")}
          className="mt-15px px-20px py-10px bg-primaryColor text-whiteColor rounded-5 text-14px font-semibold hover:bg-primaryColor/90 transition-colors"
        >
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        {/* Header */}
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
                Event Registrations
              </h2>
              {event && (
                <p className="text-contentColor dark:text-contentColor-dark">
                  {event.title} • {pagination.total || 0} registration(s)
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <ExportButton
                endpoint={`/api/brand/events/${eventId}/registrations/export`}
                filename={`event-registrations-${eventId}-${new Date().toISOString().split('T')[0]}`}
                filters={exportFilters}
                formats={['csv', 'xlsx']}
                label="Export"
              />
              <button
                onClick={() => router.push('/dashboards/brand-events')}
                className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-lightGrey5 dark:hover:bg-gray-800 transition-colors"
              >
                ← Back to Events
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <SearchInput
                value={search}
                onChange={handleSearchChange}
                placeholder="Search by name or email..."
              />
            </div>
            <div>
              <AdvancedDropdown
                options={statusOptions}
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                placeholder="Filter by status"
              />
            </div>
            <div>
              <AdvancedDropdown
                options={paymentStatusOptions}
                value={paymentStatus}
                onChange={(value) => {
                  setPaymentStatus(value);
                  setPage(1);
                }}
                placeholder="Filter by payment status"
              />
            </div>
          </div>
        </div>

        {/* Registrations Table */}
        {registrations.length === 0 ? (
          <NoData message="No registrations found for this event." />
        ) : (
          <>
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-borderColor dark:border-borderColor-dark">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Student</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Payment</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Registered At</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Slot</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => {
                    const getStatusBadge = (status) => {
                      const statusConfig = {
                        registered: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-400', label: 'Registered' },
                        cancelled: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-400', label: 'Cancelled' },
                        attended: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-400', label: 'Attended' },
                        no_show: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-400', label: 'No Show' },
                      };
                      const config = statusConfig[status] || statusConfig.registered;
                      return (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      );
                    };

                    const getPaymentBadge = (status) => {
                      const statusConfig = {
                        paid: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-400', label: 'Paid' },
                        pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-400', label: 'Pending' },
                        failed: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-400', label: 'Failed' },
                      };
                      const config = statusConfig[status] || statusConfig.pending;
                      return (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      );
                    };

                    return (
                      <tr key={reg.id} className="border-b border-borderColor dark:border-borderColor-dark hover:bg-lightGrey5 dark:hover:bg-gray-800 transition-colors">
                        <td className="py-3 px-4 text-sm text-contentColor dark:text-contentColor-dark">
                          {reg.user.name || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-contentColor dark:text-contentColor-dark">
                          {reg.user.email || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(reg.registrationStatus)}
                        </td>
                        <td className="py-3 px-4">
                          {getPaymentBadge(reg.paymentStatus)}
                        </td>
                        <td className="py-3 px-4 text-sm text-contentColor dark:text-contentColor-dark">
                          {formatDate(reg.registeredAt)}
                        </td>
                        <td className="py-3 px-4 text-sm text-contentColor dark:text-contentColor-dark">
                          {reg.slotNumber ? `Slot ${reg.slotNumber}` : reg.waitlistPosition ? `Waitlist #${reg.waitlistPosition}` : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {reg.registrationStatus !== 'attended' && (
                              <button
                                onClick={() => handleStatusUpdate(reg.id, 'attended')}
                                disabled={updateStatusMutation.isPending}
                                className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-50 rounded-md hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
                              >
                                Mark Attended
                              </button>
                            )}
                            {reg.registrationStatus !== 'cancelled' && (
                              <button
                                onClick={() => handleStatusUpdate(reg.id, 'cancelled')}
                                disabled={updateStatusMutation.isPending}
                                className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-50 rounded-md hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            )}
                            {reg.registrationStatus === 'cancelled' && (
                              <button
                                onClick={() => handleStatusUpdate(reg.id, 'registered')}
                                disabled={updateStatusMutation.isPending}
                                className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <AdvancedPagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
