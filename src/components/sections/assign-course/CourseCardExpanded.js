/**
 * Course Card Expanded Component
 * 
 * Expanded view content for course card.
 * Shows video/image on left, details on right.
 */

'use client';

import { memo } from 'react';
import Image from 'next/image';

const CourseCardExpanded = ({
  course,
  title,
  description,
  truncatedDescription,
  introVideo,
  coverImage,
  onPlayVideo,
  onAssign,
}) => {
  // Determine what to display (video, image, or placeholder)
  const hasVideo = !!introVideo;
  const hasImage = !!coverImage;
  const displayPlaceholder = !hasVideo && !hasImage;

  // Placeholder image (SVG data URI)
  const placeholderImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3Crect fill='%23e5e7eb' width='400' height='225'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='24' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ENo Media Available%3C/text%3E%3C/svg%3E";

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Video/Image Container (16:9 or 7:3 aspect ratio) */}
        <div className="lg:col-span-1">
          <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            {hasVideo ? (
              <div className="relative w-full h-full">
                {/* Video Thumbnail or Cover */}
                {coverImage ? (
                  <Image
                    src={coverImage}
                    alt={title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect fill='%23e5e7eb' width='400' height='225'/%3E%3C/svg%3E"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <svg
                      className="w-16 h-16 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                )}
                {/* Play Button Overlay */}
                <button
                  onClick={onPlayVideo}
                  className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-50 transition-opacity group"
                  aria-label="Play intro video"
                >
                  <div className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg
                      className="w-8 h-8 text-primaryColor ml-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
              </div>
            ) : hasImage ? (
              <Image
                src={coverImage}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
                loading="lazy"
                placeholder="blur"
                blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect fill='%23e5e7eb' width='400' height='225'/%3E%3C/svg%3E"
              />
            ) : (
              <Image
                src={placeholderImage}
                alt="No media available"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            )}
          </div>
        </div>

        {/* Right Side: Course Details */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark mb-3">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
              {truncatedDescription}
            </p>
          </div>
          <div className="mt-auto">
            <button
              onClick={onAssign}
              className="px-6 py-2 bg-primaryColor text-whiteColor rounded hover:bg-primaryColor/90 transition-all duration-200 font-medium transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2"
              aria-label={`Assign course: ${title}`}
            >
              Assign Course
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(CourseCardExpanded);

