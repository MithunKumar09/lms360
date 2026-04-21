"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import useLogoutWithConfirm from "@/hooks/useLogoutWithConfirm";

/**
 * BottomDrawer Component
 * 
 * Expandable drawer that slides up from the bottom on mobile/tablet.
 * Shows all navigation items from the sidebar in a mobile-friendly format.
 */
const BottomDrawer = ({ isOpen, onClose, items }) => {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState({});
  const { handleLogout, LogoutModal } = useLogoutWithConfirm();

  // Toggle section expansion
  const toggleSection = (sectionIdx) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionIdx]: !prev[sectionIdx],
    }));
  };

  // Check if a path is active
  const isActive = (path) => {
    if (!path || path === "#") return false;
    return pathname === path;
  };

  // Check if any child is active
  const isChildActive = (item) => {
    if (!item.children) return false;
    return item.children.some((child) => pathname === child.path);
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[50] transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleBackdropClick}
        aria-hidden={!isOpen}
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[60] bg-whiteColor dark:bg-whiteColor-dark rounded-t-2xl shadow-2xl max-h-[min(85vh,720px)] overflow-hidden flex flex-col lg:hidden transition-transform duration-300 ease-out safe-area-inset-bottom ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-borderColor dark:border-borderColor-dark">
          <h2
            id="drawer-title"
            className="text-base sm:text-lg font-semibold text-blackColor dark:text-blackColor-dark"
          >
            Navigation
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-lightGrey5 dark:hover:bg-darkdeep1 transition-colors"
            aria-label="Close navigation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-x"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {items?.map((section, sectionIdx) => (
            <div key={sectionIdx} className="border-b border-borderColor dark:border-borderColor-dark last:border-b-0">
              {/* Section Title */}
              <div className="px-3 sm:px-4 py-2 sm:py-3 bg-lightGrey5 dark:bg-darkdeep1">
                <h3 className="text-xs sm:text-sm font-semibold uppercase text-contentColor dark:text-contentColor-dark tracking-wide">
                  {section.title}
                </h3>
              </div>

              {/* Section Items */}
              <ul className="py-1 sm:py-2">
                {section.items?.map((item, itemIdx) => {
                  const itemIsActive = isActive(item.path) || isChildActive(item);
                  const isLogout = item.name?.toLowerCase() === "logout" || item.path === "#";
                  const hasChildren = item.hasDropdown && item.children?.length > 0;
                  const isExpanded = expandedSections[`${sectionIdx}-${itemIdx}`];
                  const isExternalLink =
                    typeof item.path === "string" && item.path.startsWith("http");

                  return (
                    <li key={itemIdx}>
                      {isLogout ? (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleLogout();
                            onClose();
                          }}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left text-contentColor dark:text-contentColor-dark active:text-primaryColor active:bg-lightGrey5 dark:active:bg-darkdeep1 transition-colors duration-200 flex items-center gap-2 sm:gap-3"
                        >
                          <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
                          <span className="flex-1 text-sm sm:text-base">{item.name}</span>
                        </button>
                      ) : hasChildren ? (
                        <>
                          <button
                            onClick={() =>
                              toggleSection(`${sectionIdx}-${itemIdx}`)
                            }
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left transition-colors duration-200 flex items-center justify-between gap-2 sm:gap-3 ${
                              itemIsActive
                                ? "text-primaryColor bg-lightGrey7 dark:bg-darkdeep1"
                                : "text-contentColor dark:text-contentColor-dark active:text-primaryColor active:bg-lightGrey5 dark:active:bg-darkdeep1"
                            }`}
                          >
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                              <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
                              <span className="flex-1 truncate text-sm sm:text-base">{item.name}</span>
                              {item.tag && (
                                <span className="text-xs font-medium text-whiteColor px-1.5 sm:px-2 py-0.5 bg-primaryColor rounded-full flex-shrink-0">
                                  {item.tag > 99 ? "99+" : item.tag}
                                </span>
                              )}
                            </div>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`feather feather-chevron-down transition-transform duration-200 flex-shrink-0 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            >
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </button>

                          {/* Children Items */}
                          {isExpanded && (
                            <div className="bg-lightGrey5 dark:bg-darkdeep1/50">
                              {item.children?.map((child, childIdx) => {
                                const childIsActive = isActive(child.path);
                                const isNonNavigable = child.path === "#";
                                const isExternalChildLink =
                                  typeof child.path === "string" &&
                                  child.path.startsWith("http");

                                return (
                                  <div key={childIdx} className="border-t border-borderColor dark:border-borderColor-dark first:border-t-0">
                                    {isNonNavigable ? (
                                      <span
                                        className={`block px-3 sm:px-4 py-2 sm:py-2.5 pl-10 sm:pl-12 text-xs sm:text-sm transition-colors duration-150 ${
                                          childIsActive
                                            ? "text-primaryColor"
                                            : "text-contentColor dark:text-contentColor-dark"
                                        }`}
                                      >
                                        <span className="inline-block w-4 h-4 mr-2 sm:mr-3 align-middle">
                                          {child.icon}
                                        </span>
                                        {child.name}
                                      </span>
                                    ) : (
                                      isExternalChildLink ? (
                                        <a
                                          href={child.path}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={onClose}
                                          className={`block px-3 sm:px-4 py-2 sm:py-2.5 pl-10 sm:pl-12 text-xs sm:text-sm transition-colors duration-150 ${
                                            childIsActive
                                              ? "text-primaryColor bg-lightGrey7 dark:bg-darkdeep1"
                                              : "text-contentColor dark:text-contentColor-dark active:text-primaryColor active:bg-lightGrey7 dark:active:bg-darkdeep1"
                                          }`}
                                        >
                                          <span className="inline-block w-4 h-4 mr-2 sm:mr-3 align-middle">
                                            {child.icon}
                                          </span>
                                          {child.name}
                                        </a>
                                      ) : (
                                        <Link
                                          href={child.path}
                                          onClick={onClose}
                                          className={`block px-3 sm:px-4 py-2 sm:py-2.5 pl-10 sm:pl-12 text-xs sm:text-sm transition-colors duration-150 ${
                                            childIsActive
                                              ? "text-primaryColor bg-lightGrey7 dark:bg-darkdeep1"
                                              : "text-contentColor dark:text-contentColor-dark active:text-primaryColor active:bg-lightGrey7 dark:active:bg-darkdeep1"
                                          }`}
                                        >
                                          <span className="inline-block w-4 h-4 mr-2 sm:mr-3 align-middle">
                                            {child.icon}
                                          </span>
                                          {child.name}
                                        </Link>
                                      )
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        isExternalLink ? (
                          <a
                            href={item.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onClose}
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left transition-colors duration-200 flex items-center gap-2 sm:gap-3 ${
                              itemIsActive
                                ? "text-primaryColor bg-lightGrey7 dark:bg-darkdeep1"
                                : "text-contentColor dark:text-contentColor-dark active:text-primaryColor active:bg-lightGrey5 dark:active:bg-darkdeep1"
                            }`}
                          >
                            <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
                            <span className="flex-1 text-sm sm:text-base">{item.name}</span>
                            {item.tag && (
                              <span className="text-xs font-medium text-whiteColor px-1.5 sm:px-2 py-0.5 bg-primaryColor rounded-full flex-shrink-0">
                                {item.tag > 99 ? "99+" : item.tag}
                              </span>
                            )}
                          </a>
                        ) : (
                          <Link
                            href={item.path || "#"}
                            onClick={onClose}
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left transition-colors duration-200 flex items-center gap-2 sm:gap-3 ${
                              itemIsActive
                                ? "text-primaryColor bg-lightGrey7 dark:bg-darkdeep1"
                                : "text-contentColor dark:text-contentColor-dark active:text-primaryColor active:bg-lightGrey5 dark:active:bg-darkdeep1"
                            }`}
                          >
                            <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
                            <span className="flex-1 text-sm sm:text-base">{item.name}</span>
                            {item.tag && (
                              <span className="text-xs font-medium text-whiteColor px-1.5 sm:px-2 py-0.5 bg-primaryColor rounded-full flex-shrink-0">
                                {item.tag > 99 ? "99+" : item.tag}
                              </span>
                            )}
                          </Link>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Logout Modal */}
      {LogoutModal}
    </>
  );
};

export default BottomDrawer;

