/**
 * Webhook Event List Component
 * 
 * Displays webhook events with status and replay functionality
 */

"use client";

import { useState } from "react";
import useSweetAlert from "@/hooks/useSweetAlert";

const WebhookEventList = ({ events = [], onReplay, loading = false }) => {
  const createAlert = useSweetAlert();
  const [replayingId, setReplayingId] = useState(null);

  const handleReplay = async (eventId) => {
    if (!onReplay) return;

    setReplayingId(eventId);
    try {
      await onReplay(eventId);
      createAlert("success", "Webhook replayed successfully");
    } catch (error) {
      createAlert("error", error.message || "Failed to replay webhook");
    } finally {
      setReplayingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      processed: { label: "Processed", className: "bg-greencolor text-white" },
      pending: { label: "Pending", className: "bg-yellow-500 text-white" },
      failed: { label: "Failed", className: "bg-red-500 text-white" },
      retrying: { label: "Retrying", className: "bg-primaryColor text-white" },
    };

    const config = configs[status] || { label: status, className: "bg-gray-400 text-white" };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-50px">
        <div className="inline-block animate-spin rounded-full h-32px w-32px border-b-2 border-primaryColor"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-50px">
        <p className="text-contentColor dark:text-contentColor-dark">No webhook events found</p>
      </div>
    );
  }

  return (
    <div className="space-y-10px">
      {events.map((event) => (
        <div
          key={event.id}
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-15px"
        >
          <div className="flex items-start justify-between gap-15px">
            <div className="flex-1">
              <div className="flex items-center gap-10px mb-5px">
                <span className="text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                  {event.eventType}
                </span>
                {getStatusBadge(event.status)}
                {event.signatureValid === false && (
                  <span className="text-xs text-red-500">Invalid Signature</span>
                )}
              </div>
              <p className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
                Event ID: {event.eventId}
              </p>
              {event.errorMessage && (
                <p className="text-12px text-red-500 mt-5px">{event.errorMessage}</p>
              )}
              {event.retryCount > 0 && (
                <p className="text-12px text-yellow-600 mt-5px">
                  Retries: {event.retryCount}
                </p>
              )}
              <p className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
                Created: {new Date(event.createdAt).toLocaleString()}
              </p>
              {event.processedAt && (
                <p className="text-12px text-contentColor dark:text-contentColor-dark">
                  Processed: {new Date(event.processedAt).toLocaleString()}
                </p>
              )}
            </div>
            {event.status === "failed" && onReplay && (
              <button
                onClick={() => handleReplay(event.id)}
                disabled={replayingId === event.id}
                className="px-15px py-8px bg-primaryColor text-whiteColor rounded-5 text-12px font-semibold hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {replayingId === event.id ? "Replaying..." : "Replay"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WebhookEventList;

