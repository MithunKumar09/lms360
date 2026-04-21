"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

const SubmissionCarousel = ({ files = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (files.length > 0 && currentIndex >= files.length) {
      setCurrentIndex(0);
    }
  }, [files.length, currentIndex]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? files.length - 1 : prev - 1));
    setIsZoomed(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === files.length - 1 ? 0 : prev + 1));
    setIsZoomed(false);
  };

  const handleThumbnailClick = (index) => {
    setCurrentIndex(index);
    setIsZoomed(false);
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = (file) => {
    window.open(file.fileUrl, "_blank");
  };

  const isImage = (fileType) => {
    return fileType?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(fileType?.toLowerCase());
  };

  const isPDF = (fileType) => {
    return fileType === "application/pdf" || fileType?.toLowerCase() === "pdf";
  };

  const isYouTube = (fileType, fileUrl) => {
    if (fileType === "youtube" || fileType === "youtube") {
      return true;
    }
    if (fileUrl) {
      return /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i.test(fileUrl);
    }
    return false;
  };

  const isLink = (fileType) => {
    return fileType === "link" || fileType === "link";
  };

  // Extract YouTube video ID and convert to embed URL
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    
    // Check if already an embed URL
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    // Extract video ID from various YouTube URL formats
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(youtubeRegex);
    
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1&playsinline=1`;
    }
    
    return null;
  };

  if (files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md border-2 border-borderColor dark:border-borderColor-dark">
        <p className="text-gray-500">No files submitted</p>
      </div>
    );
  }

  const currentFile = files[currentIndex];

  return (
    <>
      <div className="h-full flex flex-col bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
        {/* Main Viewer - 16:9 Aspect Ratio */}
        <div className="relative flex-1 bg-gray-100 dark:bg-gray-800 overflow-hidden" style={{ aspectRatio: "16/9" }}>
          {/* Navigation Arrows */}
          {files.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                aria-label="Previous"
              >
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
                >
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                aria-label="Next"
              >
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
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </>
          )}

          {/* File Counter */}
          {files.length > 1 && (
            <div className="absolute top-2 left-2 z-10 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} / {files.length}
            </div>
          )}

          {/* Controls */}
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <button
              onClick={toggleZoom}
              className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
              title={isZoomed ? "Zoom Out" : "Zoom In"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isZoomed ? (
                  <>
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  </>
                ) : (
                  <>
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  </>
                )}
              </svg>
            </button>
            <button
              onClick={toggleFullscreen}
              className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
              title="Fullscreen"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
              </svg>
            </button>
            <button
              onClick={() => handleDownload(currentFile)}
              className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
              title="Download"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
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
            </button>
          </div>

          {/* File Display */}
          <div className="w-full h-full flex items-center justify-center p-4">
            {isImage(currentFile?.fileType) ? (
              <div className={`relative w-full h-full ${isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`} onClick={toggleZoom}>
                <Image
                  src={currentFile.fileUrl}
                  alt={currentFile.fileName}
                  fill
                  className={`object-contain transition-transform duration-300 ${isZoomed ? "scale-150" : "scale-100"}`}
                  unoptimized
                />
              </div>
            ) : isPDF(currentFile?.fileType) ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <iframe
                  src={currentFile.fileUrl}
                  className="w-full h-full border-0"
                  title={currentFile.fileName}
                />
              </div>
            ) : isYouTube(currentFile?.fileType, currentFile?.fileUrl) ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                {(() => {
                  const embedUrl = getYouTubeEmbedUrl(currentFile.fileUrl);
                  if (embedUrl) {
                    return (
                      <iframe
                        src={embedUrl}
                        className="w-full h-full border-0 rounded-md"
                        title={currentFile.fileName || "YouTube Video"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }
                  return (
                    <div className="text-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="mx-auto text-red-600 mb-4"
                      >
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      <p className="text-gray-500 mb-2">{currentFile.fileName || "YouTube Video"}</p>
                      <a
                        href={currentFile.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 inline-block"
                      >
                        Watch on YouTube
                      </a>
                    </div>
                  );
                })()}
              </div>
            ) : isLink(currentFile?.fileType) ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 max-w-2xl w-full">
                  <div className="flex items-start gap-4 mb-4">
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
                      className="text-blue-600 dark:text-blue-400 flex-shrink-0"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {currentFile.fileName || "External Link"}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 break-all mb-4">
                        {currentFile.fileUrl}
                      </p>
                      <a
                        href={currentFile.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 transition-colors font-medium"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        Open Link
                      </a>
                    </div>
                  </div>
                </div>
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
                  className="mx-auto text-gray-400 mb-4"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <p className="text-gray-500 mb-2">{currentFile.fileName}</p>
                <button
                  onClick={() => handleDownload(currentFile)}
                  className="px-4 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90"
                >
                  Download File
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail Strip */}
        {files.length > 1 && (
          <div className="p-2 border-t border-borderColor dark:border-borderColor-dark bg-gray-50 dark:bg-gray-900">
            <div className="flex gap-2 overflow-x-auto">
              {files.map((file, index) => (
                <button
                  key={file.id}
                  onClick={() => handleThumbnailClick(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? "border-primaryColor ring-2 ring-primaryColor/50"
                      : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                  }`}
                >
                  {isImage(file?.fileType) ? (
                    <Image
                      src={file.fileUrl}
                      alt={file.fileName}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : isYouTube(file?.fileType, file?.fileUrl) ? (
                    <div className="w-full h-full bg-red-600 dark:bg-red-700 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="white"
                      >
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                  ) : isLink(file?.fileType) ? (
                    <div className="w-full h-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue-600 dark:text-blue-400"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                      </svg>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
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
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={toggleFullscreen}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full p-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 text-3xl"
            >
              ×
            </button>
            {isImage(currentFile?.fileType) ? (
              <div className="w-full h-full flex items-center justify-center">
                <Image
                  src={currentFile.fileUrl}
                  alt={currentFile.fileName}
                  width={1200}
                  height={800}
                  className="max-w-full max-h-full object-contain"
                  unoptimized
                />
              </div>
            ) : isPDF(currentFile?.fileType) ? (
              <iframe
                src={currentFile.fileUrl}
                className="w-full h-full border-0"
                title={currentFile.fileName}
              />
            ) : isYouTube(currentFile?.fileType, currentFile?.fileUrl) ? (
              (() => {
                const embedUrl = getYouTubeEmbedUrl(currentFile.fileUrl);
                return embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full border-0"
                    title={currentFile.fileName || "YouTube Video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : null;
              })()
            ) : isLink(currentFile?.fileType) ? (
              <div className="w-full h-full flex items-center justify-center p-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 max-w-2xl w-full">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {currentFile.fileName || "External Link"}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 break-all mb-4">
                    {currentFile.fileUrl}
                  </p>
                  <a
                    href={currentFile.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 transition-colors font-medium"
                  >
                    Open Link
                  </a>
                </div>
              </div>
            ) : null}
            {files.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SubmissionCarousel;

