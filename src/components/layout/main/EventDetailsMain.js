"use client";

import EventDetails from "@/components/sections/event-details/EventDetails";
import HeroPrimary from "@/components/sections/hero-banners/HeroPrimary";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useParams } from "next/navigation";

const EventDetailsMain = () => {
  const params = useParams();
  const eventId = params?.id;

  const { data: eventData, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const response = await apiClient.get(`/events/${eventId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch event');
      }
      return response.data;
    },
    enabled: !!eventId,
  });

  const event = eventData?.event;

  if (isLoading) {
    return (
      <>
        <HeroPrimary path={"Event Page"} title={"Event Details"} />
        <div className="container py-50px md:py-70px lg:py-20 2xl:py-100px">
          <div className="text-center">
            <p className="text-contentColor dark:text-contentColor-dark">Loading event...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !event) {
    return (
      <>
        <HeroPrimary path={"Event Page"} title={"Event Details"} />
        <div className="container py-50px md:py-70px lg:py-20 2xl:py-100px">
          <div className="text-center">
            <p className="text-contentColor dark:text-contentColor-dark">
              {error?.message || 'Event not found'}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <HeroPrimary path={"Event Page"} title={"Event Details"} />
      <EventDetails event={event} />
    </>
  );
};

export default EventDetailsMain;
