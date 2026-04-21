"use client";
import Image from "next/image";
import Link from "next/link";
import React, { memo } from "react";

const CategoryCard = memo(({ category }) => {
  const { id, name, thumbnailUrl, description } = category || {};
  
  // Fallback placeholder image (square SVG)
  const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23e5e7eb' width='400' height='400'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='24' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ECategory%3C/text%3E%3C/svg%3E";
  
  const imageUrl = thumbnailUrl || placeholderImage;
  
  // Navigate to course-list page filtered by this category
  const categoryUrl = `/course-list?category=${encodeURIComponent(name || '')}`;

  return (
    <Link
      href={categoryUrl}
      className="group block w-full"
    >
      <div className="relative aspect-square w-full rounded-lg bg-whiteColor shadow-brand dark:bg-darkdeep3-dark dark:shadow-brand-dark transition-all duration-300 hover:shadow-xl overflow-hidden">
        {/* Category Image Container - with padding to allow zoom */}
        <div className="relative w-full h-full p-2">
          <div className="relative w-full h-full overflow-hidden rounded-md">
            <Image
              src={imageUrl}
              alt={name || "Category"}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL={placeholderImage}
            />
          </div>
          
          {/* Overlay gradient for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
        
        {/* Category Name */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
          <h3 className="text-lg font-bold text-whiteColor capitalize line-clamp-2 group-hover:text-primaryColor transition-colors duration-300">
            {name || "Category"}
          </h3>
          {description && (
            <p className="text-sm text-whiteColor/80 mt-1 line-clamp-2 hidden group-hover:block">
              {description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
});

CategoryCard.displayName = 'CategoryCard';

export default CategoryCard;

