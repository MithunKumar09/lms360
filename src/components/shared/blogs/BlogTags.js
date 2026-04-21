'use client';

import Link from "next/link";
import React from "react";
import { usePopularTags } from "@/hooks/api/usePopularTags";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";

const BlogTags = () => {
  const { data: tagsData, isLoading, isError, error } = usePopularTags({ limit: 10 });

  const tags = tagsData?.tags || [];

  // Helper function to create a slug-friendly category from tag
  const getCategoryFromTag = (tag) => {
    if (!tag) return 'all';
    // Convert tag to lowercase and replace spaces/special chars with hyphens
    return tag.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  if (isLoading) {
    return (
      <div
        className="p-5 md:p-30px lg:p-5 2xl:p-30px mb-30px border border-borderColor2 dark:border-borderColor2-dark"
        data-aos="fade-up"
      >
        <h4 className="text-size-22 text-blackColor dark:text-blackColor-dark font-bold pl-2 before:w-0.5 relative before:h-[21px] before:bg-primaryColor before:absolute before:bottom-[5px] before:left-0 leading-30px mb-25px">
          Popular tag
        </h4>
        <div className="flex flex-wrap gap-x-5px">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonLoader key={idx} type="button" className="w-24 h-8 m-5px" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    // On error, show empty state or fallback to static tags
    return (
      <div
        className="p-5 md:p-30px lg:p-5 2xl:p-30px mb-30px border border-borderColor2 dark:border-borderColor2-dark"
        data-aos="fade-up"
      >
        <h4 className="text-size-22 text-blackColor dark:text-blackColor-dark font-bold pl-2 before:w-0.5 relative before:h-[21px] before:bg-primaryColor before:absolute before:bottom-[5px] before:left-0 leading-30px mb-25px">
          Popular tag
        </h4>
        <p className="text-sm text-contentColor dark:text-contentColor-dark">
          Unable to load tags. Please try again later.
        </p>
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div
        className="p-5 md:p-30px lg:p-5 2xl:p-30px mb-30px border border-borderColor2 dark:border-borderColor2-dark"
        data-aos="fade-up"
      >
        <h4 className="text-size-22 text-blackColor dark:text-blackColor-dark font-bold pl-2 before:w-0.5 relative before:h-[21px] before:bg-primaryColor before:absolute before:bottom-[5px] before:left-0 leading-30px mb-25px">
          Popular tag
        </h4>
        <p className="text-sm text-contentColor dark:text-contentColor-dark">
          No tags available yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-5 md:p-30px lg:p-5 2xl:p-30px mb-30px border border-borderColor2 dark:border-borderColor2-dark"
      data-aos="fade-up"
    >
      <h4 className="text-size-22 text-blackColor dark:text-blackColor-dark font-bold pl-2 before:w-0.5 relative before:h-[21px] before:bg-primaryColor before:absolute before:bottom-[5px] before:left-0 leading-30px mb-25px">
        Popular tag
      </h4>
      <ul className="flex flex-wrap gap-x-5px">
        {tags.map((tagItem, idx) => {
          const tagName = tagItem.tag || '';
          const category = getCategoryFromTag(tagName);
          
          return (
            <li key={idx}>
              <Link
                href={`/courses?tag=${encodeURIComponent(tagName)}`}
                className="m-5px px-19px py-3px text-contentColor text-xs font-medium uppercase border border-borderColor2 hover:text-whiteColor hover:bg-primaryColor hover:border-primaryColor leading-30px dark:text-contentColor-dark dark:border-borderColor2-dark dark:hover:text-whiteColor dark:hover:bg-primaryColor dark:hover:border-primaryColor"
              >
                {tagName}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default BlogTags;
