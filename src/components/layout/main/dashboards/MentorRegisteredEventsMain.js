"use client";

import { useState, useMemo } from "react";
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

export default function MentorRegisteredEventsMain() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    capacity_status: null,
    registration_count: null,
    date_range: null,
  });
  const [sortBy, setSortBy] = useState("registrations_desc");

  // Fetch mentor's event registrations
  const { data: registrationsData, isLoading } = useQuery({
    queryKey: ['mentor-event-registrations', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const response = await apiClient.get(`/mentors/events/registrations?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch event registrations');
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

  // Group registrations by event
  const eventsMap = new Map();
  // #region agent edit
  if (Array.isArray(registrations)) {
    registrations
      .filter(reg => reg && typeof reg === 'object' && reg.event && typeof reg.event === 'object' && reg.event.id)
      .forEach((reg) => {
        if (!eventsMap.has(reg.event.id)) {
          eventsMap.set(reg.event.id, {
            event: reg.event,
            registrations: [],
            registrationCount: 0,
          });
        }
        eventsMap.get(reg.event.id).registrations.push(reg);
        eventsMap.get(reg.event.id).registrationCount++;
      });
  }
  // #endregion

  const events = Array.from(eventsMap.values());

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    // #region agent edit
    let filtered = Array.isArray(events) ? [...events] : [];
    // #endregion

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item && typeof item === 'object' && item.event && typeof item.event === 'object' &&
          (item.event.title && typeof item.event.title === 'string' && item.event.title.toLowerCase().includes(search) ||
          item.event.location && typeof item.event.location === 'string' && item.event.location.toLowerCase().includes(search) ||
          item.event.start_date && typeof item.event.start_date === 'string' && item.event.start_date.toLowerCase().includes(search))
      );
    }

    // Apply capacity status filter
    if (filters.capacity_status) {
      filtered = filtered.filter((item) => {
        const capacityInfo = getCapacityInfo(item.event, item.registrationCount);
        return capacityInfo.status === filters.capacity_status;
      });
    }

    // Apply registration count range filter
    if (filters.registration_count) {
      if (filters.registration_count.min !== null && filters.registration_count.min !== undefined) {
        filtered = filtered.filter(
          (item) => item.registrationCount >= filters.registration_count.min
        );
      }
      if (filters.registration_count.max !== null && filters.registration_count.max !== undefined) {
        filtered = filtered.filter(
          (item) => item.registrationCount <= filters.registration_count.max
        );
      }
    }

    // Apply date range filter
    if (filters.date_range?.from) {
      const fromDate = new Date(filters.date_range.from);
      if (!isNaN(fromDate.getTime())) {
        filtered = filtered.filter((item) => {
          if (!item || typeof item !== 'object' || !item.event || typeof item.event !== 'object' || !item.event.start_date) return false;
          const eventDate = new Date(item.event.start_date);
          if (isNaN(eventDate.getTime())) return false;
          return eventDate >= fromDate;
        });
      }
    }
    if (filters.date_range?.to) {
      const toDate = new Date(filters.date_range.to);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter((item) => {
          if (!item || typeof item !== 'object' || !item.event || typeof item.event !== 'object' || !item.event.start_date) return false;
          const eventDate = new Date(item.event.start_date);
          if (isNaN(eventDate.getTime())) return false;
          return eventDate <= toDate;
        });
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      // #region agent edit
      if (!a || typeof a !== 'object' || !b || typeof b !== 'object' || !a.event || typeof a.event !== 'object' || !b.event || typeof b.event !== 'object') return 0;
      // #endregion
      switch (sortBy) {
        case "title_asc":
          return ((a.event.title && typeof a.event.title === 'string' ? a.event.title : "") || "").localeCompare((b.event.title && typeof b.event.title === 'string' ? b.event.title : "") || "");
        case "title_desc":
          return ((b.event.title && typeof b.event.title === 'string' ? b.event.title : "") || "").localeCompare((a.event.title && typeof a.event.title === 'string' ? a.event.title : "") || "");
        case "date_asc":
          // #region agent edit
          if (!a.event.start_date || !b.event.start_date) return 0;
          const dateAAsc = new Date(a.event.start_date);
          const dateBAsc = new Date(b.event.start_date);
          if (isNaN(dateAAsc.getTime()) || isNaN(dateBAsc.getTime())) return 0;
          return dateAAsc - dateBAsc;
          // #endregion
        case "date_desc":
          // #region agent edit
          if (!a.event.start_date || !b.event.start_date) return 0;
          const dateADesc = new Date(a.event.start_date);
          const dateBDesc = new Date(b.event.start_date);
          if (isNaN(dateADesc.getTime()) || isNaN(dateBDesc.getTime())) return 0;
          return dateBDesc - dateADesc;
          // #endregion
        case "registrations_asc":
          return a.registrationCount - b.registrationCount;
        case "registrations_desc":
          return b.registrationCount - a.registrationCount;
        case "capacity_asc":
          const aCap = a.event.capacity ? parseInt(a.event.capacity) : 0;
          const bCap = b.event.capacity ? parseInt(b.event.capacity) : 0;
          return aCap - bCap;
        case "capacity_desc":
          const aCap2 = a.event.capacity ? parseInt(a.event.capacity) : 0;
          const bCap2 = b.event.capacity ? parseInt(b.event.capacity) : 0;
          return bCap2 - aCap2;
        default:
          return b.registrationCount - a.registrationCount;
      }
    });

    return filtered;
  }, [events, searchTerm, filters, sortBy]);

  // Get active filter chips
  const activeFilters = useMemo(() => {
    const chips = [];
    if (filters.capacity_status) {
      chips.push({ key: "capacity_status", label: "Capacity", value: filters.capacity_status });
    }
    if (filters.registration_count && (filters.registration_count.min !== null || filters.registration_count.max !== null)) {
      const range = [
        filters.registration_count.min !== null && filters.registration_count.min !== undefined ? filters.registration_count.min : "",
        filters.registration_count.max !== null && filters.registration_count.max !== undefined ? filters.registration_count.max : "",
      ]
        .filter((v) => v !== "")
        .join(" - ");
      if (range) {
        chips.push({ key: "registration_count", label: "Registrations", value: range });
      }
    }
    if (filters.date_range?.from || filters.date_range?.to) {
      const dateRange = [
        filters.date_range?.from ? format(new Date(filters.date_range.from), "MMM dd, yyyy") : "",
        filters.date_range?.to ? format(new Date(filters.date_range.to), "MMM dd, yyyy") : "",
      ]
        .filter(Boolean)
        .join(" - ");
      chips.push({ key: "date_range", label: "Date Range", value: dateRange });
    }
    return chips;
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleRemoveFilter = (key) => {
    if (key === "registration_count") {
      setFilters((prev) => ({
        ...prev,
        registration_count_min: null,
        registration_count_max: null,
      }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: null }));
    }
  };

  const handleClearFilters = () => {
    setFilters({
      capacity_status: null,
      registration_count: null,
      date_range: null,
    });
  };

  // Filter configuration
  const filterConfig = [
    {
      key: "capacity_status",
      label: "Capacity Status",
      type: "select",
      options: [
        { value: "available", label: "Available (< 80%)" },
        { value: "warning", label: "Warning (80-89%)" },
        { value: "critical", label: "Critical (90-99%)" },
        { value: "full", label: "Full (100%)" },
      ],
    },
    {
      key: "registration_count",
      label: "Registration Count",
      type: "range",
    },
    {
      key: "date_range",
      label: "Date Range",
      type: "daterange",
    },
  ];

  // Calculate capacity utilization (for filtering/sorting)
  const getCapacityInfo = (event, registrationCount) => {
    const capacity = event.capacity ? parseInt(event.capacity) : null;
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
        <p className="text-contentColor dark:text-contentColor-dark">Loading registered events...</p>
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
              <h1 className="h3 mb-2 fw-bold text-dark">Registered Events</h1>
              <p className="text-muted mb-0 small">
                View events with registration counts and capacity utilization
              </p>
            </div>
            {filteredAndSortedEvents.length > 0 && (
              <ExportButtonSimple
                data={filteredEvents.map(item => ({
                  title: item.event.title,
                  start_date: item.event.start_date ? formatDateForCSV(item.event.start_date) : '',
                  location: item.event.location || '',
                  capacity: item.event.capacity || '',
                  registrations: item.registrationCount,
                  available_slots: item.event.capacity ? item.event.capacity - item.registrationCount : '',
                  utilization_percentage: item.event.capacity 
                    ? Math.round((item.registrationCount / item.event.capacity) * 100) 
                    : '',
                }))}
                headers={[
                  { key: 'title', label: 'Event Title' },
                  { key: 'start_date', label: 'Start Date' },
                  { key: 'location', label: 'Location' },
                  { key: 'capacity', label: 'Capacity' },
                  { key: 'registrations', label: 'Registrations' },
                  { key: 'available_slots', label: 'Available Slots' },
                  { key: 'utilization_percentage', label: 'Utilization %' },
                ]}
                filename={`registered-events-${new Date().toISOString().split('T')[0]}`}
                className="ml-auto"
              />
            )}
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
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
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Events with Registrations</p>
            <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
              {/* #region agent edit */}
              {typeof statistics.events_with_registrations === 'number' ? statistics.events_with_registrations : 0}
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
            Search Events
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

      {/* Events List */}
      {filteredAndSortedEvents.length === 0 ? (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            {searchTerm ? 'No events found matching your search.' : 'No registered events found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* #region agent edit */}
          {Array.isArray(filteredAndSortedEvents) && filteredAndSortedEvents
            .filter(item => item && typeof item === 'object' && item.event && typeof item.event === 'object' && item.event.id)
            .map((item) => {
            const capacityInfo = getCapacityInfo(item.event, item.registrationCount);
            return (
              <div
                key={item.event.id}
                className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md overflow-hidden border-2 border-borderColor dark:border-borderColor-dark hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-blackColor dark:text-whiteColor mb-2">
                        {item.event.title || 'Untitled Event'}
                      </h3>
                      {/* #region agent edit */}
                      {item.event.start_date && !isNaN(new Date(item.event.start_date).getTime()) && (
                        <p className="text-sm text-contentColor dark:text-contentColor-dark">
                          📅 {format(new Date(item.event.start_date), 'PPP p')}
                        </p>
                      )}
                      {/* #endregion */}
                      {/* #endregion */}
                      {item.event.location && (
                        <p className="text-sm text-contentColor dark:text-contentColor-dark">
                          📍 {item.event.location}
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
                      href={`/dashboards/mentor-event-registrations/${item.event.id}`}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-whiteColor bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors text-center"
                    >
                      View Registrations ({item.registrationCount})
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
