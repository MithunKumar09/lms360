'use client';

import Link from "next/link";
import React from "react";
import { useFeedbackModal } from "@/components/shared/feedback";

const MobileLinkSecondary = ({ item }) => {
  const { name, path, status, icon } = item;
  const { openModal, canSubmitFeedback } = useFeedbackModal();

  // Handle Feedback item click - open modal instead of navigating
  const handleFeedbackClick = (e) => {
    if (name === "Feedback" && path === "#") {
      e.preventDefault();
      e.stopPropagation();
      if (canSubmitFeedback) {
        openModal(true); // Force open, bypass dismissedInSession check
      }
    }
  };

  // If it's Feedback item with # path, render as button
  if (name === "Feedback" && path === "#") {
    return (
      <button
        type="button"
        onClick={handleFeedbackClick}
        disabled={!canSubmitFeedback}
        className={`leading-1 text-darkdeep1 text-sm pl-30px pt-3 pb-7px font-light hover:text-secondaryColor dark:text-whiteColor dark:hover:text-secondaryColor flex items-center gap-2 w-full text-left ${
          !canSubmitFeedback ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        {icon && <i className={`${icon} text-base text-primaryColor`}></i>}
        <span>{name}</span>
        {status && (
          <span
            className={`px-15px py-5px ${
              status === "New" ? "text-secondaryColor" : "text-primaryColor"
            } bg-whitegrey3 text-xs rounded ml-5px`}
          >
            {status}
          </span>
        )}
      </button>
    );
  }

  // Regular link for other items
  return (
    <Link
      href={path}
      className="leading-1 text-darkdeep1 text-sm pl-30px pt-3 pb-7px font-light hover:text-secondaryColor dark:text-whiteColor dark:hover:text-secondaryColor flex items-center gap-2"
    >
      {icon && <i className={`${icon} text-base text-primaryColor`}></i>}
      <span>{name}</span>
      {status && (
        <span
          className={`px-15px py-5px ${
            status === "New" ? "text-secondaryColor" : "text-primaryColor"
          } bg-whitegrey3 text-xs rounded ml-5px`}
        >
          {status}
        </span>
      )}
    </Link>
  );
};

export default MobileLinkSecondary;
