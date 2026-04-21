"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import { format } from "date-fns";
import Link from "next/link";
import CapacityIndicator from "@/components/shared/capacity/CapacityIndicator";
import ExportButtonSimple from "@/components/shared/export/ExportButtonSimple";
import { formatDateForCSV } from "@/lib/utils/export/csvExporter.js";

export default function MentorRegisteredWorkshopsMain() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch mentor's workshop registrations
  const { data: registrationsData, isLoading } = useQuery({
    queryKey: ['mentor-workshop-registrations', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const response = await apiClient.get(`/mentors/workshops/registrations?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch workshop registrations');
      }
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // #region agent edit
  const registrations = Array.isArray(registrationsData?.registrations) ? registrationsData.registrations : [];
  const statistics = (registrationsData?.statistics && typeof registrationsData.statistics === 'object') ? registrationsData.statistics : {};
  // #endregion

  // Group registrations by workshop
  const workshopsMap = new Map();
  // #region agent edit
  if (Array.isArray(registrations)) {
    registrations
      .filter(reg => reg && typeof reg === 'object' && reg.workshop && typeof reg.workshop === 'object' && reg.workshop.id)
      .forEach((reg) => {
        if (!workshopsMap.has(reg.workshop.id)) {
          workshopsMap.set(reg.workshop.id, {
            workshop: reg.workshop,
            registrations: [],
            registrationCount: 0,
          });
        }
        workshopsMap.get(reg.workshop.id).registrations.push(reg);
        workshopsMap.get(reg.workshop.id).registrationCount++;
      });
  }
  // #endregion

  const workshops = Array.from(workshopsMap.values());

  // Filter workshops
  // #region agent edit
  const filteredWorkshops = Array.isArray(workshops) ? workshops.filter((item) => {
    if (!item || typeof item !== 'object' || !item.workshop || typeof item.workshop !== 'object') return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        (item.workshop.title && typeof item.workshop.title === 'string' && item.workshop.title.toLowerCase().includes(search)) ||
        (item.workshop.start_date && typeof item.workshop.start_date === 'string' && item.workshop.start_date.toLowerCase().includes(search))
      );
    }
    return true;
  }) : [];
  // #endregion

  // Calculate capacity utilization (for filtering/sorting)
  const getCapacityInfo = (workshop, registrationCount) => {
    const capacity = workshop.capacity ? parseInt(workshop.capacity) : null;
    const current = registrationCount;
    const percentage = capacity ? Math.round((current / capacity) * 100) : null;
    
    let status = 'available';
    if (percentage !== null) {
      if (percentage >= 100) status = 'full';
      else if (percentage >= 90) status = 'critical';
      else if (percentage >= 80) status = 'warning';
    }

    return { capacity, current, percentage, status };
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading registered workshops...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Registered Workshops</h1>
              <p className="text-muted mb-0 small">
                View workshops with registration counts and capacity utilization
              </p>
            </div>
            {/* #region agent edit */}
            {Array.isArray(filteredWorkshops) && filteredWorkshops.length > 0 && (
              <ExportButtonSimple
                data={filteredWorkshops
                  .filter(item => item && typeof item === 'object' && item.workshop && typeof item.workshop === 'object')
                  .map(item => ({
                    title: item.workshop?.title || 'Untitled Workshop',
                    start_date: item.workshop?.start_date ? formatDateForCSV(item.workshop.start_date) : '',
                    location: item.workshop?.location || '',
                    capacity: typeof item.workshop?.capacity === 'number' ? item.workshop.capacity : '',
                    registrations: typeof item.registrationCount === 'number' ? item.registrationCount : 0,
                    available_slots: typeof item.workshop?.capacity === 'number' && typeof item.registrationCount === 'number' ? item.workshop.capacity - item.registrationCount : '',
                    utilization_percentage: typeof item.workshop?.capacity === 'number' && item.workshop.capacity > 0 && typeof item.registrationCount === 'number'
                      ? Math.round((item.registrationCount / item.workshop.capacity) * 100) 
                      : '',
                  }))}
                headers={[
                  { key: 'title', label: 'Workshop Title' },
                  { key: 'start_date', label: 'Start Date' },
                  { key: 'location', label: 'Location' },
                  { key: 'capacity', label: 'Capacity' },
                  { key: 'registrations', label: 'Registrations' },
                  { key: 'available_slots', label: 'Available Slots' },
                  { key: 'utilization_percentage', label: 'Utilization %' },
                ]}
                filename={`registered-workshops-${new Date().toISOString().split('T')[0]}`}
                className="ml-auto"
              />
            )}
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      {/* #region agent edit */}
      {statistics && typeof statistics === 'object' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Total Registrations</p>
            <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
              {/* #region agent edit */}
              {typeof statistics.total_registrations === 'number' ? statistics.total_registrations : 0}
              {/* #endregion */}
            </p>
          </div>
          <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Workshops with Registrations</p>
            <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
              {/* #region agent edit */}
              {typeof statistics.workshops_with_registrations === 'number' ? statistics.workshops_with_registrations : 0}
              {/* #endregion */}
            </p>
          </div>
          <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Active Registrations</p>
            <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
              {/* #region agent edit */}
              {(statistics.by_status && typeof statistics.by_status === 'object' && typeof statistics.by_status.registered === 'number') ? statistics.by_status.registered : 0}
              {/* #endregion */}
            </p>
          </div>
          <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Paid Registrations</p>
            <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
              {/* #region agent edit */}
              {(statistics.by_payment && typeof statistics.by_payment === 'object' && typeof statistics.by_payment.paid === 'number') ? statistics.by_payment.paid : 0}
              {/* #endregion */}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Search Workshops
          </label>
          <input
            type="text"
            placeholder="Search by title or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Filter by Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          >
            <option value="all">All Status</option>
            <option value="registered">Registered</option>
            <option value="cancelled">Cancelled</option>
            <option value="attended">Attended</option>
          </select>
        </div>
      </div>

      {/* Workshops List */}
      {filteredWorkshops.length === 0 ? (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            {searchTerm ? 'No workshops found matching your search.' : 'No registered workshops found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredWorkshops.map((item) => {
            const capacityInfo = getCapacityInfo(item.workshop, item.registrationCount);
            return (
              <div
                key={item.workshop.id}
                className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md overflow-hidden border-2 border-borderColor dark:border-borderColor-dark hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-blackColor dark:text-whiteColor mb-2">
                        {item.workshop.title}
                      </h3>
                      {item.workshop.start_date && (
                        <p className="text-sm text-contentColor dark:text-contentColor-dark">
                          📅 {format(new Date(item.workshop.start_date), 'PPP p')}
                        </p>
                      )}
                      {item.workshop.location && (
                        <p className="text-sm text-contentColor dark:text-contentColor-dark">
                          📍 {item.workshop.location}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Capacity Information */}
                  <div className="mb-4 p-3 bg-lightGrey5 dark:bg-whiteColor-dark rounded-md">
                    <CapacityIndicator
                      capacity={capacityInfo.capacity}
                      current={capacityInfo.current}
                      label="Registrations"
                      showProgressBar={true}
                      showBadge={true}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboards/mentor-workshop-registrations/${item.workshop.id}`}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-whiteColor bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors text-center"
                    >
                      {/* #region agent edit */}
                      View Registrations ({typeof item.registrationCount === 'number' ? item.registrationCount : 0})
                      {/* #endregion */}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
