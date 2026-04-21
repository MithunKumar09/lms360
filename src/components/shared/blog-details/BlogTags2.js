import Link from "next/link";
import React from "react";

const BlogTags2 = ({ tags = [] }) => {
  // If no tags provided, show default tags (for backward compatibility)
  const displayTags = tags.length > 0 ? tags : [];

  if (displayTags.length === 0) {
    return null;
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-10px">
        <li>
          <p className="text-lg md:text-size-22 leading-7 md:leading-30px text-blackColor dark:text-blackColor-dark font-bold">
            Tag
          </p>
        </li>
        {displayTags.map((tag, index) => (
          <li key={index}>
            <Link
              href={`/blogs?tag=${encodeURIComponent(tag)}`}
              className="px-2 py-5px md:px-3 md:py-9px text-contentColor text-size-11 md:text-xs font-medium uppercase border border-borderColor2 hover:text-whiteColor hover:bg-primaryColor hover:border-primaryColor dark:text-contentColor-dark dark:border-borderColor2-dark dark:hover:text-whiteColor dark:hover:bg-primaryColor dark:hover:border-primaryColor rounded"
            >
              {tag}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BlogTags2;
