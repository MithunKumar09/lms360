"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import Image from "next/image";
import { format } from "date-fns";

export default function BrandEventManagement() {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, proposed, approved, published, cancelled

  // Fetch brand's events
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['brand-events', userId],
    queryFn: async () => {
      const response = await apiClient.get(`/brand/events`);
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

  // Delete mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId) => {
      const response = await apiClient.delete(`/brand/events/${eventId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete event');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-events'] });
      createAlert('success', 'Event deleted successfully!');
    },
    onError: (error) => {
      console.error('Delete event error:', error);
      createAlert('error', error.message || 'Failed to delete event');
    },
  });

  // Propose event mutation (submit for superadmin approval)
  const proposeEventMutation = useMutation({
    mutationFn: async (eventId) => {
      const response = await apiClient.post(`/brand/events/${eventId}/propose`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to propose event');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-events'] });
      createAlert('success', 'Event submitted for approval!');
    },
    onError: (error) => {
      console.error('Propose event error:', error);
      createAlert('error', error.message || 'Failed to propose event');
    },
  });

  // Categorize events
  const categorizedEvents = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const current = [];
    const past = [];

    events.forEach((event) => {
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);

      if (endDate < now) {
        past.push(event);
      } else if (startDate <= now && endDate >= now) {
        current.push(event);
      } else {
        upcoming.push(event);
      }
    });

    return { upcoming, current, past };
  }, [events]);

  // Filter by search term and status
  const filterEvents = (eventList) => {
    let filtered = eventList;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title?.toLowerCase().includes(search) ||
          event.description?.toLowerCase().includes(search)
      );
    }

    return filtered;
  };

  const handleDelete = async (eventId, eventTitle) => {
    if (!confirm(`Are you sure you want to delete "${eventTitle}"?`)) {
      return;
    }
    await deleteEventMutation.mutateAsync(eventId);
  };

  const handlePropose = async (eventId) => {
    if (!confirm('Submit this event for Super Admin approval?')) {
      return;
    }
    await proposeEventMutation.mutateAsync(eventId);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'proposed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'published':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'draft':
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const EventCard = ({ event }) => (
    <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-accordion dark:shadow-accordion-dark overflow-hidden border-2 border-borderColor dark:border-borderColor-dark hover:shadow-lg transition-all duration-300">
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
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark flex-1 pr-2">
            {event.title}
          </h3>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${getStatusBadgeColor(event.status)}`}>
            {event.status}
          </span>
        </div>
        {event.description && (
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-4 line-clamp-2">
            {event.description}
          </p>
        )}
        <div className="space-y-2 text-sm text-contentColor dark:text-contentColor-dark mb-4 pb-4 border-b border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span><strong>Start:</strong> {format(new Date(event.start_date), 'PPP p')}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span><strong>End:</strong> {format(new Date(event.end_date), 'PPP p')}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span><strong>Mode:</strong> {event.mode}</span>
          </div>
          {event.is_free ? (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Free Event
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span><strong>Price:</strong> ₹{parseFloat(event.price || 0).toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {event.status === 'draft' && (
            <button
              onClick={() => handlePropose(event.id)}
              disabled={proposeEventMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-yellow-700 bg-yellow-50 rounded-md hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30 transition-colors disabled:opacity-50"
            >
              Submit for Approval
            </button>
          )}
          {event.status === 'approved' && (
            <button
              onClick={() => router.push(`/dashboards/brand-events/${event.id}`)}
              className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
            >
              Manage
            </button>
          )}
          <button
            onClick={() => router.push(`/dashboards/brand-events/${event.id}`)}
            className="px-4 py-2 text-xs font-semibold text-primaryColor bg-primaryColor/10 rounded-md hover:bg-primaryColor/20 transition-colors"
          >
            View Details
          </button>
          <button
            onClick={() => handleDelete(event.id, event.title)}
            disabled={deleteEventMutation.isPending}
            className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 rounded-md hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  const EventSection = ({ title, events: sectionEvents, emptyMessage }) => {
    const filtered = filterEvents(sectionEvents);
    if (filtered.length === 0) return null;

    return (
      <div className="mb-30px">
        <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-6 pb-3 border-b-2 border-borderColor dark:border-borderColor-dark">
          {title} <span className="text-lg text-contentColor dark:text-contentColor-dark">({filtered.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-15px lg:gap-30px">
          {filtered.map((event) => (
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
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
                Manage Events
              </h2>
              <p className="text-contentColor dark:text-contentColor-dark">
                View and manage your event proposals
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboards/brand-events?action=propose')}
              className="px-6 py-3 text-sm font-semibold text-whiteColor bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors shadow-md hover:shadow-lg"
            >
              + Propose Event
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-15px lg:gap-30px">
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primaryColor text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md transition-all"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primaryColor text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="proposed">Proposed</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Empty State */}
        {hasNoResults && (
          <div className="text-center py-20 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border-2 border-borderColor dark:border-borderColor-dark shadow-accordion dark:shadow-accordion-dark">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto text-contentColor dark:text-contentColor-dark mb-4 opacity-50"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <p className="text-contentColor dark:text-contentColor-dark text-lg mb-2">
              {searchTerm || statusFilter !== 'all' 
                ? 'No events found matching your filters.' 
                : 'No events found. Propose your first event!'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => router.push('/dashboards/brand-events?action=propose')}
                className="mt-4 px-6 py-3 text-sm font-semibold text-whiteColor bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors"
              >
                + Propose Your First Event
              </button>
            )}
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
    </div>
  );
}
