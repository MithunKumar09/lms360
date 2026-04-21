"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import BottomDrawer from "./BottomDrawer";

/**
 * BottomNav Component
 * 
 * Fixed bottom navigation bar for mobile and tablet screens.
 * Shows primary navigation items and a "More" button to open drawer.
 * Only visible on screens smaller than lg (992px).
 */
const BottomNav = ({ items }) => {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Get primary items (first 4-5 items from all sections combined)
  // Filter out logout, items without paths, and items with dropdowns (they go in drawer)
  const allPrimaryItems = items
    ?.flatMap((section) => section.items || [])
    ?.filter((item) => {
      const isLogout = item.name?.toLowerCase() === "logout" || item.path === "#";
      const hasDropdown = item.hasDropdown && item.children?.length > 0;
      return !isLogout && item.path && !hasDropdown;
    }) || [];

  // Take first 4-5 items for bottom nav
  const primaryItems = allPrimaryItems.slice(0, 5);

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

  return (
    <>
      {/* Bottom Navigation Bar - Only visible on mobile/tablet */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-whiteColor dark:bg-whiteColor-dark border-t border-borderColor dark:border-borderColor-dark shadow-lg lg:hidden safe-area-inset-bottom">
        <div className="grid grid-cols-5 h-16 px-1 sm:px-2 max-w-full w-full">
          {primaryItems.map((item, idx) => {
            const itemIsActive = isActive(item.path) || isChildActive(item);
            const isExternalLink =
              typeof item.path === "string" && item.path.startsWith("http");

            return (
              isExternalLink ? (
                <a
                  key={idx}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`relative flex flex-col items-center justify-center flex-1 h-full min-w-0 px-0.5 sm:px-1 transition-colors duration-200 ${
                    itemIsActive
                      ? "text-primaryColor"
                      : "text-contentColor dark:text-contentColor-dark"
                  }`}
                >
                  <div className="relative flex items-center justify-center mb-0.5 sm:mb-1">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                      {item.icon}
                    </div>
                    {item.tag && (
                      <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-primaryColor text-whiteColor text-[9px] sm:text-[10px] rounded-full flex items-center justify-center font-semibold">
                        {item.tag > 99 ? "99+" : item.tag}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-medium truncate w-full text-center leading-tight px-0.5">
                    {item.name}
                  </span>
                  {itemIsActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 sm:w-8 h-0.5 bg-primaryColor rounded-t-full" />
                  )}
                </a>
              ) : (
                <Link
                  key={idx}
                  href={item.path || "#"}
                  className={`relative flex flex-col items-center justify-center flex-1 h-full min-w-0 px-0.5 sm:px-1 transition-colors duration-200 ${
                    itemIsActive
                      ? "text-primaryColor"
                      : "text-contentColor dark:text-contentColor-dark"
                  }`}
                >
                  <div className="relative flex items-center justify-center mb-0.5 sm:mb-1">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                      {item.icon}
                    </div>
                    {item.tag && (
                      <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-primaryColor text-whiteColor text-[9px] sm:text-[10px] rounded-full flex items-center justify-center font-semibold">
                        {item.tag > 99 ? "99+" : item.tag}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-medium truncate w-full text-center leading-tight px-0.5">
                    {item.name}
                  </span>
                  {itemIsActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 sm:w-8 h-0.5 bg-primaryColor rounded-t-full" />
                  )}
                </Link>
              )
            );
          })}

          {/* More Button - Opens Drawer */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full min-w-0 px-0.5 sm:px-1 transition-colors duration-200 text-contentColor dark:text-contentColor-dark active:text-primaryColor"
            aria-label="Open navigation menu"
          >
            <div className="flex items-center justify-center mb-0.5 sm:mb-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-more-horizontal w-5 h-5 sm:w-6 sm:h-6"
              >
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="19" cy="12" r="1"></circle>
                <circle cx="5" cy="12" r="1"></circle>
              </svg>
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium px-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* Bottom Drawer - Full Navigation */}
      <BottomDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        items={items}
      />

    </>
  );
};

export default BottomNav;

