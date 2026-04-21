import Link from "next/link";
import React from "react";

const MobileLink = ({ item }) => {
  const { name, path, icon } = item;
  return (
    <Link
      className="leading-1 py-11px text-darkdeep1 font-medium hover:text-secondaryColor dark:text-whiteColor dark:hover:text-secondaryColor flex items-center gap-2"
      href={path}
    >
      {icon && <i className={`${icon} text-lg`}></i>}
      <span>{name}</span>
    </Link>
  );
};

export default MobileLink;
