"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import Image from "next/image";

const SubmissionMessages = ({ submissionId, studentName, studentAvatar }) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const messagesEndRef = useRef(null);
  const [messageText, setMessageText] = useState("");

  // Fetch messages
  const { data, isLoading } = useQuery({
    queryKey: ["submission-messages", submissionId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/assignments/submissions/${submissionId}/messages`
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch messages");
      }
      return response;
    },
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  const messages = data?.messages || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (text) => {
      const response = await apiClient.post(
        `/assignments/submissions/${submissionId}/messages`,
        { messageText: text }
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to send message");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submission-messages", submissionId] });
      setMessageText("");
    },
    onError: (error) => {
      createAlert({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to send message",
      });
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (messageText.trim().length === 0) return;
    sendMessageMutation.mutate(messageText);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full flex flex-col bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
      {/* Header */}
      <div className="p-4 border-b border-borderColor dark:border-borderColor-dark">
        <div className="flex items-center gap-3">
          {studentAvatar ? (
            <Image
              src={studentAvatar}
              alt={studentName}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 font-semibold">
                {studentName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-blackColor dark:text-blackColor-dark">
              {studentName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Student</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isCurrentUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] ${message.isCurrentUser ? "order-2" : "order-1"}`}
              >
                <div className="flex items-start gap-2">
                  {!message.isCurrentUser && (
                    <div className="flex-shrink-0">
                      {message.senderAvatar ? (
                        <Image
                          src={message.senderAvatar}
                          alt={message.senderName}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 text-xs font-semibold">
                            {message.senderName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      message.isCurrentUser
                        ? "bg-primaryColor text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-blackColor dark:text-blackColor-dark"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.messageText}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.isCurrentUser ? "text-white/70" : "text-gray-500"
                      }`}
                    >
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                  {message.isCurrentUser && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primaryColor flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">I</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-borderColor dark:border-borderColor-dark">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border-2 border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark"
            disabled={sendMessageMutation.isPending}
          />
          <button
            type="submit"
            disabled={sendMessageMutation.isPending || messageText.trim().length === 0}
            className="px-6 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendMessageMutation.isPending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubmissionMessages;

