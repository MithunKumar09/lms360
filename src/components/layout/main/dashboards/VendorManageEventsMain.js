"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import Image from "next/image";
import { format } from "date-fns";

export default function VendorManageEventsMain() {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [searchTerm, setSearchTerm] = useState("");

  // Fetch vendor's events
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['vendor-events', userId],
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

  const events = Array.isArray(eventsData?.events) ? eventsData.events : [];

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
      queryClient.invalidateQueries({ queryKey: ['vendor-events'] });
      createAlert('success', 'Event deleted successfully!');
    },
    onError: (error) => {
      console.error('Delete event error:', error);
      createAlert('error', error.message || 'Failed to delete event');
    },
  });

  // Categorize events
  const categorizedEvents = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const current = [];
    const past = [];

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

    return { upcoming, current, past };
  }, [events]);

  // Filter by search term
  const filterEvents = (eventList) => {
    if (!Array.isArray(eventList)) return [];
    if (!searchTerm) return eventList;
    const search = searchTerm.toLowerCase();
    return eventList.filter(
      (event) =>
        event && typeof event === 'object' &&
        (event.title?.toLowerCase().includes(search) ||
        event.description?.toLowerCase().includes(search))
    );
  };

  const handleDelete = async (eventId, eventTitle) => {
    if (!confirm(`Are you sure you want to delete "${eventTitle}"?`)) {
      return;
    }
    await deleteEventMutation.mutateAsync(eventId);
  };

  const handleDuplicate = (event) => {
    router.push(`/dashboards/vendor-add-event?duplicate=${event.id}`);
  };

  const EventCard = ({ event }) => {
    if (!event || typeof event !== 'object' || !event.id) {
      return null;
    }
    
    return (
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md overflow-hidden border-2 border-borderColor dark:border-borderColor-dark hover:shadow-lg transition-shadow">
        {event.banner_url && (
          <div className="relative w-full h-48 overflow-hidden">
            <Image
              src={event.banner_url}
              alt={event.title || 'Event'}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor flex-1">
              {event.title || 'Untitled Event'}
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
              {event.status || 'unknown'}
            </span>
          </div>
          {event.description && (
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3 line-clamp-2">
              {event.description}
            </p>
          )}
          <div className="space-y-1 text-xs text-contentColor dark:text-contentColor-dark mb-3">
            {event.start_date && (
              <p>
                <strong>Start:</strong> {format(new Date(event.start_date), 'PPP p')}
              </p>
            )}
            {event.end_date && (
              <p>
                <strong>End:</strong> {format(new Date(event.end_date), 'PPP p')}
              </p>
            )}
            {event.mode && (
              <p>
                <strong>Mode:</strong> {event.mode}
              </p>
            )}
            {event.is_free ? (
              <p className="text-green-600 dark:text-green-400 font-semibold">Free</p>
            ) : (
              <p>
                <strong>Price:</strong> ₹{parseFloat(typeof event.price === 'number' ? event.price : 0).toLocaleString('en-IN')}
              </p>
            )}
            {typeof event.capacity === 'number' && (
              <p>
                <strong>Capacity:</strong> {event.capacity}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => router.push(`/dashboards/vendor-event-registrations/${event.id}`)}
              className="px-3 py-1 text-xs font-semibold text-green-600 bg-green-50 rounded-md hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
            >
              View Registrations
            </button>
            <button
              onClick={() => router.push(`/dashboards/vendor-edit-event/${event.id}`)}
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
              onClick={() => handleDelete(event.id, event.title || 'Event')}
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
    const filtered = filterEvents(sectionEvents);
    if (!Array.isArray(filtered) || filtered.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-blackColor dark:text-whiteColor mb-4">
          {title} ({filtered.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered
            .filter(event => event && typeof event === 'object' && event.id)
            .map((event) => (
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

  const allFiltered = filterEvents(events);
  const hasNoResults = allFiltered.length === 0;

  return (
    <div className="w-full">
      {/* Header */}
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
              onClick={() => router.push('/dashboards/vendor-add-event')}
              className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors"
            >
              + Add Event
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
        />
      </div>

      {/* Empty State */}
      {hasNoResults && (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            {searchTerm ? 'No events found matching your search.' : 'No events found. Create your first event!'}
          </p>
        </div>
      )}

      {/* Event Sections */}
      {!hasNoResults && (
        <>
          <EventSection
            title="Current Events"
            events={categorizedEvents.current}
            emptyMessage="No current events"
          />
          <EventSection
            title="Upcoming Events"
            events={categorizedEvents.upcoming}
            emptyMessage="No upcoming events"
          />
          <EventSection
            title="Past Events"
            events={categorizedEvents.past}
            emptyMessage="No past events"
          />
        </>
      )}
    </div>
  );
}

