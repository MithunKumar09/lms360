"use client";

import React, { useState } from "react";

/**
 * PDF Viewer Component
 * 
 * Simple PDF viewer using iframe/object tags that works with blob URLs
 * and doesn't require PDF.js or external scripts (CSP compatible)
 */
const PDFViewer = ({ fileUrl, url, title = "PDF Preview" }) => {
  // Support both 'fileUrl' and 'url' props for compatibility
  const pdfUrl = fileUrl || url;
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  // Use the URL directly - browsers support blob, data, and http URLs in object/iframe
  const finalPdfUrl = pdfUrl;

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
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
            className="mx-auto text-red-500 mb-4"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <p className="text-gray-700 dark:text-gray-300 font-semibold mb-2">{title}</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Unable to display PDF. Please download to view.
          </p>
          <a
            href={finalPdfUrl || pdfUrl}
            download={title}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primaryColor text-white rounded-lg hover:bg-primaryColor/90 transition-colors shadow-md hover:shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download PDF
          </a>
        </div>
      </div>
    );
  }

  if (!finalPdfUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No PDF URL provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primaryColor mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading PDF...</p>
          </div>
        </div>
      )}

      {/* PDF Container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Try object tag first (better for blob URLs) */}
        <object
          data={finalPdfUrl}
          type="application/pdf"
          className="w-full h-full"
          onLoad={handleLoad}
          onError={handleError}
        >
          {/* Fallback to iframe if object fails */}
          <iframe
            src={finalPdfUrl}
            className="w-full h-full border-0"
            title={title}
            onLoad={handleLoad}
            onError={handleError}
            sandbox="allow-same-origin allow-scripts"
          >
            {/* Final fallback - download link */}
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
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
                  className="mx-auto text-gray-400 mb-4"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <p className="text-gray-700 dark:text-gray-300 font-semibold mb-2">{title}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  Your browser doesn&apos;t support PDF preview. Please download to view.
                </p>
                <a
                  href={finalPdfUrl || pdfUrl}
                  download={title}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primaryColor text-white rounded-lg hover:bg-primaryColor/90 transition-colors shadow-md hover:shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download PDF
                </a>
              </div>
            </div>
          </iframe>
        </object>
      </div>

      {/* Footer with download button */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate flex-1 mr-3">
          {title}
        </span>
        <a
          href={finalPdfUrl || pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-primaryColor hover:text-primaryColor/80 bg-primaryColor/10 hover:bg-primaryColor/20 rounded-md transition-colors"
          download={title}
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
  );
};

export default PDFViewer;
