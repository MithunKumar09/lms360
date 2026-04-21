"use client";

import React, { useState, useEffect } from "react";
import PDFViewer from "@/components/shared/pdf/PDFViewer";

const AttachmentPreviewCarousel = ({ items = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState(new Set()); // Track failed blob URLs
  const [blobUrlCache, setBlobUrlCache] = useState(new Map()); // Cache blob URLs created from data URLs

  // All hooks must be called before any conditional returns
  // Ensure currentIndex is within bounds and sync it
  useEffect(() => {
    if (items.length > 0 && currentIndex >= items.length) {
      setCurrentIndex(0);
    } else if (items.length === 0) {
      setCurrentIndex(0);
    }
  }, [items.length, currentIndex]);
  
  // Calculate safe current item with bounds checking
  const safeCurrentIndex = items.length > 0 ? Math.max(0, Math.min(currentIndex, items.length - 1)) : 0;
  const currentItem = items.length > 0 && items[safeCurrentIndex] ? items[safeCurrentIndex] : null;
  
  // Convert data URL to blob URL for PDF rendering (browsers block data URLs in iframes)
  const dataUrlToBlobUrl = (dataUrl) => {
    if (!dataUrl || !dataUrl.startsWith('data:')) return null;
    
    // Check cache first
    if (blobUrlCache.has(dataUrl)) {
      return blobUrlCache.get(dataUrl);
    }
    
    try {
      // Convert data URL to blob
      const byteString = atob(dataUrl.split(',')[1]);
      const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const blobUrl = URL.createObjectURL(blob);
      
      // Cache it
      setBlobUrlCache(prev => new Map(prev).set(dataUrl, blobUrl));
      return blobUrl;
    } catch (e) {
      console.error('[AttachmentPreviewCarousel] Error converting data URL to blob:', e);
      return null;
    }
  };
  
  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlCache.forEach(blobUrl => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch (e) {
          // Ignore errors
        }
      });
    };
  }, [blobUrlCache]);
  
  // Get the best URL for the current item (prioritize data URL, avoid blob URLs for images due to CSP)
  const getBestUrl = (item) => {
    if (!item) return null;
    
    // Check if it's an image
    const isImage = item.fileType?.startsWith('image/') || 
                   /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(item.fileUrl || '') ||
                   item.fileType === 'image';
    
    // Check if it's a PDF
    const isPDF = item.fileType === 'application/pdf' || 
                  /\.pdf$/i.test(item.fileUrl || '') ||
                  item.fileType === 'pdf';
    
    // For images, always prefer data URL to avoid CSP blob: restrictions
    if (isImage) {
      // If blob URL failed before (CSP blocked), use data URL
      // Priority: R2 HTTPS URL > data URL > blob URL (temporary)
      // R2 URLs are permanent and CSP-compatible, so use them first
      if (item.fileUrl && item.fileUrl.startsWith('https://')) {
        return item.fileUrl;
      }
      
      // If current URL failed, try alternatives
      if (item.fileUrl && failedUrls.has(item.fileUrl) && item.fileDataUrl) {
        return item.fileDataUrl;
      }
      
      // Use data URL if available (persists across reloads)
      if (item.fileDataUrl && item.fileDataUrl.trim() !== '') {
        return item.fileDataUrl;
      }
      
      // Blob URL as last resort (temporary, may expire)
      // Error handler will catch failures and try R2 URL if available
      return item.fileUrl || null;
    }
    
    // For PDFs, prioritize R2 HTTPS URL (CSP-compatible, permanent)
    if (isPDF) {
      // Priority: R2 HTTPS URL > data URL > blob URL
      if (item.fileUrl && item.fileUrl.startsWith('https://')) {
        return item.fileUrl; // R2 URL works directly in iframe/object
      }
      
      // If blob URL failed before, try data URL
      if (item.fileUrl && failedUrls.has(item.fileUrl) && item.fileDataUrl) {
        // Convert data URL to blob URL for iframe compatibility
        if (item.fileDataUrl.startsWith('data:')) {
          const blobUrl = dataUrlToBlobUrl(item.fileDataUrl);
          if (blobUrl) return blobUrl;
        }
        return item.fileDataUrl;
      }
      
      // Use data URL if available (convert to blob for iframe)
      if (item.fileDataUrl && item.fileDataUrl.trim() !== '') {
        if (item.fileDataUrl.startsWith('data:')) {
          const blobUrl = dataUrlToBlobUrl(item.fileDataUrl);
          if (blobUrl) return blobUrl;
        }
        return item.fileDataUrl;
      }
      
      // Fallback to fileUrl (blob URL or other)
      return item.fileUrl || null;
    }
    
    // For other non-images, use normal priority
    // If blob URL failed before, use data URL
    if (item.fileUrl && failedUrls.has(item.fileUrl) && item.fileDataUrl) {
      return item.fileDataUrl;
    }
    
    // Priority: R2 HTTPS URL > data URL > fileUrl
    if (item.fileUrl && item.fileUrl.startsWith('https://')) {
      return item.fileUrl;
    }
    
    if (item.fileDataUrl && item.fileDataUrl.trim() !== '') {
      return item.fileDataUrl;
    }
    
    return item.fileUrl || null;
  };
  
  const currentUrl = getBestUrl(currentItem);

  // Debug: Log current item details
  useEffect(() => {
    if (currentItem) {
      console.log('[AttachmentPreviewCarousel] Current item:', {
        index: currentIndex,
        title: currentItem.title,
        fileUrl: currentItem.fileUrl ? currentItem.fileUrl.substring(0, 50) + '...' : 'NO URL',
        fileDataUrl: currentItem.fileDataUrl ? 'data URL present' : 'no data URL',
        currentUrl: currentUrl ? currentUrl.substring(0, 50) + '...' : 'NO URL',
        fileType: currentItem.fileType,
        urlType: currentUrl?.startsWith('blob:') ? 'blob' : 
                 currentUrl?.startsWith('data:') ? 'data' : 
                 currentUrl?.startsWith('http') ? 'http' : 'unknown'
      });
    }
  }, [currentIndex, currentItem, currentUrl]);

  // Helper functions
  const getFileExtension = (fileUrl, fileType) => {
    if (fileUrl) {
      const urlParts = fileUrl.split('.');
      if (urlParts.length > 1) {
        return urlParts[urlParts.length - 1].toLowerCase().split('?')[0]; // Remove query params
      }
    }
    if (fileType) {
      const parts = fileType.split('/');
      if (parts.length > 1) {
        return parts[1].toLowerCase();
      }
      return fileType.toLowerCase();
    }
    return '';
  };

  const isImage = (fileType, fileUrl) => {
    const ext = getFileExtension(fileUrl, fileType);
    return fileType?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext);
  };

  const isVideo = (fileType, fileUrl) => {
    const ext = getFileExtension(fileUrl, fileType);
    return fileType?.startsWith("video/") || ["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(ext);
  };

  const isPDF = (fileType, fileUrl) => {
    const ext = getFileExtension(fileUrl, fileType);
    return fileType === "application/pdf" || ext === "pdf";
  };

  const isWordDocument = (fileType, fileUrl) => {
    const ext = getFileExtension(fileUrl, fileType);
    return fileType === "application/msword" || 
           fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
           ext === "doc" || ext === "docx" ||
           fileType === "doc" || fileType === "docx";
  };

  const isYouTubeLink = (url) => {
    return url && (url.includes("youtube.com") || url.includes("youtu.be"));
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  // Event handlers
  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index) => {
    setCurrentIndex(index);
  };

  // Early return AFTER all hooks
  if (items.length === 0 || !currentItem) {
    return (
      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-borderColor dark:border-borderColor-dark" style={{ aspectRatio: "16/9" }}>
        <div className="absolute inset-0 flex items-center justify-center">
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No files uploaded yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Upload files to see preview here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Main Carousel - 16:9 Aspect Ratio */}
      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-borderColor dark:border-borderColor-dark overflow-hidden mb-4" style={{ aspectRatio: "16/9" }}>
        {/* Navigation Arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2.5 rounded-full transition-all shadow-lg backdrop-blur-sm"
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
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2.5 rounded-full transition-all shadow-lg backdrop-blur-sm"
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

        {/* Item Counter */}
        {items.length > 1 && (
          <div className="absolute top-3 left-3 z-10 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm">
            {currentIndex + 1} / {items.length}
          </div>
        )}

        {/* File Type Badge */}
        {currentItem?.fileType && (
          <div className="absolute top-3 right-3 z-10 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm">
            {(() => {
              if (!currentItem) return "FILE";
              if (isYouTubeLink(currentItem.fileUrl)) return "YOUTUBE";
              if (isPDF(currentItem.fileType, currentItem.fileUrl)) return "PDF";
              if (isWordDocument(currentItem.fileType, currentItem.fileUrl)) return "WORD";
              if (isImage(currentItem.fileType, currentItem.fileUrl)) return "IMAGE";
              if (isVideo(currentItem.fileType, currentItem.fileUrl)) return "VIDEO";
              const ext = getFileExtension(currentItem.fileUrl, currentItem.fileType);
              return ext ? ext.toUpperCase() : (currentItem.fileType?.split('/')[1]?.toUpperCase() || currentItem.fileType?.toUpperCase() || "FILE");
            })()}
          </div>
        )}

        {/* Content Display */}
        <div className="w-full h-full flex items-center justify-center p-4" style={{ minHeight: '400px' }}>
          {isYouTubeLink(currentUrl || currentItem?.fileUrl) ? (
            <div className="w-full h-full">
              <iframe
                src={getYouTubeEmbedUrl(currentUrl || currentItem.fileUrl)}
                className="w-full h-full border-0 rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={currentItem.title || "YouTube video"}
              />
            </div>
          ) : isVideo(currentItem?.fileType, currentUrl) ? (
            <div className="w-full h-full">
              <video
                src={currentUrl}
                controls
                className="w-full h-full object-contain rounded-lg"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : isPDF(currentItem?.fileType, currentUrl) ? (
            <div className="w-full h-full">
              {currentUrl && currentUrl.trim() !== '' && !currentUrl.startsWith('placeholder://') ? (
                <PDFViewer url={currentUrl} title={currentItem.title || "PDF Preview"} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <div className="text-center p-4">
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
                      className="mx-auto text-gray-400 dark:text-gray-500 mb-2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
                      {currentItem.uploading ? 'Uploading PDF...' : 'PDF file not available yet'}
                    </p>
                    {currentItem.title && (
                      <p className="text-gray-400 dark:text-gray-500 text-xs">{currentItem.title}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : isWordDocument(currentItem?.fileType, currentItem?.fileUrl) ? (
            <div className="w-full h-full flex flex-col bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
              <div className="flex-1 w-full h-full min-h-0 relative">
                {currentUrl && currentUrl.trim() !== '' && !currentUrl.startsWith('placeholder://') ? (
                  <>
                    {/* Word Document Viewer Container */}
                    <div className="absolute inset-0 w-full h-full">
                      {currentUrl.startsWith('blob:') || currentUrl.startsWith('data:') ? (
                        // For blob URLs or data URLs, use Office Online viewer or download option
                        <>
                          <div className="w-full h-full flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg">
                            <div className="text-center p-8 max-w-md">
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
                                className="mx-auto text-blue-600 dark:text-blue-400 mb-4"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                              </svg>
                              <p className="text-gray-700 dark:text-gray-300 font-semibold mb-2">{currentItem.title}</p>
                              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                                Word documents cannot be previewed directly in the browser. Please download to view.
                              </p>
                              <a
                                href={currentUrl}
                                download={currentItem.title}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primaryColor text-white rounded-lg hover:bg-primaryColor/90 transition-colors shadow-md hover:shadow-lg"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="7 10 12 15 17 10"></polyline>
                                  <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Download Word Document
                              </a>
                            </div>
                          </div>
                        </>
                      ) : (
                        // For regular URLs, try Office Online viewer
                        <iframe
                          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(currentUrl)}`}
                          className="w-full h-full border-0 rounded-lg bg-white"
                          title={currentItem.title || "Word Document Preview"}
                          style={{ minHeight: '500px' }}
                          onError={(e) => {
                            console.error('[AttachmentPreviewCarousel] Word document load error:', {
                              url: currentUrl?.substring(0, 50),
                              title: currentItem.title
                            });
                            const fallback = e.target.parentElement?.querySelector('.word-fallback');
                            if (fallback) {
                              fallback.style.display = 'flex';
                              e.target.style.display = 'none';
                            }
                          }}
                        />
                      )}
                      {/* Fallback UI (hidden by default, shown on error) */}
                      <div className="absolute inset-0 hidden word-fallback items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <div className="text-center p-8 max-w-md">
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
                            className="mx-auto text-blue-600 dark:text-blue-400 mb-4"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                          </svg>
                          <p className="text-gray-700 dark:text-gray-300 font-semibold mb-2">{currentItem.title}</p>
                          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Word document preview not available. Please download to view.</p>
                          <a
                            href={currentUrl}
                            download={currentItem.title}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primaryColor text-white rounded-lg hover:bg-primaryColor/90 transition-colors shadow-md hover:shadow-lg"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download Word Document
                          </a>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div className="text-center p-4">
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
                        className="mx-auto text-gray-400 dark:text-gray-500 mb-2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
                        {currentItem.uploading ? 'Uploading Word document...' : 'Word document not available yet'}
                      </p>
                      {currentItem.title && (
                        <p className="text-gray-400 dark:text-gray-500 text-xs">{currentItem.title}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* Word Document Info Bar */}
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate flex-1 mr-3">
                  {currentItem.title}
                </span>
                <a
                  href={currentUrl || currentItem.fileUrl}
                  target={currentUrl && !currentUrl.startsWith('blob:') && !currentUrl.startsWith('data:') ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-primaryColor hover:text-primaryColor/80 bg-primaryColor/10 hover:bg-primaryColor/20 rounded-md transition-colors"
                  download={currentItem.title}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download
                </a>
              </div>
            </div>
          ) : isImage(currentItem?.fileType, currentItem?.fileUrl) ? (
            <div className="relative w-full h-full group">
              {currentUrl && currentUrl.trim() !== '' && !currentUrl.startsWith('placeholder://') ? (
                <>
                  {/* Use regular img tag for all URLs (blob, data, and HTTP/R2 URLs) */}
                  <img
                    key={currentUrl} // Force re-render when URL changes
                    src={currentUrl}
                    alt={currentItem.title || "Preview"}
                    className="absolute inset-0 w-full h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
                    style={{ display: 'block' }}
                    crossOrigin={currentUrl?.startsWith('http') ? 'anonymous' : undefined}
                    onLoad={(e) => {
                      console.log('[AttachmentPreviewCarousel] Image loaded successfully:', {
                        url: currentUrl?.substring(0, 50),
                        title: currentItem.title,
                        urlType: currentUrl?.startsWith('blob:') ? 'blob' : 
                                 currentUrl?.startsWith('data:') ? 'data' : 
                                 currentUrl?.startsWith('http') ? 'http/r2' : 'unknown',
                        naturalWidth: e.target.naturalWidth,
                        naturalHeight: e.target.naturalHeight
                      });
                      // Hide fallback if image loads
                      const fallback = e.target.parentElement?.querySelector('.image-fallback');
                      if (fallback) {
                        fallback.style.display = 'none';
                      }
                      // Ensure image is visible
                      e.target.style.display = 'block';
                    }}
                    onError={(e) => {
                      const failedUrl = currentUrl || currentItem.fileUrl;
                      const isBlobUrl = failedUrl?.startsWith('blob:');
                      
                      // Blob URLs are temporary and may expire - this is expected, don't log as error
                      // Only log errors for permanent URLs (HTTPS/R2 URLs)
                      if (!isBlobUrl) {
                        console.error('[AttachmentPreviewCarousel] Image load error:', {
                          url: failedUrl?.substring(0, 50),
                          title: currentItem.title,
                          fileType: currentItem.fileType,
                          urlType: failedUrl?.startsWith('data:') ? 'data' : 
                                   failedUrl?.startsWith('http') ? 'http/r2' : 'unknown',
                          hasDataUrl: !!currentItem.fileDataUrl,
                        });
                      }
                      
                      // If blob URL failed (expired or revoked), try R2 URL if available, otherwise data URL
                      if (isBlobUrl && !failedUrls.has(failedUrl)) {
                        setFailedUrls(prev => new Set([...prev, failedUrl]));
                        
                        // Priority: R2 HTTPS URL > data URL > show fallback
                        if (currentItem.fileUrl && currentItem.fileUrl.startsWith('https://')) {
                          // Use R2 URL (should be available after upload completes)
                          e.target.src = currentItem.fileUrl;
                        } else if (currentItem.fileDataUrl) {
                          // Fallback to data URL
                          e.target.src = currentItem.fileDataUrl;
                        } else {
                          // No alternative URL - show fallback UI
                          e.target.style.display = 'none';
                        }
                        return;
                      }
                      
                      // If we have a data URL but weren't using it, try it now
                      if (currentItem.fileDataUrl && currentUrl !== currentItem.fileDataUrl && !failedUrls.has(currentUrl || '')) {
                        console.log('[AttachmentPreviewCarousel] Trying data URL as fallback');
                        setFailedUrls(prev => new Set([...prev, currentUrl || '']));
                        e.target.src = currentItem.fileDataUrl;
                        return;
                      }
                      
                      // Otherwise, show fallback UI
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement?.querySelector('.image-fallback');
                      if (fallback) {
                        fallback.style.display = 'flex';
                      }
                    }}
                  />
                  {/* Fallback for broken images - initially hidden */}
                  <div className="absolute inset-0 hidden image-fallback items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg z-10">
                    <div className="text-center p-4">
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
                        className="mx-auto text-gray-400 dark:text-gray-500 mb-2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Image not available</p>
                    </div>
                  </div>
                  {/* Info overlay on hover */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <p className="text-white text-sm font-medium truncate">{currentItem.title}</p>
                    {currentItem.description && (
                      <p className="text-white/80 text-xs mt-1 line-clamp-2">{currentItem.description}</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <div className="text-center p-4">
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
                      className="mx-auto text-gray-400 dark:text-gray-500 mb-2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
                        {currentItem.uploading ? 'Uploading image...' : 'Image file not available yet'}
                      </p>
                      {currentItem.title && (
                        <p className="text-gray-400 dark:text-gray-500 text-xs">{currentItem.title}</p>
                      )}
                    </div>
                  </div>
              )}
            </div>
          ) : (
            <div className="text-center max-w-md px-4">
              <div className="mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="80"
                  height="80"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto text-gray-400 dark:text-gray-500"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              {currentItem && (
                <>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg mb-2">{currentItem.title || 'Untitled File'}</p>
                  {currentItem.description && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 max-w-sm mx-auto">{currentItem.description}</p>
                  )}
                  {(currentUrl || currentItem.fileUrl) && (
                    <a
                      href={currentUrl || currentItem.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-primaryColor text-white rounded-lg hover:bg-primaryColor/90 transition-all shadow-md hover:shadow-lg"
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
                      Download File
                    </a>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Strip */}
      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {items.map((item, index) => (
            <button
              key={item.id || index}
              onClick={() => handleThumbnailClick(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? "border-primaryColor ring-2 ring-primaryColor/50"
                  : "border-gray-300 dark:border-gray-600 hover:border-primaryColor/50"
              }`}
            >
              {isImage(item?.fileType, item?.fileUrl) ? (
                // Use regular img tag for all URLs (works better with R2 URLs)
                <img
                  src={item.fileUrl}
                  alt={item.title || `Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  crossOrigin={item.fileUrl?.startsWith('http') ? 'anonymous' : undefined}
                  onError={(e) => {
                    // Hide broken images in thumbnails
                    e.target.style.display = 'none';
                  }}
                />
              ) : isPDF(item?.fileType, item?.fileUrl) ? (
                <div className="w-full h-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
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
                    className="text-red-600 dark:text-red-400"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
              ) : isWordDocument(item?.fileType, item?.fileUrl) ? (
                <div className="w-full h-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
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
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
              ) : isYouTubeLink(item?.fileUrl) || isVideo(item?.fileType, item?.fileUrl) ? (
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

export default AttachmentPreviewCarousel;

