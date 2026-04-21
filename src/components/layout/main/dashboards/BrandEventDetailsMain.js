"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client.js";
import { format } from "date-fns";
import Image from "next/image";
import useSweetAlert from "@/hooks/useSweetAlert";
import BrandEventProposal from "@/components/sections/sub-section/dashboards/BrandEventProposal";
import EventRegistrationsManagement from "@/components/sections/sub-section/dashboards/EventRegistrationsManagement";

export default function BrandEventDetailsMain({ eventId }) {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details' or 'registrations'

  const { data: eventData, isLoading } = useQuery({
    queryKey: ['brand-event', eventId],
    queryFn: async () => {
      const response = await apiClient.get(`/brand/events/${eventId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch event');
      }
      return response.data;
    },
    enabled: !!eventId && !isEditMode,
  });

  const event = eventData?.event;

  // Delete mutation
  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/brand/events/${eventId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete event');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-events'] });
      createAlert('success', 'Event deleted successfully!');
      router.push('/dashboards/brand-events');
    },
    onError: (error) => {
      console.error('Delete event error:', error);
      createAlert('error', error.message || 'Failed to delete event');
    },
  });

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${event?.title}"? This action cannot be undone.`)) {
      return;
    }
    await deleteEventMutation.mutateAsync();
  };

  const handleEditComplete = () => {
    setIsEditMode(false);
    queryClient.invalidateQueries({ queryKey: ['brand-event', eventId] });
  };

  if (isLoading && !isEditMode) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading event details...</p>
      </div>
    );
  }

  if (!event && !isEditMode) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Event not found</p>
      </div>
    );
  }

  // Edit mode - show form
  if (isEditMode && event) {
    // Prepare form data from event
    const startDate = event.start_date ? new Date(event.start_date) : null;
    const endDate = event.end_date ? new Date(event.end_date) : null;
    
    const formData = {
      title: event.title || '',
      description: event.description || '',
      banner_url: event.banner_url || '',
      event_type: event.event_type || 'seminar',
      start_date: startDate ? format(startDate, 'yyyy-MM-dd') : '',
      start_time: startDate ? format(startDate, 'HH:mm') : '',
      end_date: endDate ? format(endDate, 'yyyy-MM-dd') : '',
      end_time: endDate ? format(endDate, 'HH:mm') : '',
      mode: event.mode || 'online',
      external_link: event.external_link || '',
      is_free: event.is_free !== false,
      price: event.price || '',
      capacity: event.capacity || '',
      status: event.status || 'draft',
    };

    return (
      <div className="w-full">
        <div className="mb-4">
          <button
            onClick={() => setIsEditMode(false)}
            className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-lightGrey5 dark:hover:bg-gray-800 transition-colors mb-4"
          >
            ← Back to Details
          </button>
        </div>
        <BrandEventProposal 
          mode="edit" 
          eventId={eventId}
          initialData={formData}
          onComplete={handleEditComplete}
        />
      </div>
    );
  }

  // View mode
  const canEdit = event?.status === 'draft' || event?.status === 'proposed';
  const canDelete = event?.status === 'draft' || event?.status === 'proposed';

  return (
    <div className="w-full">
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/dashboards/brand-events')}
              className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-lightGrey5 dark:hover:bg-gray-800 transition-colors"
            >
              ← Back to Events
            </button>
            
            {(canEdit || canDelete) && (
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-4 py-2 text-sm font-semibold text-whiteColor bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors"
                  >
                    Edit Event
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={deleteEventMutation.isPending}
                    className="px-4 py-2 text-sm font-semibold text-whiteColor bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteEventMutation.isPending ? 'Deleting...' : 'Delete Event'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b-2 border-borderColor dark:border-borderColor-dark">
            <button
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'details'
                  ? 'text-primaryColor border-b-2 border-primaryColor'
                  : 'text-contentColor dark:text-contentColor-dark hover:text-primaryColor'
              }`}
              onClick={() => setActiveTab('details')}
            >
              Event Details
            </button>
            <button
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'registrations'
                  ? 'text-primaryColor border-b-2 border-primaryColor'
                  : 'text-contentColor dark:text-contentColor-dark hover:text-primaryColor'
              }`}
              onClick={() => setActiveTab('registrations')}
            >
              Registrations
            </button>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-blackColor dark:text-blackColor-dark">
              {event.title}
            </h1>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
              event.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
              event.status === 'proposed' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
              event.status === 'published' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
              event.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {event.status?.toUpperCase() || 'DRAFT'}
            </span>
          </div>
        </div>

        {activeTab === 'registrations' ? (
          <EventRegistrationsManagement eventId={eventId} />
        ) : (
          <>
            {event.banner_url && (
          <div className="mb-6">
            <Image
              src={event.banner_url}
              alt={event.title}
              width={1200}
              height={600}
              className="w-full h-auto rounded-lg"
              unoptimized
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
            <strong className="text-sm text-contentColor dark:text-contentColor-dark block mb-1">Event Type</strong>
            <p className="text-base text-blackColor dark:text-blackColor-dark font-semibold">
              {event.event_type ? event.event_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
            </p>
          </div>
          <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
            <strong className="text-sm text-contentColor dark:text-contentColor-dark block mb-1">Mode</strong>
            <p className="text-base text-blackColor dark:text-blackColor-dark font-semibold">
              {event.mode ? event.mode.charAt(0).toUpperCase() + event.mode.slice(1) : 'N/A'}
            </p>
          </div>
          <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
            <strong className="text-sm text-contentColor dark:text-contentColor-dark block mb-1">Start Date & Time</strong>
            <p className="text-base text-blackColor dark:text-blackColor-dark font-semibold">
              {event.start_date ? format(new Date(event.start_date), 'PPP p') : 'N/A'}
            </p>
          </div>
          <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
            <strong className="text-sm text-contentColor dark:text-contentColor-dark block mb-1">End Date & Time</strong>
            <p className="text-base text-blackColor dark:text-blackColor-dark font-semibold">
              {event.end_date ? format(new Date(event.end_date), 'PPP p') : 'N/A'}
            </p>
          </div>
          {event.capacity && (
            <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
              <strong className="text-sm text-contentColor dark:text-contentColor-dark block mb-1">Capacity</strong>
              <p className="text-base text-blackColor dark:text-blackColor-dark font-semibold">
                {event.capacity} {event.registration_count ? `(${event.registration_count} registered)` : ''}
              </p>
            </div>
          )}
          <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
            <strong className="text-sm text-contentColor dark:text-contentColor-dark block mb-1">Price</strong>
            <p className="text-base text-blackColor dark:text-blackColor-dark font-semibold">
              {event.is_free ? 'Free' : `₹${parseFloat(event.price || 0).toLocaleString('en-IN')}`}
            </p>
          </div>
        </div>

        {event.external_link && (
          <div className="mb-6 p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
            <strong className="text-sm text-contentColor dark:text-contentColor-dark block mb-2">External Link</strong>
            <a 
              href={event.external_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primaryColor hover:text-primaryColor/80 dark:text-primaryColor-dark dark:hover:text-primaryColor-dark/80 underline break-all"
            >
              {event.external_link}
            </a>
          </div>
        )}

            <div className="mb-6">
              <strong className="text-base text-blackColor dark:text-blackColor-dark block mb-2">Description</strong>
              <div className="p-4 bg-lightGrey5 dark:bg-gray-800 rounded-lg">
                <p className="text-contentColor dark:text-contentColor-dark whitespace-pre-wrap">
                  {event.description || 'No description provided'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
