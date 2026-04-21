"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import { format } from "date-fns";
import Image from "next/image";
import AdvancedPagination from "@/components/shared/courses/AdvancedPagination";
import CapacityIndicator from "@/components/shared/capacity/CapacityIndicator";
import ExportButtonSimple from "@/components/shared/export/ExportButtonSimple";
import { formatDateForCSV } from "@/lib/utils/export/csvExporter.js";

export default function MentorEventRegistrationsMain() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch event details and registrations
  const { data: registrationsData, isLoading } = useQuery({
    queryKey: ['event-registrations', eventId, page, statusFilter, paymentStatusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (paymentStatusFilter !== 'all') {
        params.append('payment_status', paymentStatusFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      const response = await apiClient.get(`/events/${eventId}/registrations?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch registrations');
      }
      return response.data;
    },
    enabled: isAuthenticated && !!eventId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // #region agent edit
  const event = registrationsData?.event && typeof registrationsData.event === 'object' ? registrationsData.event : null;
  const registrations = Array.isArray(registrationsData?.registrations) ? registrationsData.registrations : [];
  const pagination = (registrationsData?.pagination && typeof registrationsData.pagination === 'object') ? registrationsData.pagination : {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };
  // #endregion

  // Filter registrations by search term (client-side for better UX)
  // #region agent edit
  const filteredRegistrations = Array.isArray(registrations) ? registrations.filter((reg) => {
    if (!reg || typeof reg !== 'object') return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const user = reg.user && typeof reg.user === 'object' ? reg.user : {};
      return (
        (user.first_name && typeof user.first_name === 'string' && user.first_name.toLowerCase().includes(search)) ||
        (user.last_name && typeof user.last_name === 'string' && user.last_name.toLowerCase().includes(search)) ||
        (user.email && typeof user.email === 'string' && user.email.toLowerCase().includes(search))
      );
    }
    return true;
  }) : [];
  // #endregion

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading registrations...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Event not found</p>
        <button
          onClick={() => router.push('/dashboards/mentor-registered-events')}
          className="mt-4 px-4 py-2 bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90"
        >
          Back to Registered Events
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="flex-1">
              <button
                onClick={() => router.push('/dashboards/mentor-registered-events')}
                className="mb-3 text-sm text-primaryColor hover:underline flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                Back to Registered Events
              </button>
              <h1 className="h3 mb-2 fw-bold text-dark">{event.title}</h1>
              <p className="text-muted mb-0 small">
                {event.start_date && format(new Date(event.start_date), 'PPP p')}
                {event.location && ` • ${event.location}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Information */}
      {event.capacity && (
        <div className="p-6 mb-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
          <HeadingDashboard>Capacity Information</HeadingDashboard>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Total Capacity</p>
              <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">{event.capacity}</p>
            </div>
            <div>
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Current Registrations</p>
              <p className="text-2xl font-bold text-primaryColor">{event.current_registrations}</p>
            </div>
            <div>
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Available Slots</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {event.available_slots !== null ? event.available_slots : 'Unlimited'}
              </p>
            </div>
            <div>
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Utilization</p>
              <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
                {event.utilization_percentage !== null ? `${event.utilization_percentage}%` : 'N/A'}
              </p>
            </div>
          </div>
          {/* Capacity Indicator with Progress Bar */}
          <div className="mt-4">
            <CapacityIndicator
              capacity={event.capacity}
              current={event.current_registrations}
              label="Registration Status"
              showProgressBar={true}
              showBadge={true}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-6 mb-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
        <div className="flex items-center justify-between mb-4">
          <HeadingDashboard>Registrations</HeadingDashboard>
          {Array.isArray(filteredRegistrations) && filteredRegistrations.length > 0 && (
            <ExportButtonSimple
              data={filteredRegistrations
                .filter(reg => reg && typeof reg === 'object' && reg.user && typeof reg.user === 'object')
                .map(reg => ({
                  name: `${reg.user?.first_name || ''} ${reg.user?.last_name || ''}`.trim() || 'Unknown',
                  email: reg.user?.email || 'N/A',
                  registered_at: reg.registered_at ? formatDateForCSV(reg.registered_at) : 'N/A',
                  registration_status: reg.registration_status || 'N/A',
                  payment_status: reg.payment_status || 'N/A',
                }))}
              headers={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'registered_at', label: 'Registered At' },
                { key: 'registration_status', label: 'Registration Status' },
                { key: 'payment_status', label: 'Payment Status' },
              ]}
              filename={`event-registrations-${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`}
            />
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Registration Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="all">All Status</option>
              <option value="registered">Registered</option>
              <option value="cancelled">Cancelled</option>
              <option value="attended">Attended</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Payment Status
            </label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="all">All Payment Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Registrations Table */}
      {filteredRegistrations.length === 0 ? (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            {searchTerm ? 'No registrations found matching your search.' : 'No registrations found for this event.'}
          </p>
        </div>
      ) : (
        <>
          <div className="p-6 mb-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-borderColor dark:border-borderColor-dark">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-whiteColor">
                      User
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-whiteColor">
                      Registered At
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-whiteColor">
                      Registration Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-whiteColor">
                      Payment Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* #region agent edit */}
                  {Array.isArray(filteredRegistrations) && filteredRegistrations
                    .filter(reg => reg && typeof reg === 'object' && reg.id && reg.user && typeof reg.user === 'object')
                    .map((reg) => (
                    <tr
                      key={reg.id}
                      className="border-b border-borderColor dark:border-borderColor-dark hover:bg-lightGrey5 dark:hover:bg-whiteColor-dark transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* #region agent edit */}
                          {reg.user?.avatar_url ? (
                            <Image
                              src={reg.user.avatar_url}
                              alt={`${reg.user?.first_name || ''} ${reg.user?.last_name || ''}`.trim() || 'User'}
                              width={40}
                              height={40}
                              className="rounded-full"
                              unoptimized
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primaryColor/20 flex items-center justify-center text-primaryColor font-semibold">
                              {((reg.user?.first_name && reg.user.first_name[0]) || (reg.user?.email && reg.user.email[0]) || '?').toUpperCase()}
                            </div>
                          )}
                          {/* #endregion */}
                          <div>
                            <p className="font-semibold text-blackColor dark:text-whiteColor">
                              {/* #region agent edit */}
                              {`${reg.user?.first_name || ''} ${reg.user?.last_name || ''}`.trim() || 'Unknown User'}
                              {/* #endregion */}
                            </p>
                            <p className="text-sm text-contentColor dark:text-contentColor-dark">
                              {reg.user?.email || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-contentColor dark:text-contentColor-dark">
                        {/* #region agent edit */}
                        {reg.registered_at && !isNaN(new Date(reg.registered_at).getTime()) ? format(new Date(reg.registered_at), 'PPP p') : 'N/A'}
                        {/* #endregion */}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            reg.registration_status === 'registered'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : reg.registration_status === 'cancelled'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : reg.registration_status === 'attended'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}
                        >
                          {/* #region agent edit */}
                          {reg.registration_status || 'unknown'}
                          {/* #endregion */}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            reg.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : reg.payment_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {/* #region agent edit */}
                          {reg.payment_status || 'unknown'}
                          {/* #endregion */}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mb-6">
              <AdvancedPagination
                currentPage={typeof pagination.page === 'number' ? pagination.page : 1}
                totalPages={typeof pagination.totalPages === 'number' ? pagination.totalPages : 1}
                limit={typeof pagination.limit === 'number' ? pagination.limit : 20}
                totalItems={typeof pagination.total === 'number' ? pagination.total : 0}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
