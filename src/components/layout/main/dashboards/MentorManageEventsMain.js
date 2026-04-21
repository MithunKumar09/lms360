"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import Image from "next/image";
import { format } from "date-fns";
import CapacityIndicator from "@/components/shared/capacity/CapacityIndicator";
import AdvancedFilterPanel from "@/components/shared/filters/AdvancedFilterPanel";
import FilterChips from "@/components/shared/filters/FilterChips";
import AdvancedSearch from "@/components/shared/search/AdvancedSearch";
import BulkActionBar from "@/components/shared/bulk-actions/BulkActionBar";
import BulkActionModal from "@/components/shared/bulk-actions/BulkActionModal";
import ExportButtonSimple from "@/components/shared/export/ExportButtonSimple";
import { formatDateForCSV } from "@/lib/utils/export/csvExporter.js";

export default function MentorManageEventsMain() {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: null,
    mode: null,
    is_free: null,
    capacity_status: null,
    date_range: null,
  });
  const [sortBy, setSortBy] = useState("date_desc");

  // Fetch mentor's events
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['mentor-events', userId],
    queryFn: async () => {
      const response = await apiClient.get(`/events?created_by=${userId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch events');
      }
      return response.data;
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const events = eventsData?.events || [];

  // Fetch registration counts for all events
  const { data: registrationsData } = useQuery({
    queryKey: ['mentor-event-registrations-summary', userId],
    queryFn: async () => {
      const response = await apiClient.get('/mentors/events/registrations?limit=1000');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch registrations');
      }
      return response.data;
    },
    enabled: isAuthenticated && !!userId && events.length > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Create a map of event_id -> registration count
  const registrationCounts = useMemo(() => {
    const counts = new Map();
    // #region agent edit
    if (Array.isArray(registrationsData?.registrations)) {
      registrationsData.registrations
        .filter(reg => reg && typeof reg === 'object' && reg.event_id)
        .forEach((reg) => {
          const eventId = reg.event_id;
          const current = counts.get(eventId) || 0;
          if (reg.registration_status === 'registered') {
            counts.set(eventId, current + 1);
          }
        });
    }
    // #endregion
    return counts;
  }, [registrationsData]);

  // Delete mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId) => {
      const response = await apiClient.delete(`/events/${eventId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete event');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-events'] });
      createAlert('success', 'Event deleted successfully!');
    },
    onError: (error) => {
      console.error('Delete event error:', error);
      createAlert('error', error.message || 'Failed to delete event');
    },
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ operation, eventIds, data }) => {
      const response = await apiClient.post('/events/bulk', {
        operation,
        event_ids: eventIds,
        data,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to perform bulk operation');
      }
      return response;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mentor-events'] });
      setSelectedEvents(new Set());
      setBulkModal({ isOpen: false, action: null, data: null });
      const { successful, failed } = response.data.results;
      if (failed === 0) {
        createAlert('success', `Successfully ${variables.operation} ${successful} event(s)!`);
      } else {
        createAlert('warning', `${successful} succeeded, ${failed} failed`);
      }
    },
    onError: (error) => {
      console.error('Bulk operation error:', error);
      createAlert('error', error.message || 'Failed to perform bulk operation');
    },
  });

  // Selection handlers
  const handleSelectEvent = (eventId) => {
    setSelectedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedEvents(new Set(filteredAndSortedEvents.map((e) => e.id)));
  };

  const handleDeselectAll = () => {
    setSelectedEvents(new Set());
  };

  // Bulk action handlers
  const handleBulkDelete = () => {
    setBulkModal({
      isOpen: true,
      action: 'delete',
      data: {
        itemCount: selectedEvents.size,
        itemNames: filteredAndSortedEvents
          .filter((e) => selectedEvents.has(e.id))
          .slice(0, 5)
          .map((e) => e.title),
      },
    });
  };

  const handleBulkStatusUpdate = () => {
    setBulkModal({
      isOpen: true,
      action: 'update_status',
      data: {
        itemCount: selectedEvents.size,
        itemNames: filteredAndSortedEvents
          .filter((e) => selectedEvents.has(e.id))
          .slice(0, 5)
          .map((e) => e.title),
      },
    });
  };

  const handleBulkExport = () => {
    const selectedEventsData = filteredAndSortedEvents.filter((e) => selectedEvents.has(e.id));
    // Export will be handled by ExportButtonSimple component
  };

  const confirmBulkAction = (status = null) => {
    const eventIds = Array.from(selectedEvents);
    if (bulkModal.action === 'delete') {
      bulkOperationMutation.mutate({
        operation: 'delete',
        eventIds,
        data: null,
      });
    } else if (bulkModal.action === 'update_status' && status) {
      bulkOperationMutation.mutate({
        operation: 'update_status',
        eventIds,
        data: { status },
      });
    }
  };

  // Categorize events
  const categorizedEvents = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const current = [];
    const past = [];

    // #region agent edit
    if (Array.isArray(events)) {
      events
        .filter(event => event && typeof event === 'object' && event.id && event.start_date && event.end_date)
        .forEach((event) => {
          const startDate = new Date(event.start_date);
          const endDate = new Date(event.end_date);

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return; // Skip invalid dates
          }

          if (endDate < now) {
            past.push(event);
          } else if (startDate <= now && endDate >= now) {
            current.push(event);
          } else {
            upcoming.push(event);
          }
        });
    }
    // #endregion

    return { upcoming, current, past };
  }, [events]);

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = [...events];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event && typeof event === 'object' &&
          (event.title && typeof event.title === 'string' && event.title.toLowerCase().includes(search) ||
          event.description && typeof event.description === 'string' && event.description.toLowerCase().includes(search) ||
          event.location && typeof event.location === 'string' && event.location.toLowerCase().includes(search))
      );
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter((event) => event.status === filters.status);
    }

    // Apply mode filter
    if (filters.mode) {
      filtered = filtered.filter((event) => event.mode === filters.mode);
    }

    // Apply free/paid filter
    if (filters.is_free !== null) {
      filtered = filtered.filter((event) => event.is_free === filters.is_free);
    }

    // Apply capacity status filter
    if (filters.capacity_status) {
      filtered = filtered.filter((event) => {
        if (!event.capacity) return false;
        const current = registrationCounts.get(event.id) || 0;
        const percentage = Math.round((current / parseInt(event.capacity)) * 100);
        switch (filters.capacity_status) {
          case "available":
            return percentage < 80;
          case "warning":
            return percentage >= 80 && percentage < 90;
          case "critical":
            return percentage >= 90 && percentage < 100;
          case "full":
            return percentage >= 100;
          default:
            return true;
        }
      });
    }

    // Apply date range filter
    if (filters.date_range?.from) {
      const fromDate = new Date(filters.date_range.from);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.start_date);
        return eventDate >= fromDate;
      });
    }
    if (filters.date_range?.to) {
      const toDate = new Date(filters.date_range.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.start_date);
        return eventDate <= toDate;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      // #region agent edit
      if (!a || typeof a !== 'object' || !b || typeof b !== 'object') return 0;
      // #endregion
      switch (sortBy) {
        case "title_asc":
          return ((a.title && typeof a.title === 'string' ? a.title : "") || "").localeCompare((b.title && typeof b.title === 'string' ? b.title : "") || "");
        case "title_desc":
          return ((b.title && typeof b.title === 'string' ? b.title : "") || "").localeCompare((a.title && typeof a.title === 'string' ? a.title : "") || "");
        case "date_asc":
          // #region agent edit
          if (!a.start_date || !b.start_date) return 0;
          const dateA = new Date(a.start_date);
          const dateB = new Date(b.start_date);
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
          return dateA - dateB;
          // #endregion
        case "date_desc":
          // #region agent edit
          if (!a.start_date || !b.start_date) return 0;
          const dateADesc = new Date(a.start_date);
          const dateBDesc = new Date(b.start_date);
          if (isNaN(dateADesc.getTime()) || isNaN(dateBDesc.getTime())) return 0;
          return dateBDesc - dateADesc;
          // #endregion
        case "registrations_asc":
          return (registrationCounts.get(a.id) || 0) - (registrationCounts.get(b.id) || 0);
        case "registrations_desc":
          return (registrationCounts.get(b.id) || 0) - (registrationCounts.get(a.id) || 0);
        default:
          // #region agent edit
          if (!a.start_date || !b.start_date) return 0;
          const dateADefault = new Date(a.start_date);
          const dateBDefault = new Date(b.start_date);
          if (isNaN(dateADefault.getTime()) || isNaN(dateBDefault.getTime())) return 0;
          return dateBDefault - dateADefault;
          // #endregion
      }
    });

    return filtered;
  }, [events, searchTerm, filters, sortBy, registrationCounts]);

  // Get active filter chips
  const activeFilters = useMemo(() => {
    const chips = [];
    if (filters.status) {
      chips.push({ key: "status", label: "Status", value: filters.status });
    }
    if (filters.mode) {
      chips.push({ key: "mode", label: "Mode", value: filters.mode });
    }
    if (filters.is_free !== null) {
      chips.push({ key: "is_free", label: "Price", value: filters.is_free ? "Free" : "Paid" });
    }
    if (filters.capacity_status) {
      chips.push({ key: "capacity_status", label: "Capacity", value: filters.capacity_status });
    }
    if (filters.date_range?.from || filters.date_range?.to) {
      const dateRange = [
        filters.date_range.from ? format(new Date(filters.date_range.from), "MMM dd, yyyy") : "",
        filters.date_range.to ? format(new Date(filters.date_range.to), "MMM dd, yyyy") : "",
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
    setFilters((prev) => ({ ...prev, [key]: null }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: null,
      mode: null,
      is_free: null,
      capacity_status: null,
      date_range: null,
    });
  };

  // Filter configuration for AdvancedFilterPanel
  const filterConfig = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "published", label: "Published" },
        { value: "draft", label: "Draft" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [
        { value: "online", label: "Online" },
        { value: "offline", label: "Offline" },
        { value: "hybrid", label: "Hybrid" },
      ],
    },
    {
      key: "is_free",
      label: "Price",
      type: "select",
      options: [
        { value: true, label: "Free" },
        { value: false, label: "Paid" },
      ],
    },
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
      key: "date_range",
      label: "Date Range",
      type: "daterange",
    },
  ];

  const handleDelete = async (eventId, eventTitle) => {
    if (!confirm(`Are you sure you want to delete "${eventTitle}"?`)) {
      return;
    }
    await deleteEventMutation.mutateAsync(eventId);
  };

  const handleDuplicate = (event) => {
    router.push(`/dashboards/mentor-add-event?duplicate=${event.id}`);
  };

  const EventCard = ({ event }) => {
    const isSelected = selectedEvents.has(event.id);
    return (
      <div className={`bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md overflow-hidden border-2 ${isSelected ? 'border-primaryColor' : 'border-borderColor dark:border-borderColor-dark'} hover:shadow-lg transition-shadow relative`}>
        {/* Selection Checkbox */}
        <div className="absolute top-2 right-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleSelectEvent(event.id)}
            className="w-5 h-5 text-primaryColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor cursor-pointer"
          />
        </div>
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
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ml-2 ${
              event.status === 'published'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : event.status === 'draft'
                ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                : event.status === 'cancelled'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            }`}
          >
            {event.status}
          </span>
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
        
        {/* Capacity Indicator */}
        {event.capacity && (
          <div className="mb-3 p-3 bg-lightGrey5 dark:bg-whiteColor-dark rounded-md">
            <CapacityIndicator
              capacity={parseInt(event.capacity)}
              current={registrationCounts.get(event.id) || 0}
              label="Registrations"
              showProgressBar={true}
              showBadge={true}
            />
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => router.push(`/dashboards/mentor-edit-event/${event.id}`)}
            className="px-3 py-1 text-xs font-semibold text-primaryColor bg-primaryColor/10 rounded-md hover:bg-primaryColor/20 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => router.push(`/events/${event.id}`)}
            className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
          >
            View
          </button>
          <button
            onClick={() => handleDuplicate(event)}
            className="px-3 py-1 text-xs font-semibold text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30 transition-colors"
          >
            Duplicate
          </button>
          <button
            onClick={() => handleDelete(event.id, event.title)}
            disabled={deleteEventMutation.isPending}
            className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-50 rounded-md hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
    );
  };

  const EventSection = ({ title, events: sectionEvents, emptyMessage }) => {
    // Events are already filtered and sorted in filteredAndSortedEvents
    // This section is for categorization only
    const now = new Date();
    const categorized = sectionEvents.filter((event) => {
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      if (title === "Current Events") {
        return startDate <= now && endDate >= now;
      } else if (title === "Upcoming Events") {
        return startDate > now;
      } else if (title === "Past Events") {
        return endDate < now;
      }
      return true;
    });

    if (categorized.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-blackColor dark:text-whiteColor mb-4">
          {title} ({categorized.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorized.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading events...</p>
      </div>
    );
  }


  return (
    <div className="w-full">
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Manage Events</h1>
              <p className="text-muted mb-0 small">
                View and manage your events
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboards/mentor-add-event')}
              className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors"
            >
              + Add Event
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <AdvancedSearch
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search events by title, description, or location..."
              debounceDelay={300}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="title_asc">Title (A-Z)</option>
            <option value="title_desc">Title (Z-A)</option>
            <option value="registrations_desc">Most Registrations</option>
            <option value="registrations_asc">Least Registrations</option>
          </select>
        </div>

        {/* Advanced Filter Panel */}
        <AdvancedFilterPanel
          isOpen={isFilterOpen}
          onToggle={() => setIsFilterOpen(!isFilterOpen)}
          filters={filterConfig}
          values={filters}
          onChange={handleFilterChange}
          onApply={() => setIsFilterOpen(false)}
          onClear={handleClearFilters}
        />

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <FilterChips
            filters={activeFilters}
            onRemove={handleRemoveFilter}
            onClearAll={handleClearFilters}
          />
        )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedEvents.size}
        totalCount={filteredAndSortedEvents.length}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        actions={[
          {
            label: 'Delete',
            onClick: handleBulkDelete,
            variant: 'danger',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            ),
          },
          {
            label: 'Update Status',
            onClick: handleBulkStatusUpdate,
            variant: 'primary',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ),
          },
          {
            label: 'Export',
            onClick: handleBulkExport,
            variant: 'outline',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            ),
          },
        ]}
        className="mb-4"
      />

      {/* Bulk Action Modal */}
      {bulkModal.action === 'delete' && (
        <BulkActionModal
          isOpen={bulkModal.isOpen}
          onClose={() => setBulkModal({ isOpen: false, action: null, data: null })}
          onConfirm={() => confirmBulkAction()}
          action="delete"
          itemCount={bulkModal.data?.itemCount || 0}
          itemNames={bulkModal.data?.itemNames || []}
          variant="danger"
          isLoading={bulkOperationMutation.isPending}
        />
      )}

      {bulkModal.action === 'update_status' && (
        <StatusUpdateModal
          isOpen={bulkModal.isOpen}
          onClose={() => setBulkModal({ isOpen: false, action: null, data: null })}
          onConfirm={confirmBulkAction}
          itemCount={bulkModal.data?.itemCount || 0}
          itemNames={bulkModal.data?.itemNames || []}
          isLoading={bulkOperationMutation.isPending}
        />
      )}

      {filteredAndSortedEvents.length === 0 ? (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            {searchTerm || activeFilters.length > 0
              ? "No events found matching your filters."
              : "No events found. Create your first event!"}
          </p>
        </div>
      ) : (
        <>
          <EventSection
            title="Current Events"
            events={filteredAndSortedEvents}
            emptyMessage="No current events"
          />
          <EventSection
            title="Upcoming Events"
            events={filteredAndSortedEvents}
            emptyMessage="No upcoming events"
          />
          <EventSection
            title="Past Events"
            events={filteredAndSortedEvents}
            emptyMessage="No past events"
          />
        </>
      )}
    </div>
  );
}

// Status Update Modal Component
function StatusUpdateModal({ isOpen, onClose, onConfirm, itemCount, itemNames, isLoading }) {
  const [status, setStatus] = useState('published');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-xl max-w-md w-full mx-4 border-2 border-borderColor dark:border-borderColor-dark">
        <div className="p-6">
          <h3 className="text-xl font-bold text-blackColor dark:text-whiteColor mb-4">
            Update Status for {itemCount} {itemCount === 1 ? 'Event' : 'Events'}
          </h3>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              New Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {itemNames.length > 0 && itemNames.length <= 5 && (
            <div className="mb-4 p-3 bg-lightGrey5 dark:bg-whiteColor-dark rounded-md max-h-32 overflow-y-auto">
              <p className="text-xs font-semibold text-contentColor dark:text-contentColor-dark mb-2">
                Affected Events:
              </p>
              <ul className="text-sm text-contentColor dark:text-contentColor-dark space-y-1">
                {itemNames.map((name, index) => (
                  <li key={index}>• {name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-lightGrey5 dark:bg-whiteColor-dark rounded-md hover:bg-opacity-80 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(status)}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold text-whiteColor bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

