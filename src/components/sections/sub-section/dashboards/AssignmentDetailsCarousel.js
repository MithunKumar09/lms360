"use client";

import React, { useState } from "react";
import Image from "next/image";

const AssignmentDetailsCarousel = ({ files = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (files.length === 0) {
    return (
      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-borderColor dark:border-borderColor-dark" style={{ aspectRatio: "16/9" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto text-gray-400 mb-2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No files available</p>
          </div>
        </div>
      </div>
    );
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? files.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === files.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index) => {
    setCurrentIndex(index);
  };

  const isImage = (fileType) => {
    return fileType?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(fileType?.toLowerCase());
  };

  const isPDF = (fileType) => {
    return fileType === "application/pdf" || fileType?.toLowerCase() === "pdf";
  };

  const isVideo = (fileType) => {
    return fileType?.startsWith("video/") || ["mp4", "webm", "ogg", "mov"].includes(fileType?.toLowerCase());
  };

  const isYouTubeLink = (url) => {
    return url?.includes("youtube.com") || url?.includes("youtu.be");
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const currentFile = files[currentIndex];

  return (
    <div className="w-full">
      {/* Main Carousel - 16:9 Aspect Ratio */}
      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-borderColor dark:border-borderColor-dark overflow-hidden mb-4" style={{ aspectRatio: "16/9" }}>
        {/* Navigation Arrows - Only show if more than 1 file */}
        {files.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full transition-all shadow-lg"
              aria-label="Previous"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full transition-all shadow-lg"
              aria-label="Next"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </>
        )}

        {/* File Counter */}
        {files.length > 1 && (
          <div className="absolute top-3 left-3 z-10 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
            {currentIndex + 1} / {files.length}
          </div>
        )}

        {/* File Display */}
        <div className="w-full h-full flex items-center justify-center p-4">
          {isYouTubeLink(currentFile?.fileUrl) ? (
            <div className="w-full h-full">
              <iframe
                src={getYouTubeEmbedUrl(currentFile.fileUrl)}
                className="w-full h-full border-0 rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={currentFile.fileName || "YouTube video"}
              />
            </div>
          ) : isVideo(currentFile?.fileType) ? (
            <div className="w-full h-full">
              <video
                src={currentFile.fileUrl}
                controls
                className="w-full h-full object-contain rounded-lg"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : isImage(currentFile?.fileType) ? (
            <div className="relative w-full h-full">
              <Image
                src={currentFile.fileUrl}
                alt={currentFile.fileName || "Assignment file"}
                fill
                className="object-contain rounded-lg"
                unoptimized
              />
            </div>
          ) : isPDF(currentFile?.fileType) ? (
            <div className="w-full h-full">
              <iframe
                src={currentFile.fileUrl}
                className="w-full h-full border-0 rounded-lg"
                title={currentFile.fileName || "PDF document"}
              />
            </div>
          ) : (
            <div className="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto text-gray-400 dark:text-gray-500 mb-3"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <p className="text-gray-600 dark:text-gray-300 mb-2 font-medium">{currentFile.fileName}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">{currentFile.fileType || "File"}</p>
              <a
                href={currentFile.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 transition-colors"
              >
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
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download File
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Strip - Only show if more than 1 file */}
      {files.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {files.map((file, index) => (
            <button
              key={file.id || index}
              onClick={() => handleThumbnailClick(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? "border-primaryColor ring-2 ring-primaryColor/50"
                  : "border-gray-300 dark:border-gray-600 hover:border-primaryColor/50"
              }`}
            >
              {isImage(file?.fileType) ? (
                <Image
                  src={file.fileUrl}
                  alt={file.fileName || `Thumbnail ${index + 1}`}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : isYouTubeLink(file?.fileUrl) || isVideo(file?.fileType) ? (
                <div className="w-full h-full bg-gray-700 dark:bg-gray-600 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-white"
                  >
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
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
                    className="text-gray-500"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentDetailsCarousel;

