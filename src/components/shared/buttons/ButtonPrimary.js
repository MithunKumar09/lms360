"use client";
import Link from "next/link";
import React from "react";

const ButtonPrimary = ({
  children,
  color,
  type,
  path,
  arrow,
  width,
  onClick,
  disabled,
}) => {
  return type === "button" || type === "submit" ? (
    <button
      {...{ type: type === "submit" ? "submit" : "" }}
      onClick={onClick ? onClick : () => {}}
      disabled={disabled}
      className={`text-size-15 text-whiteColor  px-25px py-10px border  hover:bg-whiteColor inline-block rounded dark:hover:bg-whiteColor-dark dark:hover:text-whiteColor ${
        width === "full" ? "w-full" : ""
      } ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${
        color === "secondary"
          ? "bg-secondaryColor border-secondaryColor hover:text-secondaryColor"
          : "bg-primaryColor border-primaryColor hover:text-primaryColor"
      }`}
    >
      {children} {arrow && <i className="icofont-long-arrow-right"></i>}
    </button>
  ) : (
    path ? (
      <Link
        className={`text-size-15 text-whiteColor  px-25px py-10px border  hover:bg-whiteColor inline-block rounded dark:hover:bg-whiteColor-dark dark:hover:text-whiteColor ${
          color === "secondary"
            ? "bg-secondaryColor border-secondaryColor hover:text-secondaryColor"
            : "bg-primaryColor border-primaryColor hover:text-primaryColor"
        }`}
        href={path}
      >
        {children} {arrow && <i className="icofont-long-arrow-right"></i>}
      </Link>
    ) : (
      <button
        onClick={onClick ? onClick : () => {}}
        className={`text-size-15 text-whiteColor  px-25px py-10px border  hover:bg-whiteColor inline-block rounded dark:hover:bg-whiteColor-dark dark:hover:text-whiteColor ${
          color === "secondary"
            ? "bg-secondaryColor border-secondaryColor hover:text-secondaryColor"
            : "bg-primaryColor border-primaryColor hover:text-primaryColor"
        }`}
      >
        {children} {arrow && <i className="icofont-long-arrow-right"></i>}
      </button>
    )
  );
};

export default ButtonPrimary;
