/**
 * Video Modal Component
 * 
 * Modal for playing course intro video.
 * Supports YouTube, Vimeo, and direct video URLs.
 */

'use client';

import { useEffect, useRef } from 'react';

const VideoModal = ({ videoUrl, isOpen, onClose }) => {
  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !videoUrl) return null;

  // Determine video type and extract ID
  const getVideoEmbedUrl = (url) => {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const youtubeRegex =
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(youtubeRegex);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
      }
    }

    // Vimeo
    if (url.includes('vimeo.com')) {
      const vimeoRegex = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
      const match = url.match(vimeoRegex);
      if (match && match[1]) {
        return `https://player.vimeo.com/video/${match[1]}?autoplay=1`;
      }
    }

    // Direct video URL
    if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
      return url;
    }

    return null;
  };

  const embedUrl = getVideoEmbedUrl(videoUrl);
  const isDirectVideo = videoUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75 transition-all duration-300"
      style={{
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-modal-title"
    >
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 cursor-pointer"
        onClick={onClose}
        aria-label="Close video modal"
      />

      {/* Video Container */}
      <div className="relative z-10 w-full max-w-4xl mx-4 animate-fade-in">
        <h2 id="video-modal-title" className="sr-only">Course Intro Video</h2>
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
          {embedUrl ? (
            isDirectVideo ? (
              <video
                src={embedUrl}
                controls
                autoPlay
                className="w-full h-full"
                onEnded={onClose}
              />
            ) : (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Course intro video"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <p>Unable to load video. Invalid URL format.</p>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
          aria-label="Close video"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default VideoModal;

