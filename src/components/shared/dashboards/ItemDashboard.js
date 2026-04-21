"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import useLogoutWithConfirm from "@/hooks/useLogoutWithConfirm";

const ItemDashboard = ({ item }) => {
  const currentPath = usePathname();
  const { name, path, icon, tag, hasDropdown, children } = item;
  const isActive = currentPath === path ? true : false;
  const isLogout = name.toLowerCase() === "logout" || path === "#";
  
  const isExternalLink = typeof path === "string" && path.startsWith("http");
  
  // Check if any child is active
  const isChildActive = children?.some(child => currentPath === child.path);
  const isParentActive = isActive || isChildActive;

  const [isExpanded, setIsExpanded] = useState(isChildActive || false);
  
  // Use centralized logout hook
  const { handleLogout, LogoutModal } = useLogoutWithConfirm();

  // Handle logout click
  const handleClick = (e) => {
    if (isLogout) {
      e.preventDefault();
      handleLogout();
    }
  };

return (
  <>
<li
  className={`group relative mx-2 my-1 overflow-hidden rounded-2xl border transition-all duration-300 ${
    isParentActive || isExpanded
      ? "bg-[#14093f] dark:bg-[#7d7890] shadow-[0_8px_30px_rgba(0,0,0,0.06)] border-[#190D45] dark:border-[#190D45]/30"
      : "border-transparent hover:bg-[#7d7890] dark:hover:bg-[#837aa5] hover:shadow-sm"
  }`}
>
      <div className="flex items-center justify-between px-3 py-3">
        {isLogout ? (
          <button
            onClick={handleClick}
            className={`flex w-full items-center gap-3 text-left text-sm font-medium transition-all duration-300 ${
              isActive
                ? "text-primaryColor"
                : "text-contentColor dark:text-contentColor-dark"
            } hover:text-whiteColor`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#cec3ee] dark:bg-[#190D45] shadow-sm">
              {icon}
            </span>
            <span className="truncate">{name}</span>
          </button>
        ) : (
          <>
            {hasDropdown ? (
  <button
    type="button"
    onClick={() => setIsExpanded(!isExpanded)}
    className={`flex flex-1 items-center gap-3 text-sm font-medium transition-all duration-300 ${
      isParentActive || isExpanded
        ? "text-primaryColor"
        : "text-contentColor dark:text-contentColor-dark"
    } hover:text-primaryColor`}
  >
    <span
      className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm transition-all ${
        isParentActive || isExpanded
          ? "bg-[#190D45] text-white"
          : "bg-[#cec3ee] dark:bg-[#190D45]"
      }`}
    >
      {icon}
    </span>
    <span className="truncate">{name}</span>
  </button>
) : isExternalLink ? (
              <a
                href={path}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-1 items-center gap-3 text-sm font-medium transition-all duration-300 ${
                  isParentActive
                    ? "text-primaryColor dark:text-white"
                    : "text-contentColor dark:text-contentColor-dark"
                } hover:text-primaryColor`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#cec3ee] dark:bg-darkdeep3 shadow-sm">
                  {icon}
                </span>
                <span className="truncate">{name}</span>
              </a>
            ) : (
              <Link
                href={path}
                className={`flex flex-1 items-center gap-3 text-sm font-medium transition-all duration-300 ${
                  isParentActive
                    ? "text-white dark:text-white"
                    : "text-contentColor dark:text-contentColor-dark"
                } hover:text-primaryColor`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white bg-[#cec3ee] dark:bg-[#190D45] shadow-sm">
                  {icon}
                </span>
                <span className="truncate">{name}</span>
              </Link>
            )}

            {hasDropdown && (
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
                className={`transition-all duration-300 ${
                  isExpanded ? "rotate-180 text-primaryColor" : "text-gray-400"
                }`}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            )}
          </>
        )}
      </div>

{hasDropdown && isExpanded && children && (
  <ul className="mt-2 space-y-1 px-3 pb-3">
    {children.map((child, idx) => {
      const isChildItemActive = currentPath === child.path;
      const isNonNavigable = child.path === "#";
      const isExternalChildLink =
        typeof child.path === "string" &&
        child.path.startsWith("http");

      const childClass = `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
        isChildItemActive
          ? "bg-violet-50 text-violet-700 dark:bg-darkdeep3"
          : "text-slate-600 dark:text-contentColor-dark hover:bg-[#837aa5] hover:text-whiteColor"
      }`;

      return (
        <li key={idx}>
          {isNonNavigable ? (
            <span className={childClass}>
              <span className="flex-shrink-0">{child.icon}</span>
              <span className="truncate">{child.name}</span>
            </span>
          ) : isExternalChildLink ? (
            <a
              href={child.path}
              target="_blank"
              rel="noopener noreferrer"
              className={childClass}
            >
              <span className="flex-shrink-0">{child.icon}</span>
              <span className="truncate">{child.name}</span>
            </a>
          ) : (
            <Link href={child.path} className={childClass}>
              <span className="flex-shrink-0">{child.icon}</span>
              <span className="truncate">{child.name}</span>
            </Link>
          )}
        </li>
      );
    })}
  </ul>
)}
    </li>
    {isLogout && LogoutModal}
  </>
);
};

export default ItemDashboard;
