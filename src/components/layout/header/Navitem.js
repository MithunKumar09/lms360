"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navitem({ navItem, idx, children }) {
  const { name, path, dropdown, isRelative, icon } = navItem;
  const pathname = usePathname();

  // Check if the current path matches the nav item path
  const isActive = (() => {
    if (pathname === path) return true;
    // For non-root paths, check if pathname starts with the path followed by "/" or end of string
    if (path !== "/" && pathname.startsWith(path)) {
      const nextChar = pathname[path.length];
      return nextChar === "/" || nextChar === undefined;
    }
    return false;
  })();

  return (
    <li key={idx} className={`nav-item group ${isRelative ? "relative" : ""}`}>
      <Link
        href={path}
        className={`px-5 lg:px-10px 2xl:px-15px 3xl:px-5 py-6 lg:py-2.5 2xl:py-15px 3xl:py-6 leading-sm 2xl:leading-lg text-base lg:text-sm 2xl:text-base font-semibold flex items-center gap-2 rounded-md transition-all duration-300 ${
          isActive
            ? "bg-primaryColor/10 text-primaryColor dark:bg-primaryColor/20 dark:text-primaryColor"
            : "group-hover:text-primaryColor dark:text-whiteColor"
        }`}
      >
        {icon && <i className={`${icon} text-lg`}></i>}
        <span>{name}</span>
        {dropdown && <i className="icofont-rounded-down ml-1"></i>}
      </Link>

      {/* dropdown */}
      {children}
    </li>
  );
}
