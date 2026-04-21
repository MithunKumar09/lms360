'use client';

import Link from "next/link";
import React from "react";
import { useFeedbackModal } from "@/components/shared/feedback";

const DropdownLink = ({ item }) => {
  const { name, status, type, dropdown, path, icon } = item;
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
        className={`whitespace-nowrap text-sm 2xl:text-base font-semibold text-contentColor border-l-2 border-transparent transition duration-300 hover:border-primaryColor hover:bg-whitegrey1 hover:text-primaryColor leading-sm 3xl:leading-lg dark:text-whiteColor dark:hover:bg-whitegrey1-dark dark:hover:text-primaryColor w-full text-left ${
          type === "secondary" || dropdown
            ? "flex justify-between items-center px-25px py-10px "
            : icon 
            ? "flex items-center gap-2 p-10px"
            : "p-10px "
        } ${!canSubmitFeedback ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="flex items-center gap-2">
          {icon && <i className={`${icon} text-base text-primaryColor`}></i>}
          <span>{name}</span>
        </span>
        {status && status !== "New" && (
          <span className="text-size-12 font-semibold text-primaryColor bg-whitegrey3 px-15px py-5px ml-5px rounded leading-1">
            {status}
          </span>
        )}
        {status === "New" && (
          <span className="text-size-12 font-semibold text-secondaryColor bg-whitegrey3 px-15px py-5px ml-5px rounded leading-1">
            {status}
          </span>
        )}

        {dropdown && <i className="icofont-rounded-right"></i>}
      </button>
    );
  }

  // Regular link for other items
  return (
    <Link
      href={path}
      className={`whitespace-nowrap text-sm 2xl:text-base font-semibold text-contentColor border-l-2 border-transparent transition duration-300 hover:border-primaryColor hover:bg-whitegrey1 hover:text-primaryColor leading-sm 3xl:leading-lg dark:text-whiteColor dark:hover:bg-whitegrey1-dark dark:hover:text-primaryColor ${
        type === "secondary" || dropdown
          ? "flex justify-between items-center px-25px py-10px "
          : icon 
          ? "flex items-center gap-2 p-10px"
          : "p-10px "
      }`}
    >
      <span className="flex items-center gap-2">
        {icon && <i className={`${icon} text-base text-primaryColor`}></i>}
        <span>{name}</span>
      </span>
      {status && status !== "New" && (
        <span className="text-size-12 font-semibold text-primaryColor bg-whitegrey3 px-15px py-5px ml-5px rounded leading-1">
          {status}
        </span>
      )}
      {status === "New" && (
        <span className="text-size-12 font-semibold text-secondaryColor bg-whitegrey3 px-15px py-5px ml-5px rounded leading-1">
          {status}
        </span>
      )}

      {dropdown && <i className="icofont-rounded-right"></i>}
    </Link>
  );
};

export default DropdownLink;
